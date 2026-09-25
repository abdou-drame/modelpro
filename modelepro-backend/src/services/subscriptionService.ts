import { Op, Transaction } from 'sequelize';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { CompanySubscription } from '../models/CompanySubscription';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { Site } from '../models/Site';
import { createNotification } from './notificationService';
import { sendEmail } from './emailService';

const JOUR_MS = 24 * 60 * 60 * 1000;

// Clés de fonctionnalités contrôlées par subscriptionMiddleware.requireFeature / vérifiées
// ponctuellement via hasFeature(). Correspondance avec NAATALIX_Formules_Fonctionnalites.docx
// (matrice validée par la direction, 2026-09-24) — remplace le découpage plus grossier du
// 2026-09-23 (stock/fournisseurs/rentabilite/dashboard entièrement gatés au Pro). Le nouveau
// cahier place la gestion commerciale de base ET les modules Stock/Fournisseurs/Dashboard/
// Rentabilité "basique" dans TOUTES les formules dès l'Essentiel ; seules des fonctionnalités
// avancées précises sont réservées à partir du Pro ou du Business — d'où des clés plus fines.
export const PLAN_FEATURE_KEYS = {
  // Pipeline commercial : étapes de pipeline, opportunités, prévision de CA, tâches/rappels/
  // rendez-vous (CrmTask couvre "Rendez-vous & prestations" et "Agenda/réservations" du cahier —
  // un seul modèle, une seule clé, pas de découpage artificiel entre des routes identiques).
  CRM_PIPELINE: 'crm_pipeline',
  VARIANTES_PRODUITS: 'variantes_produits',
  AVOIRS: 'avoirs',
  STOCK_ALERTES: 'stock_alertes',
  STOCK_VALORISATION: 'stock_valorisation',
  DASHBOARD_AVANCE: 'dashboard_avance',
  RENTABILITE_AVANCEE: 'rentabilite_avancee',
  // Relances clients "assistées"/"automatisées" (Pro/Business) vs "manuelles" (Essentiel) : en
  // l'absence de canal e-mail/SMS sortant vers le client (non construit, voir JOURNAL.md), les
  // deux paliers se traduisent aujourd'hui par la même alerte interne au service Finance — cette
  // clé n'active/désactive que l'exécution du job pour l'entreprise, pas un comportement distinct
  // entre Pro et Business.
  RELANCES_ASSISTEES: 'relances_assistees',
  // Business uniquement.
  REPORTING_UTILISATEUR: 'reporting_utilisateur',
} as const;
const PRO_FEATURES = [
  PLAN_FEATURE_KEYS.CRM_PIPELINE,
  PLAN_FEATURE_KEYS.VARIANTES_PRODUITS,
  PLAN_FEATURE_KEYS.AVOIRS,
  PLAN_FEATURE_KEYS.STOCK_ALERTES,
  PLAN_FEATURE_KEYS.STOCK_VALORISATION,
  PLAN_FEATURE_KEYS.DASHBOARD_AVANCE,
  PLAN_FEATURE_KEYS.RENTABILITE_AVANCEE,
  PLAN_FEATURE_KEYS.RELANCES_ASSISTEES,
];
const BUSINESS_FEATURES = [...PRO_FEATURES, PLAN_FEATURE_KEYS.REPORTING_UTILISATEUR];

// Tarifs de lancement et quotas validés par la direction ATAABA (NAATALIX_Formules_Fonctionnalites.docx,
// 2026-09-24) — remplace les quotas de sites communiqués par e-mail le 2026-09-23 (Pro 3→2,
// Business 10→5 ; utilisateurs et prix inchangés). Le prix annuel (mensuel × 10, ~2 mois offerts)
// reste une convention SaaS provisoire, non fixée par la direction.
const DEFAULT_PLANS = [
  { code: 'essentiel', nom: 'Essentiel', prixMensuel: 5000, prixAnnuel: 50000, maxUtilisateurs: 2, maxSites: 1, essaiJours: 14, features: '[]' },
  { code: 'pro', nom: 'Pro', prixMensuel: 10000, prixAnnuel: 100000, maxUtilisateurs: 5, maxSites: 2, essaiJours: 14, features: JSON.stringify(PRO_FEATURES) },
  { code: 'business', nom: 'Business', prixMensuel: 20000, prixAnnuel: 200000, maxUtilisateurs: 15, maxSites: 5, essaiJours: 14, features: JSON.stringify(BUSINESS_FEATURES) },
  // "Sur devis" : absente de la matrice de fonctionnalités (qui ne détaille que les 3 formules de
  // lancement) mais maintenue comme palier supérieur au cahier des charges initial §13
  // "Entreprise" — quotas illimités, superset des fonctionnalités Business, prix à négocier au cas
  // par cas et à corriger manuellement depuis le back-office pour chaque client (aucune
  // facturation automatisée n'existe encore dans Naatalix, voir limites JOURNAL.md).
  { code: 'entreprise', nom: 'Entreprise (sur devis)', prixMensuel: 0, prixAnnuel: 0, maxUtilisateurs: null, maxSites: null, essaiJours: 14, features: JSON.stringify(BUSINESS_FEATURES) },
];

// Plan attribué pendant l'essai : 'business', pour laisser découvrir l'ensemble des fonctionnalités
// (y compris le reporting par utilisateur) avant de choisir une formule.
export const TRIAL_PLAN_CODE = 'business';

export const ensureDefaultPlans = async (transaction?: Transaction): Promise<void> => {
  for (const plan of DEFAULT_PLANS) {
    await SubscriptionPlan.findOrCreate({ where: { code: plan.code }, defaults: plan, transaction });
  }
};

export const recordSubscriptionEvent = async (
  data: { companyId: number; type: string; fromPlanId?: number | null; toPlanId?: number | null; statut?: string | null; actorUserId?: number | null; note?: string | null },
  transaction?: Transaction
): Promise<void> => {
  await SubscriptionEvent.create({
    companyId: data.companyId,
    type: data.type,
    fromPlanId: data.fromPlanId ?? null,
    toPlanId: data.toPlanId ?? null,
    statut: data.statut ?? null,
    actorUserId: data.actorUserId ?? null,
    note: data.note ?? null,
  }, { transaction });
};

// Appelé dans la transaction d'inscription : toute nouvelle entreprise démarre en période d'essai.
export const createTrialSubscription = async (companyId: number, transaction: Transaction): Promise<CompanySubscription> => {
  await ensureDefaultPlans(transaction);
  const plan = await SubscriptionPlan.findOne({ where: { code: TRIAL_PLAN_CODE }, transaction });
  const now = new Date();
  const subscription = await CompanySubscription.create({
    companyId,
    planId: plan!.id,
    statut: 'essai',
    dateDebut: now,
    dateFinEssai: new Date(now.getTime() + plan!.essaiJours * JOUR_MS),
  }, { transaction });
  await recordSubscriptionEvent({ companyId, type: 'creation', toPlanId: plan!.id, statut: 'essai', note: `Essai ${plan!.essaiJours} jours` }, transaction);
  return subscription;
};

// Statut réellement applicable : un essai ou une période échus sont traités comme expirés sans
// attendre le passage du job de maintenance.
export const effectiveStatus = (sub: CompanySubscription, now = new Date()): CompanySubscription['statut'] => {
  if (sub.statut === 'essai' && sub.dateFinEssai && new Date(sub.dateFinEssai) < now) return 'expire';
  if (sub.statut === 'actif' && sub.dateFinPeriode && new Date(sub.dateFinPeriode) < now) return 'expire';
  return sub.statut;
};

export const isReadOnlyStatus = (statut: CompanySubscription['statut']): boolean =>
  statut === 'suspendu' || statut === 'expire' || statut === 'annule';

export type QuotaResource = 'utilisateurs' | 'sites';

// Vérifie le quota du plan pour créer une ressource supplémentaire. Sans abonnement (comptes
// antérieurs à la Phase 4) ou plan illimité (null) : autorisé.
export const checkQuota = async (companyId: number, resource: QuotaResource): Promise<{ ok: boolean; max: number | null; current: number }> => {
  const sub = await CompanySubscription.findOne({ where: { companyId }, include: [{ model: SubscriptionPlan, as: 'plan' }] });
  const plan = sub?.get('plan') as SubscriptionPlan | undefined;
  const current = resource === 'utilisateurs'
    ? await User.count({ where: { companyId, statut: 'actif' } })
    : await Site.count({ where: { companyId, statut: 'actif' } });
  const max = plan ? (resource === 'utilisateurs' ? plan.maxUtilisateurs : plan.maxSites) : null;
  return { ok: max === null || current < max, max, current };
};

// Sans abonnement (entreprises antérieures à la Phase 4) : accès complet, comme pour les quotas.
export const hasFeature = async (companyId: number, feature: string): Promise<boolean> => {
  const sub = await CompanySubscription.findOne({ where: { companyId }, include: [{ model: SubscriptionPlan, as: 'plan' }] });
  const plan = sub?.get('plan') as SubscriptionPlan | undefined;
  if (!plan) return true;
  return plan.getFeatures().includes(feature);
};

// Prolonge (ou active) la période payée. Point d'écriture unique du renouvellement, réutilisable
// par une future confirmation de paiement d'abonnement via PayTrack.
export const renewSubscription = async (
  companyId: number,
  opts: { cycle?: 'mensuel' | 'annuel'; actorUserId?: number | null; note?: string },
  transaction?: Transaction
): Promise<CompanySubscription> => {
  const sub = await CompanySubscription.findOne({ where: { companyId }, transaction });
  if (!sub) throw new Error('Abonnement introuvable.');

  const cycle = opts.cycle || sub.cycle;
  const now = new Date();
  const base = sub.dateFinPeriode && new Date(sub.dateFinPeriode) > now ? new Date(sub.dateFinPeriode) : now;
  sub.cycle = cycle;
  sub.dateFinPeriode = new Date(base.getTime() + (cycle === 'annuel' ? 365 : 30) * JOUR_MS);
  sub.statut = 'actif';
  sub.motifSuspension = null;
  sub.alerteExpirationEnvoyee = false;
  await sub.save({ transaction });

  await Company.update({ statut: 'actif' }, { where: { id: companyId }, transaction });
  await recordSubscriptionEvent({ companyId, type: 'renouvellement', toPlanId: sub.planId, statut: 'actif', actorUserId: opts.actorUserId, note: opts.note || `Cycle ${cycle}` }, transaction);
  return sub;
};

// Exporté : réutilisé par dexpayController.ts pour notifier un échec de paiement d'abonnement
// (webhook subscription.payment.failed) sans dupliquer cette logique. Notifications e-mail des
// alertes métier (2026-09-25) : en plus de la notification in-app + push existante, un e-mail est
// envoyé à chaque admin qui a une adresse enregistrée — sendEmail() journalise en console si SMTP
// n'est pas configuré (jamais bloquant, voir emailService.ts).
export const notifyCompanyAdmins = async (companyId: number, titre: string, description: string): Promise<void> => {
  const admins = await User.findAll({ where: { companyId, companyRole: 'admin', statut: 'actif' } });
  for (const admin of admins) {
    await createNotification(admin.id, 'paiement', titre, description, undefined);
    if (admin.email) await sendEmail(admin.email, titre, description);
  }
};

// Job de maintenance (planifié quotidiennement dans server.ts) : (1) passe en 'expire' les essais
// et périodes échus, (2) alerte les admins d'entreprise 3 jours avant l'échéance (une seule fois
// par période). Exportée séparément pour être testable sans attendre l'horloge.
export const runSubscriptionMaintenance = async (now = new Date()): Promise<{ expired: number; alerted: number }> => {
  let expired = 0;
  let alerted = 0;

  const candidates = await CompanySubscription.findAll({ where: { statut: { [Op.in]: ['essai', 'actif'] } } });
  for (const sub of candidates) {
    const eff = effectiveStatus(sub, now);
    if (eff === 'expire') {
      sub.statut = 'expire';
      await sub.save();
      await recordSubscriptionEvent({ companyId: sub.companyId, type: 'expiration', toPlanId: sub.planId, statut: 'expire', note: 'Expiration automatique' });
      await notifyCompanyAdmins(sub.companyId, 'Abonnement Naatalix expiré', 'Votre abonnement a expiré : votre espace est passé en lecture seule. Contactez ATAABA pour le renouveler.');
      expired += 1;
      continue;
    }

    const fin = sub.statut === 'essai' ? sub.dateFinEssai : sub.dateFinPeriode;
    if (fin && !sub.alerteExpirationEnvoyee && new Date(fin).getTime() - now.getTime() <= 3 * JOUR_MS) {
      await notifyCompanyAdmins(sub.companyId, 'Abonnement Naatalix bientôt expiré', `Votre ${sub.statut === 'essai' ? 'période d\'essai' : 'abonnement'} expire le ${new Date(fin).toLocaleDateString('fr-FR')}.`);
      sub.alerteExpirationEnvoyee = true;
      await sub.save();
      alerted += 1;
    }
  }
  return { expired, alerted };
};
