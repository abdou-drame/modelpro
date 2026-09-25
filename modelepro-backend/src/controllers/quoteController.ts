import { Response } from 'express';
import { Transaction } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Quote } from '../models/Quote';
import { QuoteLine } from '../models/QuoteLine';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { Product } from '../models/Product';
import { nextDocumentNumber } from '../services/documentNumberingService';
import { Company } from '../models/Company';
import { generateQuotePdf } from '../services/documentPdfGenerators';
import { toCsv, sendCsv } from '../services/csvExportService';
import { recordCompanyActivity } from '../services/auditService';

const QUOTE_STATUSES = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'] as const;

const computeLineTotals = (line: { quantite: number; prixUnitaire: number; remisePct: number; tauxTaxe: number }) => {
  const brut = line.quantite * line.prixUnitaire;
  const remiseMontant = brut * (line.remisePct / 100);
  const totalLigneHT = brut - remiseMontant;
  const totalLigneTTC = totalLigneHT * (1 + line.tauxTaxe / 100);
  return { totalLigneHT, totalLigneTTC };
};

// Point d'écriture unique des totaux du devis : appelé après toute mutation de lignes ou de
// remiseGlobale. totalTaxes = somme des taxes de ligne (basées sur le HT après remise de ligne) ;
// remiseGlobale est une remise supplémentaire forfaitaire appliquée au total TTC final.
const recalculateQuoteTotals = async (quote: Quote, transaction?: Transaction): Promise<void> => {
  const lines = await QuoteLine.findAll({ where: { quoteId: quote.id }, transaction });
  let sousTotal = 0;
  let totalTaxes = 0;
  for (const line of lines) {
    const { totalLigneHT, totalLigneTTC } = computeLineTotals(line);
    sousTotal += totalLigneHT;
    totalTaxes += totalLigneTTC - totalLigneHT;
  }
  quote.sousTotal = sousTotal;
  quote.totalTaxes = totalTaxes;
  quote.totalTTC = Math.max(0, sousTotal + totalTaxes - quote.remiseGlobale);
  await quote.save({ transaction });
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

// POST /api/v1/crm/quotes
export const createQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { customerId, contactId, dateValidite, notes, remiseGlobale, lines } = req.body;

    if (!customerId) { res.status(400).json({ error: 'customerId requis.' }); return; }

    const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    if (contactId) {
      const contact = await Contact.findOne({ where: { id: Number(contactId), companyId, customerId: customer.id } });
      if (!contact) { res.status(404).json({ error: "Contact introuvable pour ce client." }); return; }
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

    const quote = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'DEV', t);

      const quote = await Quote.create({
        companyId,
        numero,
        customerId: customer.id,
        contactId: contactId || null,
        dateValidite: dateValidite || null,
        notes: notes || null,
        remiseGlobale: remiseGlobale !== undefined ? Number(remiseGlobale) : 0,
        createdByUserId: req.user!.id,
      }, { transaction: t });

      if (lineData.length > 0) {
        await QuoteLine.bulkCreate(lineData.map((l) => ({ ...l, quoteId: quote.id })), { transaction: t });
      }

      await recalculateQuoteTotals(quote, t);
      return quote;
    });

    const full = await Quote.findByPk(quote.id, { include: [{ model: QuoteLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createQuote :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création du devis.' });
  }
};

// GET /api/v1/crm/quotes?statut=&customerId=&page=&limit=
export const listQuotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, customerId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut && QUOTE_STATUSES.includes(statut as any)) where.statut = statut;
    if (customerId) where.customerId = Number(customerId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Quote.findAndCountAll({
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
    console.error('Erreur listQuotes :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/quotes/:id
export const getQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await Quote.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: Customer, as: 'customer' },
        { model: Contact, as: 'contact' },
        { model: QuoteLine, as: 'lignes', include: [{ model: Product, as: 'product', attributes: ['id', 'nom', 'reference'] }] },
      ],
    });
    if (!quote) { res.status(404).json({ error: 'Devis introuvable.' }); return; }

    const lignesAvecTotaux = (quote.get('lignes') as QuoteLine[]).map((l) => ({
      ...l.toJSON(),
      ...computeLineTotals(l),
    }));

    res.status(200).json({ ...quote.toJSON(), lignes: lignesAvecTotaux });
  } catch (error) {
    console.error('Erreur getQuote :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const findEditableQuote = async (req: AuthenticatedRequest, res: Response): Promise<Quote | null> => {
  const quote = await Quote.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
  if (!quote) { res.status(404).json({ error: 'Devis introuvable.' }); return null; }
  if (quote.statut !== 'brouillon') {
    res.status(400).json({ error: `Devis non modifiable dans le statut "${quote.statut}" (seul un brouillon peut être modifié).` });
    return null;
  }
  return quote;
};

// PUT /api/v1/crm/quotes/:id — brouillon uniquement
export const updateQuote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await findEditableQuote(req, res);
    if (!quote) return;

    const { customerId, contactId, dateValidite, notes, remiseGlobale } = req.body;
    const companyId = req.user!.companyId!;

    if (customerId !== undefined) {
      const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
      if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }
      quote.customerId = customer.id;
    }
    if (contactId !== undefined) quote.contactId = contactId || null;
    if (dateValidite !== undefined) quote.dateValidite = dateValidite;
    if (notes !== undefined) quote.notes = notes;
    if (remiseGlobale !== undefined) quote.remiseGlobale = Number(remiseGlobale);

    await quote.save();
    await recalculateQuoteTotals(quote);

    res.status(200).json(quote);
  } catch (error) {
    console.error('Erreur updateQuote :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/quotes/:id/lines — brouillon uniquement
export const addLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await findEditableQuote(req, res);
    if (!quote) return;

    const companyId = req.user!.companyId!;
    const count = await QuoteLine.count({ where: { quoteId: quote.id } });

    let lineData;
    try {
      lineData = await buildLineData(companyId, req.body, count);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
      return;
    }

    const line = await QuoteLine.create({ ...lineData, quoteId: quote.id });
    await recalculateQuoteTotals(quote);

    res.status(201).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur addLine :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/quotes/:id/lines/:lineId — brouillon uniquement
export const updateLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await findEditableQuote(req, res);
    if (!quote) return;

    const line = await QuoteLine.findOne({ where: { id: Number(req.params.lineId), quoteId: quote.id } });
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

    await recalculateQuoteTotals(quote);

    res.status(200).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur updateLine :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/quotes/:id/lines/:lineId — brouillon uniquement
export const deleteLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await findEditableQuote(req, res);
    if (!quote) return;

    const line = await QuoteLine.findOne({ where: { id: Number(req.params.lineId), quoteId: quote.id } });
    if (!line) { res.status(404).json({ error: 'Ligne introuvable.' }); return; }

    await line.destroy();
    await recalculateQuoteTotals(quote);

    res.status(200).json({ message: 'Ligne supprimée.', quote });
  } catch (error) {
    console.error('Erreur deleteLine :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const transition = (allowedFrom: string[], to: Quote['statut']) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const quote = await Quote.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
      if (!quote) { res.status(404).json({ error: 'Devis introuvable.' }); return; }

      if (!allowedFrom.includes(quote.statut)) {
        res.status(400).json({ error: `Transition impossible depuis le statut "${quote.statut}".` });
        return;
      }

      if (to === 'envoye') {
        const linesCount = await QuoteLine.count({ where: { quoteId: quote.id } });
        if (linesCount === 0) {
          res.status(400).json({ error: 'Impossible d\'envoyer un devis sans aucune ligne.' });
          return;
        }
      }

      quote.statut = to;
      await quote.save();
      await recordCompanyActivity(req, `devis.${to}`, 'Quote', quote.id, { numero: quote.numero });
      res.status(200).json(quote);
    } catch (error) {
      console.error('Erreur transition devis :', error);
      res.status(500).json({ error: 'Une erreur est survenue.' });
    }
  };
};

// PATCH /api/v1/crm/quotes/:id/send
export const sendQuote = transition(['brouillon'], 'envoye');
// PATCH /api/v1/crm/quotes/:id/accept
export const acceptQuote = transition(['envoye'], 'accepte');
// PATCH /api/v1/crm/quotes/:id/refuse
export const refuseQuote = transition(['envoye'], 'refuse');
// PATCH /api/v1/crm/quotes/:id/expire
export const expireQuote = transition(['envoye'], 'expire');

// GET /api/v1/crm/quotes/:id/pdf
export const getQuotePdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quote = await Quote.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: QuoteLine, as: 'lignes' }, { model: Customer, as: 'customer' }],
    });
    if (!quote) { res.status(404).json({ error: 'Devis introuvable.' }); return; }

    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const pdf = await generateQuotePdf(quote, quote.get('lignes') as QuoteLine[], quote.get('customer') as Customer, company);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${quote.numero}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur getQuotePdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/quotes/export
export const exportQuotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const quotes = await Quote.findAll({
      where: { companyId },
      include: [{ model: Customer, as: 'customer', attributes: ['nom'] }],
      order: [['createdAt', 'ASC']],
    });

    const csv = toCsv(quotes, [
      { header: 'Numéro', value: (q) => q.numero },
      { header: 'Client', value: (q) => (q.get('customer') as Customer)?.nom },
      { header: 'Statut', value: (q) => q.statut },
      { header: 'Date de validité', value: (q) => (q.dateValidite ? String(q.dateValidite) : '') },
      { header: 'Sous-total', value: (q) => q.sousTotal },
      { header: 'Taxes', value: (q) => q.totalTaxes },
      { header: 'Total TTC', value: (q) => q.totalTTC },
      { header: 'Créé le', value: (q) => q.createdAt?.toISOString().slice(0, 10) },
    ]);
    sendCsv(res, 'devis.csv', csv);
  } catch (error) {
    console.error('Erreur exportQuotes :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
