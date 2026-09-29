import crypto from 'crypto';
import { Request, Response } from 'express';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Company } from '../models/Company';
import { Invoice } from '../models/Invoice';
import { InvoicePayment } from '../models/InvoicePayment';
import { PaytrackTransaction } from '../models/PaytrackTransaction';
import { PaytrackEvent } from '../models/PaytrackEvent';
import { createPaymentRequest, verifyWebhookSignature, isPaytrackConfigured } from '../services/paytrackService';
import { recordAudit } from '../services/auditService';
import { recalculateInvoicePayments } from './invoiceController';

const EPSILON = 0.01;

// POST /api/v1/crm/invoices/:id/paytrack/pay — "Payer avec PayTrack" (cahier des charges §7.1).
// Naatalix transmet montant, devise et référence ; PayTrack exécute le paiement et confirme par
// webhook. Sans PayTrack configuré/activé, Naatalix continue de fonctionner avec les règlements
// manuels (critère d'acceptation C1).
export const initiatePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;

    if (!isPaytrackConfigured()) {
      res.status(503).json({ code: 'PAYTRACK_NOT_CONFIGURED', error: "L'intégration PayTrack n'est pas configurée sur cette plateforme." });
      return;
    }
    const company = await Company.findByPk(companyId);
    if (!company?.paytrackActif) {
      res.status(403).json({ code: 'PAYTRACK_DISABLED', error: "L'intégration PayTrack n'est pas activée pour votre entreprise." });
      return;
    }

    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId, type: 'facture' } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    if (invoice.statut !== 'envoyee') { res.status(400).json({ error: 'Seule une facture envoyée peut être payée.' }); return; }
    if (invoice.soldeRestant <= EPSILON) { res.status(400).json({ error: 'Cette facture est déjà soldée.' }); return; }

    const montant = req.body?.montant !== undefined ? Number(req.body.montant) : invoice.soldeRestant;
    if (!montant || montant <= 0 || montant > invoice.soldeRestant + EPSILON) {
      res.status(400).json({ error: `montant invalide (solde restant : ${invoice.soldeRestant} FCFA).` });
      return;
    }

    const transaction = await PaytrackTransaction.create({
      companyId,
      invoiceId: invoice.id,
      montant,
      devise: 'FCFA',
      referenceInterne: `NTX-${companyId}-${invoice.id}-${crypto.randomBytes(4).toString('hex')}`,
      createdByUserId: req.user!.id,
    });

    try {
      const result = await createPaymentRequest({
        referenceInterne: transaction.referenceInterne,
        montant,
        devise: transaction.devise,
        description: `Facture ${invoice.numero}`,
      });
      transaction.externalReference = result.externalReference;
      transaction.paymentUrl = result.paymentUrl;
      await transaction.save();
    } catch (error) {
      transaction.statut = 'echoue';
      await transaction.save();
      await recordAudit({ actorUserId: req.user!.id, actorType: 'company_user', companyId, action: 'paytrack.initiate', objectType: 'Invoice', objectId: invoice.id, resultat: 'echec', details: { message: error instanceof Error ? error.message : String(error) }, req });
      res.status(502).json({ error: "Impossible d'initier le paiement PayTrack." });
      return;
    }

    await recordAudit({ actorUserId: req.user!.id, actorType: 'company_user', companyId, action: 'paytrack.initiate', objectType: 'Invoice', objectId: invoice.id, details: { montant, reference: transaction.referenceInterne }, req });
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Erreur initiatePayment :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/invoices/:id/paytrack
export const listInvoiceTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    res.status(200).json(await PaytrackTransaction.findAll({ where: { invoiceId: invoice.id }, order: [['createdAt', 'DESC']] }));
  } catch (error) {
    console.error('Erreur listInvoiceTransactions :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

interface EventOutcome { statut: 'traite' | 'ignore' | 'anomalie'; message: string; companyId: number | null; }

// Traite un événement dans la transaction fournie. Les anomalies (référence inconnue, montant
// différent, facture non payable) ne lèvent PAS : elles sont journalisées et committées, et la
// réponse reste 200 pour ne pas déclencher de relances infinies côté PayTrack.
const processEvent = async (body: any, t: Transaction): Promise<EventOutcome> => {
  const transaction = await PaytrackTransaction.findOne({ where: { referenceInterne: String(body.reference || '') }, transaction: t });
  if (!transaction) return { statut: 'anomalie', message: `Référence inconnue : ${body.reference}`, companyId: null };
  const companyId = transaction.companyId;

  if (body.type === 'payment.failed') {
    if (transaction.statut === 'initie') { transaction.statut = 'echoue'; await transaction.save({ transaction: t }); }
    return { statut: 'traite', message: 'Paiement échoué enregistré.', companyId };
  }

  if (body.type !== 'payment.succeeded') return { statut: 'ignore', message: `Type non géré : ${body.type}`, companyId };

  if (transaction.statut === 'confirme') return { statut: 'ignore', message: 'Transaction déjà confirmée.', companyId };

  if (Math.abs(Number(body.amount) - transaction.montant) > EPSILON || (body.currency && body.currency !== transaction.devise)) {
    return { statut: 'anomalie', message: `Montant/devise incohérents (reçu ${body.amount} ${body.currency}, attendu ${transaction.montant} ${transaction.devise}).`, companyId };
  }

  const invoice = await Invoice.findByPk(transaction.invoiceId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!invoice || invoice.statut !== 'envoyee' || transaction.montant > invoice.soldeRestant + EPSILON) {
    return { statut: 'anomalie', message: 'Facture non payable ou solde insuffisant : paiement à rapprocher manuellement.', companyId };
  }

  const payment = await InvoicePayment.create({
    companyId,
    invoiceId: invoice.id,
    montant: transaction.montant,
    moyen: 'mobile_money',
    datePaiement: new Date(),
    reference: body.transaction_id ? String(body.transaction_id) : transaction.externalReference,
    notes: `Payé via PayTrack (${transaction.referenceInterne})`,
  }, { transaction: t });
  await recalculateInvoicePayments(invoice, t);

  transaction.statut = 'confirme';
  transaction.invoicePaymentId = payment.id;
  if (body.transaction_id) transaction.externalReference = String(body.transaction_id);
  await transaction.save({ transaction: t });

  return { statut: 'traite', message: `Règlement de ${transaction.montant} FCFA appliqué à ${invoice.numero}.`, companyId };
};

// POST /api/v1/integrations/paytrack/webhook — public, authentifié par signature HMAC. Idempotent
// (eventId unique) : le même événement rejoué n'applique jamais deux fois le règlement.
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-paytrack-signature'];
    if (!verifyWebhookSignature((req as any).rawBody, typeof signature === 'string' ? signature : undefined)) {
      await recordAudit({ actorType: 'webhook', action: 'paytrack.webhook', resultat: 'echec', details: { reason: 'signature_invalide' }, req });
      res.status(401).json({ error: 'Signature invalide.' });
      return;
    }

    const body = req.body || {};
    const eventId = body.event_id ? String(body.event_id) : '';
    if (!eventId || !body.type) { res.status(400).json({ error: 'event_id et type requis.' }); return; }

    if (await PaytrackEvent.findOne({ where: { eventId } })) {
      res.status(200).json({ status: 'deja_traite' });
      return;
    }

    let outcome: EventOutcome;
    try {
      outcome = await sequelize.transaction(async (t) => {
        const result = await processEvent(body, t);
        await PaytrackEvent.create({
          eventId, type: String(body.type), companyId: result.companyId,
          payload: JSON.stringify(body), statut: result.statut, message: result.message,
        }, { transaction: t });
        return result;
      });
    } catch (error) {
      // Deux livraisons simultanées du même événement : la seconde perd la course sur eventId.
      if (error instanceof UniqueConstraintError) { res.status(200).json({ status: 'deja_traite' }); return; }
      throw error;
    }

    await recordAudit({
      actorType: 'webhook', companyId: outcome.companyId, action: 'paytrack.webhook',
      resultat: outcome.statut === 'anomalie' ? 'echec' : 'succes', details: { eventId, type: body.type, message: outcome.message }, req,
    });
    res.status(200).json({ status: outcome.statut, message: outcome.message });
  } catch (error) {
    console.error('Erreur handleWebhook PayTrack :', error);
    await recordAudit({ actorType: 'webhook', action: 'paytrack.webhook', resultat: 'echec', details: { reason: 'erreur_interne' }, req });
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// --- Supervision back-office ---

// GET /api/v1/backoffice/integrations/paytrack/events?statut=&companyId=&page=
export const listEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statut, companyId, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (statut) where.statut = String(statut);
    if (companyId) where.companyId = Number(companyId);
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await PaytrackEvent.findAndCountAll({ where, limit: Number(limit), offset, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listEvents PayTrack :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/integrations/paytrack/transactions?statut=&companyId=&page=
export const listTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statut, companyId, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (statut) where.statut = String(statut);
    if (companyId) where.companyId = Number(companyId);
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await PaytrackTransaction.findAndCountAll({ where, limit: Number(limit), offset, order: [['createdAt', 'DESC']] });
    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listTransactions PayTrack :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
