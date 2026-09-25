import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Company } from '../models/Company';
import { CompanySubscription } from '../models/CompanySubscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { DexpayEvent } from '../models/DexpayEvent';
import { User } from '../models/User';
import {
  isDexpayConfigured, getProductId, createCustomer, createSubscription, cancelSubscription,
  verifyWebhookSignature,
} from '../services/dexpayService';
import { renewSubscription, recordSubscriptionEvent, notifyCompanyAdmins } from '../services/subscriptionService';
import { recordAudit } from '../services/auditService';

// POST /api/v1/companies/me/subscription/dexpay/subscribe — admin uniquement. body { cycle }.
// Crée (si besoin) le client DexPay et un abonnement DexPay pour la formule courante de
// l'entreprise, et renvoie l'URL de paiement DexPay à ouvrir. IMPORTANT (guide utilisateur,
// 2026-09-25) : n'active JAMAIS l'abonnement Naatalix ici — seul le webhook confirmé fait foi
// (payé côté DexPay et "DexPay confirme que c'est payé" peuvent diverger si on active trop tôt).
export const subscribeCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!isDexpayConfigured()) {
      res.status(503).json({ code: 'DEXPAY_NOT_CONFIGURED', error: "L'intégration DexPay n'est pas configurée sur cette plateforme." });
      return;
    }

    const companyId = req.user!.companyId!;
    const company = await Company.findByPk(companyId);
    const sub = await CompanySubscription.findOne({ where: { companyId }, include: [{ model: SubscriptionPlan, as: 'plan' }] });
    if (!company || !sub) { res.status(404).json({ error: 'Abonnement introuvable.' }); return; }
    const plan = sub.get('plan') as SubscriptionPlan | undefined;
    if (!plan) { res.status(404).json({ error: 'Formule introuvable.' }); return; }
    if (plan.code === 'entreprise') {
      res.status(400).json({ error: 'La formule Entreprise (sur devis) ne se paie pas via DexPay — contactez ATAABA.' });
      return;
    }

    const cycle = req.body?.cycle === 'annuel' ? 'annuel' : 'mensuel';
    const productId = getProductId(plan.code, cycle);
    if (!productId) {
      res.status(503).json({ code: 'DEXPAY_PRODUCT_NOT_CONFIGURED', error: `Aucun produit DexPay configuré pour ${plan.code}/${cycle}.` });
      return;
    }

    let customerId = sub.dexpayCustomerId;
    if (!customerId) {
      const admin = await User.findByPk(req.user!.id);
      const customer = await createCustomer({
        name: company.nom,
        email: company.email || admin?.email || '',
        phone: company.telephone || admin?.telephone || '',
        country: 'SN',
      });
      customerId = customer.id;
      sub.dexpayCustomerId = customerId;
      await sub.save();
    }

    const subscription = await createSubscription({
      customerId,
      productId,
      metadata: { organization_id: company.id, plan: plan.code, cycle },
    });
    sub.dexpaySubscriptionId = subscription.id;
    sub.dexpayCheckoutSessionId = subscription.checkoutSessionId;
    await sub.save();

    await recordSubscriptionEvent({ companyId, type: 'dexpay_checkout_initie', toPlanId: plan.id, note: `Cycle ${cycle}, dexpay_subscription_id=${subscription.id}` });
    await recordAudit({ actorUserId: req.user!.id, actorType: 'company_user', companyId, action: 'dexpay.subscribe', objectType: 'CompanySubscription', objectId: sub.id, details: { plan: plan.code, cycle }, req });

    res.status(201).json({ checkoutUrl: subscription.checkoutUrl, dexpaySubscriptionId: subscription.id });
  } catch (error) {
    console.error('Erreur subscribeCompany (DexPay) :', error);
    res.status(502).json({ error: "Impossible d'initier l'abonnement DexPay." });
  }
};

// POST /api/v1/companies/me/subscription/dexpay/cancel — admin uniquement. Demande l'annulation
// côté DexPay ; l'abonnement Naatalix n'est suspendu que par le webhook subscription.cancelled
// (même principe de prudence que subscribeCompany : ne jamais anticiper la confirmation DexPay).
export const cancelCompanySubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    if (!sub?.dexpaySubscriptionId) {
      res.status(400).json({ error: 'Aucun abonnement DexPay actif pour cette entreprise.' });
      return;
    }

    await cancelSubscription(sub.dexpaySubscriptionId);
    await recordAudit({ actorUserId: req.user!.id, actorType: 'company_user', companyId, action: 'dexpay.cancel', objectType: 'CompanySubscription', objectId: sub.id, req });

    res.status(200).json({ message: 'Annulation demandée auprès de DexPay. Elle sera effective à la confirmation.' });
  } catch (error) {
    console.error('Erreur cancelCompanySubscription (DexPay) :', error);
    res.status(502).json({ error: "Impossible de demander l'annulation auprès de DexPay." });
  }
};

interface EventOutcome { statut: 'traite' | 'ignore' | 'anomalie'; message: string; companyId: number | null; }

// Retrouve l'abonnement concerné. Ordre déterminé par un vrai paiement réussi observé en sandbox
// (2026-09-25) : le webhook `checkout.completed` n'a NI `subscription_id` NI les metadata passées
// à la création (DexPay renvoie les siennes, ex. `merchant_id` — PAS `organization_id`/`plan`/
// `cycle`, contrairement à l'hypothèse initiale). `checkout_session_id` est donc le SEUL moyen
// fiable de corréler ce type d'événement, stocké sur CompanySubscription.dexpayCheckoutSessionId à
// la création (dexpayService.createSubscription). `subscription_id` reste tenté en premier pour
// les événements qui en portent un (renouvellements — d'après le guide, non encore vérifié en
// conditions réelles) ; metadata.organization_id reste en dernier repli, sans certitude qu'un
// événement réel le fournira un jour.
const findSubscription = async (data: any): Promise<CompanySubscription | null> => {
  const subscriptionId = data.subscription_id ? String(data.subscription_id) : null;
  if (subscriptionId) {
    const bySubId = await CompanySubscription.findOne({ where: { dexpaySubscriptionId: subscriptionId } });
    if (bySubId) return bySubId;
  }

  const checkoutSessionId = data.checkout_session_id ? String(data.checkout_session_id) : null;
  if (checkoutSessionId) {
    const byCheckoutSession = await CompanySubscription.findOne({ where: { dexpayCheckoutSessionId: checkoutSessionId } });
    if (byCheckoutSession) return byCheckoutSession;
  }

  const organizationId = data.metadata?.organization_id ?? data.organization_id;
  if (organizationId) {
    return CompanySubscription.findOne({ where: { companyId: Number(organizationId) } });
  }
  return null;
};

const processEvent = async (eventType: string, data: any): Promise<EventOutcome> => {
  const sub = await findSubscription(data);
  if (!sub) return { statut: 'anomalie', message: `Abonnement introuvable (subscription_id=${data.subscription_id}, checkout_session_id=${data.checkout_session_id}, organization_id=${data.metadata?.organization_id}).`, companyId: null };
  const companyId = sub.companyId;

  // "leur doc dit success, en pratique c'est completed — j'accepte les deux par sécurité" (guide).
  const isSuccessStatus = (s: unknown) => s === 'completed' || s === 'success';

  if (eventType === 'checkout.completed' || eventType === 'subscription.payment.succeeded') {
    if (eventType === 'checkout.completed' && data.status !== undefined && !isSuccessStatus(data.status)) {
      return { statut: 'ignore', message: `checkout.completed avec statut non abouti : ${data.status}`, companyId };
    }
    const cycle = data.metadata?.cycle === 'annuel' ? 'annuel' : sub.cycle;
    await renewSubscription(companyId, { cycle, note: `Paiement DexPay confirmé (${eventType})` });
    return { statut: 'traite', message: 'Abonnement activé/renouvelé suite au paiement DexPay confirmé.', companyId };
  }

  if (eventType === 'subscription.payment.failed') {
    await notifyCompanyAdmins(companyId, 'Échec de paiement DexPay', 'Le paiement de votre abonnement Naatalix a échoué. DexPay relance automatiquement le prélèvement.');
    return { statut: 'traite', message: 'Échec de paiement notifié aux administrateurs (pas de blocage automatique).', companyId };
  }

  if (eventType === 'subscription.cancelled') {
    sub.statut = 'suspendu';
    sub.motifSuspension = 'Abonnement DexPay annulé';
    await sub.save();
    await recordSubscriptionEvent({ companyId, type: 'dexpay_annulation', toPlanId: sub.planId, statut: 'suspendu', note: 'subscription.cancelled (DexPay)' });
    return { statut: 'traite', message: 'Abonnement suspendu suite à une annulation DexPay.', companyId };
  }

  return { statut: 'ignore', message: `Type d'événement non géré : ${eventType}`, companyId };
};

// POST /api/v1/integrations/dexpay/webhook — public, authentifié par signature HMAC (pas de JWT,
// DexPay ne se connecte pas comme un utilisateur). DexPay ne documente/garantit aucun champ
// d'identifiant unique d'événement — confirmé par l'utilisateur (autre projet en production sur
// DexPay) qu'aucune déduplication stricte par id n'y est nécessaire : chaque transition appliquée
// ici (activer/suspendre/notifier) est idempotente PAR CONSTRUCTION, rejouer le même événement
// plusieurs fois (ce que font beaucoup de fournisseurs en cas de timeout côté webhook) ne produit
// jamais d'effet de bord. La détection d'un id plausible (`id`/`event_id`/`webhook_id`) reste
// tentée ci-dessous en bonus si DexPay en fournit un, mais n'est pas la garantie de sécurité — la
// garantie est l'idempotence des transitions elles-mêmes (contrairement à PayTrack, où rejouer un
// paiement créerait un double InvoicePayment).
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-webhook-signature'];
    if (!verifyWebhookSignature((req as any).rawBody, typeof signature === 'string' ? signature : undefined)) {
      await recordAudit({ actorType: 'webhook', action: 'dexpay.webhook', resultat: 'echec', details: { reason: 'signature_invalide' }, req });
      res.status(401).json({ error: 'Signature invalide.' });
      return;
    }

    const payload = req.body || {};
    const data = payload.data ?? payload;
    const eventType = payload.event ?? data.event;
    if (!eventType) { res.status(400).json({ error: 'Champ event manquant.' }); return; }

    const eventId: string | null = payload.id ? String(payload.id)
      : payload.event_id ? String(payload.event_id)
      : payload.webhook_id ? String(payload.webhook_id)
      : data.id ? String(data.id)
      : null;

    if (eventId && (await DexpayEvent.findOne({ where: { eventId } }))) {
      res.status(200).json({ status: 'deja_traite' });
      return;
    }

    const outcome = await processEvent(String(eventType), data);
    try {
      await DexpayEvent.create({ eventId, event: String(eventType), companyId: outcome.companyId, payload: JSON.stringify(payload), statut: outcome.statut, message: outcome.message });
    } catch (error: any) {
      // Deux livraisons simultanées du même événement avec eventId : la seconde perd la course.
      if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    }

    await recordAudit({
      actorType: 'webhook', companyId: outcome.companyId, action: 'dexpay.webhook',
      resultat: outcome.statut === 'anomalie' ? 'echec' : 'succes', details: { eventId, event: eventType, message: outcome.message }, req,
    });
    res.status(200).json({ status: outcome.statut, message: outcome.message });
  } catch (error) {
    console.error('Erreur handleWebhook DexPay :', error);
    await recordAudit({ actorType: 'webhook', action: 'dexpay.webhook', resultat: 'echec', details: { reason: 'erreur_interne' }, req });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// --- Supervision back-office ---

// GET /api/v1/backoffice/integrations/dexpay/events?statut=&companyId=&page=
export const listEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statut, companyId, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (statut) where.statut = String(statut);
    if (companyId) where.companyId = Number(companyId);
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await DexpayEvent.findAndCountAll({ where, limit: Number(limit), offset, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listEvents DexPay :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
