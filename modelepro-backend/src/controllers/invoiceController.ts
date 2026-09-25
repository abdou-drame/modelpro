import { Response } from 'express';
import { Transaction } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Invoice } from '../models/Invoice';
import { InvoiceLine } from '../models/InvoiceLine';
import { InvoicePayment } from '../models/InvoicePayment';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderLine } from '../models/SalesOrderLine';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { Product } from '../models/Product';
import { nextDocumentNumber } from '../services/documentNumberingService';
import { Company } from '../models/Company';
import { generateInvoicePdf, generateReceiptPdf, generateCustomerStatementPdf } from '../services/documentPdfGenerators';
import { toCsv, sendCsv } from '../services/csvExportService';

const INVOICE_STATUSES = ['brouillon', 'envoyee', 'annulee'] as const;
const PAYMENT_MEANS = ['especes', 'virement', 'cheque', 'mobile_money', 'autre'] as const;
const EPSILON = 0.01;

const computeLineTotals = (line: { quantite: number; prixUnitaire: number; remisePct: number; tauxTaxe: number }) => {
  const brut = line.quantite * line.prixUnitaire;
  const remiseMontant = brut * (line.remisePct / 100);
  const totalLigneHT = brut - remiseMontant;
  const totalLigneTTC = totalLigneHT * (1 + line.tauxTaxe / 100);
  return { totalLigneHT, totalLigneTTC };
};

// Même logique que quoteController/salesOrderController — voir leur note pour le choix de
// remiseGlobale appliquée au TTC final.
const recalculateInvoiceTotals = async (invoice: Invoice, transaction?: Transaction): Promise<void> => {
  const lines = await InvoiceLine.findAll({ where: { invoiceId: invoice.id }, transaction });
  let sousTotal = 0;
  let totalTaxes = 0;
  for (const line of lines) {
    const { totalLigneHT, totalLigneTTC } = computeLineTotals(line);
    sousTotal += totalLigneHT;
    totalTaxes += totalLigneTTC - totalLigneHT;
  }
  invoice.sousTotal = sousTotal;
  invoice.totalTaxes = totalTaxes;
  invoice.totalTTC = Math.max(0, sousTotal + totalTaxes - invoice.remiseGlobale);
  await recalculateInvoicePayments(invoice, transaction, false);
  await invoice.save({ transaction });
};

// Recalcule montantPaye/soldeRestant/paymentStatus à partir des règlements enregistrés — point
// d'écriture unique, appelé après toute mutation de lignes (totalTTC change) ou de paiement.
// `save` séparé du appelant pour permettre à recalculateInvoiceTotals de ne faire qu'un seul save.
export const recalculateInvoicePayments = async (invoice: Invoice, transaction?: Transaction, save = true): Promise<void> => {
  const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, transaction });
  const montantPaye = payments.reduce((sum, p) => sum + p.montant, 0);
  invoice.montantPaye = montantPaye;
  invoice.soldeRestant = Math.max(0, invoice.totalTTC - montantPaye);
  if (montantPaye <= EPSILON) invoice.paymentStatus = 'impayee';
  else if (montantPaye >= invoice.totalTTC - EPSILON) invoice.paymentStatus = 'payee';
  else invoice.paymentStatus = 'partiellement_payee';
  if (save) await invoice.save({ transaction });
};

const buildLineData = async (companyId: number, raw: any, ordre: number) => {
  const quantite = raw.quantite !== undefined ? Number(raw.quantite) : 1;
  if (!quantite || quantite <= 0) {
    throw new Error('Chaque ligne doit avoir une quantité strictement positive.');
  }

  let designation = raw.designation;
  let prixUnitaire = raw.prixUnitaire;
  let tauxTaxe = raw.tauxTaxe;

  if (raw.productId) {
    const product = await Product.findOne({ where: { id: Number(raw.productId), companyId } });
    if (!product) throw new Error(`Produit/service ${raw.productId} introuvable.`);
    if (designation === undefined) designation = product.nom;
    if (prixUnitaire === undefined) prixUnitaire = product.prixUnitaire;
    if (tauxTaxe === undefined) tauxTaxe = product.tauxTaxe;
  }

  if (!designation) throw new Error('Chaque ligne doit avoir une désignation (ou un productId valide).');

  return {
    productId: raw.productId || null,
    designation,
    quantite,
    prixUnitaire: prixUnitaire !== undefined ? Number(prixUnitaire) : 0,
    remisePct: raw.remisePct !== undefined ? Number(raw.remisePct) : 0,
    tauxTaxe: tauxTaxe !== undefined ? Number(tauxTaxe) : 0,
    ordre,
  };
};

// POST /api/v1/crm/invoices — création manuelle
export const createInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { customerId, contactId, dateEcheance, notes, remiseGlobale, lines } = req.body;

    if (!customerId) { res.status(400).json({ error: 'customerId requis.' }); return; }

    const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    if (contactId) {
      const contact = await Contact.findOne({ where: { id: Number(contactId), companyId, customerId: customer.id } });
      if (!contact) { res.status(404).json({ error: 'Contact introuvable pour ce client.' }); return; }
    }

    let lineData: any[] = [];
    if (Array.isArray(lines) && lines.length > 0) {
      try {
        lineData = await Promise.all(lines.map((l: any, i: number) => buildLineData(companyId, l, i)));
      } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
        return;
      }
    }

    const invoice = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'FAC', t);

      const invoice = await Invoice.create({
        companyId,
        numero,
        customerId: customer.id,
        contactId: contactId || null,
        dateEcheance: dateEcheance || null,
        notes: notes || null,
        remiseGlobale: remiseGlobale !== undefined ? Number(remiseGlobale) : 0,
        createdByUserId: req.user!.id,
      }, { transaction: t });

      if (lineData.length > 0) {
        await InvoiceLine.bulkCreate(lineData.map((l) => ({ ...l, invoiceId: invoice.id })), { transaction: t });
      }

      await recalculateInvoiceTotals(invoice, t);
      return invoice;
    });

    const full = await Invoice.findByPk(invoice.id, { include: [{ model: InvoiceLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la facture.' });
  }
};

// POST /api/v1/crm/orders/:id/convert-to-invoice
export const convertOrderToInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const order = await SalesOrder.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: SalesOrderLine, as: 'lignes' }],
    });
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }

    if (!['confirmee', 'en_preparation', 'livree'].includes(order.statut)) {
      res.status(400).json({ error: `Une commande au statut "${order.statut}" ne peut pas être facturée.` });
      return;
    }

    const existing = await Invoice.findOne({ where: { salesOrderId: order.id } });
    if (existing) {
      res.status(400).json({ error: 'Cette commande a déjà été facturée.', invoiceId: existing.id });
      return;
    }

    const orderLines = order.get('lignes') as SalesOrderLine[];

    const invoice = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'FAC', t);

      const invoice = await Invoice.create({
        companyId,
        numero,
        customerId: order.customerId,
        contactId: order.contactId,
        salesOrderId: order.id,
        statut: 'envoyee',
        remiseGlobale: order.remiseGlobale,
        createdByUserId: req.user!.id,
      }, { transaction: t });

      if (orderLines.length > 0) {
        await InvoiceLine.bulkCreate(
          orderLines.map((l) => ({
            invoiceId: invoice.id,
            productId: l.productId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remisePct: l.remisePct,
            tauxTaxe: l.tauxTaxe,
            ordre: l.ordre,
          })),
          { transaction: t }
        );
      }

      await recalculateInvoiceTotals(invoice, t);
      return invoice;
    });

    const full = await Invoice.findByPk(invoice.id, { include: [{ model: InvoiceLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur convertOrderToInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la facturation.' });
  }
};

// GET /api/v1/crm/invoices?statut=&paymentStatus=&customerId=&page=&limit=
export const listInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, paymentStatus, customerId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut && INVOICE_STATUSES.includes(statut as any)) where.statut = statut;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (customerId) where.customerId = Number(customerId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'nom'] }],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (error) {
    console.error('Erreur listInvoices :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/invoices/:id
export const getInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: Customer, as: 'customer' },
        { model: Contact, as: 'contact' },
        { model: SalesOrder, as: 'salesOrder', attributes: ['id', 'numero'] },
        { model: InvoiceLine, as: 'lignes', include: [{ model: Product, as: 'product', attributes: ['id', 'nom', 'reference'] }] },
        { model: InvoicePayment, as: 'paiements', order: [['datePaiement', 'ASC']] },
      ],
    });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }

    const lignesAvecTotaux = (invoice.get('lignes') as InvoiceLine[]).map((l) => ({
      ...l.toJSON(),
      ...computeLineTotals(l),
    }));

    res.status(200).json({ ...invoice.toJSON(), lignes: lignesAvecTotaux });
  } catch (error) {
    console.error('Erreur getInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const findEditableInvoice = async (req: AuthenticatedRequest, res: Response): Promise<Invoice | null> => {
  const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
  if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return null; }
  if (invoice.statut !== 'brouillon') {
    res.status(400).json({ error: `Facture non modifiable dans le statut "${invoice.statut}" (seul un brouillon peut être modifié).` });
    return null;
  }
  return invoice;
};

// PUT /api/v1/crm/invoices/:id — brouillon uniquement
export const updateInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await findEditableInvoice(req, res);
    if (!invoice) return;

    const companyId = req.user!.companyId!;
    const { customerId, contactId, dateEcheance, notes, remiseGlobale } = req.body;

    if (customerId !== undefined) {
      const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
      if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }
      invoice.customerId = customer.id;
    }
    if (contactId !== undefined) invoice.contactId = contactId || null;
    if (dateEcheance !== undefined) invoice.dateEcheance = dateEcheance;
    if (notes !== undefined) invoice.notes = notes;
    if (remiseGlobale !== undefined) invoice.remiseGlobale = Number(remiseGlobale);

    await invoice.save();
    await recalculateInvoiceTotals(invoice);

    res.status(200).json(invoice);
  } catch (error) {
    console.error('Erreur updateInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/invoices/:id/lines — brouillon uniquement
export const addLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await findEditableInvoice(req, res);
    if (!invoice) return;

    const companyId = req.user!.companyId!;
    const count = await InvoiceLine.count({ where: { invoiceId: invoice.id } });

    let lineData;
    try {
      lineData = await buildLineData(companyId, req.body, count);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
      return;
    }

    const line = await InvoiceLine.create({ ...lineData, invoiceId: invoice.id });
    await recalculateInvoiceTotals(invoice);

    res.status(201).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur addLine (invoice) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/invoices/:id/lines/:lineId — brouillon uniquement
export const updateLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await findEditableInvoice(req, res);
    if (!invoice) return;

    const line = await InvoiceLine.findOne({ where: { id: Number(req.params.lineId), invoiceId: invoice.id } });
    if (!line) { res.status(404).json({ error: 'Ligne introuvable.' }); return; }

    const { designation, quantite, prixUnitaire, remisePct, tauxTaxe } = req.body;
    if (designation !== undefined) line.designation = designation;
    if (quantite !== undefined) {
      if (Number(quantite) <= 0) { res.status(400).json({ error: 'quantite doit être strictement positive.' }); return; }
      line.quantite = Number(quantite);
    }
    if (prixUnitaire !== undefined) line.prixUnitaire = Number(prixUnitaire);
    if (remisePct !== undefined) line.remisePct = Number(remisePct);
    if (tauxTaxe !== undefined) line.tauxTaxe = Number(tauxTaxe);
    await line.save();

    await recalculateInvoiceTotals(invoice);

    res.status(200).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur updateLine (invoice) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/invoices/:id/lines/:lineId — brouillon uniquement
export const deleteLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await findEditableInvoice(req, res);
    if (!invoice) return;

    const line = await InvoiceLine.findOne({ where: { id: Number(req.params.lineId), invoiceId: invoice.id } });
    if (!line) { res.status(404).json({ error: 'Ligne introuvable.' }); return; }

    await line.destroy();
    await recalculateInvoiceTotals(invoice);

    res.status(200).json({ message: 'Ligne supprimée.', invoice });
  } catch (error) {
    console.error('Erreur deleteLine (invoice) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/invoices/:id/send
export const sendInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    if (invoice.statut !== 'brouillon') {
      res.status(400).json({ error: `Transition impossible depuis le statut "${invoice.statut}".` });
      return;
    }

    const linesCount = await InvoiceLine.count({ where: { invoiceId: invoice.id } });
    if (linesCount === 0) {
      res.status(400).json({ error: "Impossible d'envoyer une facture sans aucune ligne." });
      return;
    }

    invoice.statut = 'envoyee';
    await invoice.save();
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Erreur sendInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/invoices/:id/cancel — refusé si des règlements ont déjà été enregistrés
// (utiliser un avoir dans ce cas, pas une annulation qui effacerait la trace comptable).
export const cancelInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    if (!['brouillon', 'envoyee'].includes(invoice.statut)) {
      res.status(400).json({ error: `Transition impossible depuis le statut "${invoice.statut}".` });
      return;
    }
    if (invoice.montantPaye > EPSILON) {
      res.status(400).json({ error: 'Impossible d\'annuler une facture déjà réglée, même partiellement. Utilisez un avoir.' });
      return;
    }

    invoice.statut = 'annulee';
    await invoice.save();
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Erreur cancelInvoice :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/invoices/:id/credit-note — avoir simple. Par défaut, reprend toutes les
// lignes de la facture d'origine (avoir intégral) ; des `lines` explicites permettent un avoir
// partiel.
export const createCreditNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const original = await Invoice.findOne({
      where: { id: Number(req.params.id), companyId, type: 'facture' },
      include: [{ model: InvoiceLine, as: 'lignes' }],
    });
    if (!original) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    if (original.statut !== 'envoyee') {
      res.status(400).json({ error: 'Un avoir ne peut être émis que sur une facture envoyée.' });
      return;
    }

    const { lines } = req.body || {};
    let lineData: any[];
    if (Array.isArray(lines) && lines.length > 0) {
      try {
        lineData = await Promise.all(lines.map((l: any, i: number) => buildLineData(companyId, l, i)));
      } catch (e) {
        res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
        return;
      }
    } else {
      const originalLines = original.get('lignes') as InvoiceLine[];
      lineData = originalLines.map((l, i) => ({
        productId: l.productId,
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        remisePct: l.remisePct,
        tauxTaxe: l.tauxTaxe,
        ordre: i,
      }));
    }

    const avoir = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'AV', t);

      const avoir = await Invoice.create({
        companyId,
        numero,
        customerId: original.customerId,
        contactId: original.contactId,
        type: 'avoir',
        avoirDeFactureId: original.id,
        statut: 'envoyee',
        createdByUserId: req.user!.id,
      }, { transaction: t });

      await InvoiceLine.bulkCreate(lineData.map((l) => ({ ...l, invoiceId: avoir.id })), { transaction: t });
      await recalculateInvoiceTotals(avoir, t);
      return avoir;
    });

    const full = await Invoice.findByPk(avoir.id, { include: [{ model: InvoiceLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createCreditNote :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de l\'avoir.' });
  }
};

// POST /api/v1/crm/invoices/:id/payments — règlement manuel.
export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }
    if (invoice.statut !== 'envoyee') {
      res.status(400).json({ error: 'Seule une facture envoyée peut recevoir un règlement.' });
      return;
    }

    const { montant, moyen, datePaiement, reference, notes } = req.body;
    const montantNumber = Number(montant);
    if (!montantNumber || montantNumber <= 0) {
      res.status(400).json({ error: 'montant requis et strictement positif.' });
      return;
    }
    if (moyen && !PAYMENT_MEANS.includes(moyen)) {
      res.status(400).json({ error: `moyen invalide. Valeurs acceptées : ${PAYMENT_MEANS.join(', ')}` });
      return;
    }
    if (montantNumber > invoice.soldeRestant + EPSILON) {
      res.status(400).json({ error: `Le montant dépasse le solde restant (${invoice.soldeRestant} FCFA).` });
      return;
    }

    const payment = await sequelize.transaction(async (t) => {
      const payment = await InvoicePayment.create({
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        montant: montantNumber,
        moyen: moyen || 'especes',
        datePaiement: datePaiement || new Date(),
        reference: reference || null,
        notes: notes || null,
        createdByUserId: req.user!.id,
      }, { transaction: t });

      await recalculateInvoicePayments(invoice, t);
      return payment;
    });

    res.status(201).json({ payment, invoice });
  } catch (error) {
    console.error('Erreur recordPayment :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du règlement.' });
  }
};

// GET /api/v1/crm/invoices/:id/payments
export const listPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }

    const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, order: [['datePaiement', 'ASC']] });
    res.status(200).json(payments);
  } catch (error) {
    console.error('Erreur listPayments :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const computeCustomerStatement = async (companyId: number, customer: Customer) => {
  const invoices = await Invoice.findAll({
    where: { companyId, customerId: customer.id, statut: 'envoyee' },
    order: [['dateEmission', 'ASC']],
  });

  let totalFacture = 0;
  let totalAvoir = 0;
  let totalPaye = 0;
  for (const inv of invoices) {
    if (inv.type === 'facture') {
      totalFacture += inv.totalTTC;
      totalPaye += inv.montantPaye;
    } else {
      totalAvoir += inv.totalTTC;
    }
  }
  const soldeDu = Math.max(0, totalFacture - totalAvoir - totalPaye);

  return {
    customer: { id: customer.id, nom: customer.nom },
    totalFacture,
    totalAvoir,
    totalPaye,
    soldeDu,
    documents: invoices,
  };
};

// GET /api/v1/crm/customers/:customerId/statement — relevé client (factures, avoirs, solde dû).
export const getCustomerStatement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customerId = Number(req.params.customerId);
    const customer = await Customer.findOne({ where: { id: customerId, companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    const statement = await computeCustomerStatement(companyId, customer);
    res.status(200).json(statement);
  } catch (error) {
    console.error('Erreur getCustomerStatement :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/invoices/:id/pdf
export const getInvoicePdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: InvoiceLine, as: 'lignes' }, { model: Customer, as: 'customer' }],
    });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }

    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const pdf = await generateInvoicePdf(invoice, invoice.get('lignes') as InvoiceLine[], invoice.get('customer') as Customer, company);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${invoice.numero}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur getInvoicePdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/invoices/:id/payments/:paymentId/receipt — reçu de paiement
export const getPaymentReceiptPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const invoice = await Invoice.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: Customer, as: 'customer' }],
    });
    if (!invoice) { res.status(404).json({ error: 'Facture introuvable.' }); return; }

    const payment = await InvoicePayment.findOne({ where: { id: Number(req.params.paymentId), invoiceId: invoice.id } });
    if (!payment) { res.status(404).json({ error: 'Règlement introuvable.' }); return; }

    const company = await Company.findByPk(companyId);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const pdf = await generateReceiptPdf(payment, invoice, invoice.get('customer') as Customer, company);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${invoice.numero}-recu-${payment.id}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur getPaymentReceiptPdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/customers/:customerId/statement/pdf
export const getCustomerStatementPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customer = await Customer.findOne({ where: { id: Number(req.params.customerId), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    const company = await Company.findByPk(companyId);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const statement = await computeCustomerStatement(companyId, customer);
    const pdf = await generateCustomerStatementPdf(statement, company);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="releve-${customer.nom}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur getCustomerStatementPdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/invoices/export
export const exportInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const invoices = await Invoice.findAll({
      where: { companyId },
      include: [{ model: Customer, as: 'customer', attributes: ['nom'] }],
      order: [['createdAt', 'ASC']],
    });

    const csv = toCsv(invoices, [
      { header: 'Numéro', value: (i) => i.numero },
      { header: 'Type', value: (i) => i.type },
      { header: 'Client', value: (i) => (i.get('customer') as Customer)?.nom },
      { header: 'Statut', value: (i) => i.statut },
      { header: 'Statut paiement', value: (i) => i.paymentStatus },
      { header: 'Date d\'émission', value: (i) => String(i.dateEmission) },
      { header: 'Échéance', value: (i) => (i.dateEcheance ? String(i.dateEcheance) : '') },
      { header: 'Total TTC', value: (i) => i.totalTTC },
      { header: 'Montant payé', value: (i) => i.montantPaye },
      { header: 'Solde restant', value: (i) => i.soldeRestant },
    ]);
    sendCsv(res, 'factures.csv', csv);
  } catch (error) {
    console.error('Erreur exportInvoices :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
