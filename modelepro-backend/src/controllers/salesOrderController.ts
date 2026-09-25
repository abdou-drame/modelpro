import { Response } from 'express';
import { Transaction } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderLine } from '../models/SalesOrderLine';
import { Quote } from '../models/Quote';
import { QuoteLine } from '../models/QuoteLine';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { Product } from '../models/Product';
import { nextDocumentNumber } from '../services/documentNumberingService';
import { Site } from '../models/Site';
import { applyStockMovement, StockNegativeError } from '../services/stockService';
import { Company } from '../models/Company';
import { generateSalesOrderPdf } from '../services/documentPdfGenerators';
import { toCsv, sendCsv } from '../services/csvExportService';
import { recordCompanyActivity } from '../services/auditService';

const ORDER_STATUSES = ['brouillon', 'confirmee', 'en_preparation', 'livree', 'annulee'] as const;

// "sans permission explicite" (critère principal du module Stocks) : seul companyRole 'admin',
// avec un forcerStockNegatif explicite dans la requête, peut autoriser une livraison à créer un
// stock négatif.
const canForceNegative = (req: AuthenticatedRequest): boolean =>
  req.user?.companyRole === 'admin' && req.body?.forcerStockNegatif === true;

const computeLineTotals = (line: { quantite: number; prixUnitaire: number; remisePct: number; tauxTaxe: number }) => {
  const brut = line.quantite * line.prixUnitaire;
  const remiseMontant = brut * (line.remisePct / 100);
  const totalLigneHT = brut - remiseMontant;
  const totalLigneTTC = totalLigneHT * (1 + line.tauxTaxe / 100);
  return { totalLigneHT, totalLigneTTC };
};

// Même logique que quoteController.recalculateQuoteTotals — voir sa note pour le choix de
// remiseGlobale appliquée au TTC final plutôt qu'à la base taxable.
const recalculateOrderTotals = async (order: SalesOrder, transaction?: Transaction): Promise<void> => {
  const lines = await SalesOrderLine.findAll({ where: { salesOrderId: order.id }, transaction });
  let sousTotal = 0;
  let totalTaxes = 0;
  for (const line of lines) {
    const { totalLigneHT, totalLigneTTC } = computeLineTotals(line);
    sousTotal += totalLigneHT;
    totalTaxes += totalLigneTTC - totalLigneHT;
  }
  order.sousTotal = sousTotal;
  order.totalTaxes = totalTaxes;
  order.totalTTC = Math.max(0, sousTotal + totalTaxes - order.remiseGlobale);
  await order.save({ transaction });
};

const appendHistory = (order: SalesOrder, statut: string, userId: number) => {
  const history = order.historiqueStatuts ? JSON.parse(order.historiqueStatuts) : [];
  history.push({ statut, date: new Date().toISOString(), userId });
  order.historiqueStatuts = JSON.stringify(history);
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

// POST /api/v1/crm/orders — création manuelle (hors conversion devis)
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { customerId, contactId, dateLivraisonPrevue, notes, remiseGlobale, lines } = req.body;

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

    const order = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'CMD', t);

      const order = await SalesOrder.create({
        companyId,
        numero,
        customerId: customer.id,
        contactId: contactId || null,
        dateLivraisonPrevue: dateLivraisonPrevue || null,
        notes: notes || null,
        remiseGlobale: remiseGlobale !== undefined ? Number(remiseGlobale) : 0,
        createdByUserId: req.user!.id,
      }, { transaction: t });
      appendHistory(order, 'brouillon', req.user!.id);
      await order.save({ transaction: t });

      if (lineData.length > 0) {
        await SalesOrderLine.bulkCreate(lineData.map((l) => ({ ...l, salesOrderId: order.id })), { transaction: t });
      }

      await recalculateOrderTotals(order, t);
      return order;
    });

    const full = await SalesOrder.findByPk(order.id, { include: [{ model: SalesOrderLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la commande.' });
  }
};

// POST /api/v1/crm/quotes/:id/convert-to-order — critère principal : sans ressaisie des lignes.
export const convertQuoteToOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const quote = await Quote.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: QuoteLine, as: 'lignes' }],
    });
    if (!quote) { res.status(404).json({ error: 'Devis introuvable.' }); return; }

    if (quote.statut !== 'accepte') {
      res.status(400).json({ error: 'Seul un devis accepté peut être converti en commande.' });
      return;
    }

    const existing = await SalesOrder.findOne({ where: { quoteId: quote.id } });
    if (existing) {
      res.status(400).json({ error: 'Ce devis a déjà été converti en commande.', orderId: existing.id });
      return;
    }

    const quoteLines = quote.get('lignes') as QuoteLine[];

    const order = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'CMD', t);

      const order = await SalesOrder.create({
        companyId,
        numero,
        customerId: quote.customerId,
        contactId: quote.contactId,
        quoteId: quote.id,
        statut: 'confirmee',
        notes: quote.notes,
        remiseGlobale: quote.remiseGlobale,
        createdByUserId: req.user!.id,
      }, { transaction: t });
      appendHistory(order, 'confirmee', req.user!.id);
      await order.save({ transaction: t });

      if (quoteLines.length > 0) {
        await SalesOrderLine.bulkCreate(
          quoteLines.map((l) => ({
            salesOrderId: order.id,
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

      await recalculateOrderTotals(order, t);
      return order;
    });

    const full = await SalesOrder.findByPk(order.id, { include: [{ model: SalesOrderLine, as: 'lignes' }] });
    await recordCompanyActivity(req, 'devis.transforme_en_commande', 'SalesOrder', order.id, { numeroCommande: order.numero, numeroDevis: quote.numero });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur convertQuoteToOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la conversion.' });
  }
};

// GET /api/v1/crm/orders?statut=&customerId=&page=&limit=
export const listOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, customerId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut && ORDER_STATUSES.includes(statut as any)) where.statut = statut;
    if (customerId) where.customerId = Number(customerId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await SalesOrder.findAndCountAll({
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
    console.error('Erreur listOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/orders/:id
export const getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await SalesOrder.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: Customer, as: 'customer' },
        { model: Contact, as: 'contact' },
        { model: Quote, as: 'quote', attributes: ['id', 'numero'] },
        { model: SalesOrderLine, as: 'lignes', include: [{ model: Product, as: 'product', attributes: ['id', 'nom', 'reference'] }] },
      ],
    });
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }

    const lignesAvecTotaux = (order.get('lignes') as SalesOrderLine[]).map((l) => ({
      ...l.toJSON(),
      ...computeLineTotals(l),
    }));

    res.status(200).json({
      ...order.toJSON(),
      lignes: lignesAvecTotaux,
      historiqueStatuts: order.historiqueStatuts ? JSON.parse(order.historiqueStatuts) : [],
    });
  } catch (error) {
    console.error('Erreur getOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const findEditableOrder = async (req: AuthenticatedRequest, res: Response): Promise<SalesOrder | null> => {
  const order = await SalesOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
  if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return null; }
  if (order.statut !== 'brouillon') {
    res.status(400).json({ error: `Commande non modifiable dans le statut "${order.statut}" (seul un brouillon peut être modifié).` });
    return null;
  }
  return order;
};

// PUT /api/v1/crm/orders/:id — brouillon uniquement
export const updateOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const companyId = req.user!.companyId!;
    const { customerId, contactId, dateLivraisonPrevue, notes, remiseGlobale } = req.body;

    if (customerId !== undefined) {
      const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
      if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }
      order.customerId = customer.id;
    }
    if (contactId !== undefined) order.contactId = contactId || null;
    if (dateLivraisonPrevue !== undefined) order.dateLivraisonPrevue = dateLivraisonPrevue;
    if (notes !== undefined) order.notes = notes;
    if (remiseGlobale !== undefined) order.remiseGlobale = Number(remiseGlobale);

    await order.save();
    await recalculateOrderTotals(order);

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur updateOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/orders/:id/lines — brouillon uniquement
export const addLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const companyId = req.user!.companyId!;
    const count = await SalesOrderLine.count({ where: { salesOrderId: order.id } });

    let lineData;
    try {
      lineData = await buildLineData(companyId, req.body, count);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
      return;
    }

    const line = await SalesOrderLine.create({ ...lineData, salesOrderId: order.id });
    await recalculateOrderTotals(order);

    res.status(201).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur addLine (order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/orders/:id/lines/:lineId — brouillon uniquement
export const updateLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const line = await SalesOrderLine.findOne({ where: { id: Number(req.params.lineId), salesOrderId: order.id } });
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

    await recalculateOrderTotals(order);

    res.status(200).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur updateLine (order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/orders/:id/lines/:lineId — brouillon uniquement
export const deleteLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const line = await SalesOrderLine.findOne({ where: { id: Number(req.params.lineId), salesOrderId: order.id } });
    if (!line) { res.status(404).json({ error: 'Ligne introuvable.' }); return; }

    await line.destroy();
    await recalculateOrderTotals(order);

    res.status(200).json({ message: 'Ligne supprimée.', order });
  } catch (error) {
    console.error('Erreur deleteLine (order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const transition = (allowedFrom: string[], to: SalesOrder['statut']) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const order = await SalesOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
      if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }

      if (!allowedFrom.includes(order.statut)) {
        res.status(400).json({ error: `Transition impossible depuis le statut "${order.statut}".` });
        return;
      }

      order.statut = to;
      appendHistory(order, to, req.user!.id);
      await order.save();
      await recordCompanyActivity(req, `commande.${to}`, 'SalesOrder', order.id, { numero: order.numero });
      res.status(200).json(order);
    } catch (error) {
      console.error('Erreur transition commande :', error);
      res.status(500).json({ error: 'Une erreur est survenue.' });
    }
  };
};

// PATCH /api/v1/crm/orders/:id/confirm
export const confirmOrder = transition(['brouillon'], 'confirmee');
// PATCH /api/v1/crm/orders/:id/start-preparation
export const startPreparationOrder = transition(['confirmee'], 'en_preparation');
// PATCH /api/v1/crm/orders/:id/deliver — livraison : crée une sortie de stock par ligne
// rattachée à un produit du catalogue (lien "ventes → stock", ROADMAP_BACKEND.md §7.5), sur le
// site principal de l'entreprise. Bloquée si une sortie créerait un stock négatif, sauf
// forcerStockNegatif explicite (companyRole admin) — toute la livraison est annulée si une seule
// ligne échoue (transaction).
export const deliverOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const order = await SalesOrder.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: SalesOrderLine, as: 'lignes' }],
    });
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }
    if (!['confirmee', 'en_preparation'].includes(order.statut)) {
      res.status(400).json({ error: `Transition impossible depuis le statut "${order.statut}".` });
      return;
    }

    const site = await Site.findOne({ where: { companyId, estPrincipal: true } }) || await Site.findOne({ where: { companyId } });
    if (!site) { res.status(400).json({ error: 'Aucun site disponible pour la sortie de stock.' }); return; }

    const lines = (order.get('lignes') as SalesOrderLine[]).filter((l) => l.productId);

    try {
      await sequelize.transaction(async (t) => {
        for (const line of lines) {
          await applyStockMovement({
            companyId,
            productId: line.productId!,
            siteId: site.id,
            type: 'sortie',
            delta: -line.quantite,
            motif: `Livraison commande ${order.numero}`,
            salesOrderId: order.id,
            createdByUserId: req.user!.id,
            forcerStockNegatif: canForceNegative(req),
          }, t);
        }

        order.statut = 'livree';
        appendHistory(order, 'livree', req.user!.id);
        await order.save({ transaction: t });
      });
    } catch (e) {
      if (e instanceof StockNegativeError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }

    await recordCompanyActivity(req, 'commande.livree', 'SalesOrder', order.id, { numero: order.numero });
    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur deliverOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la livraison.' });
  }
};
// PATCH /api/v1/crm/orders/:id/cancel
export const cancelOrder = transition(['brouillon', 'confirmee', 'en_preparation'], 'annulee');

const renderOrderPdf = async (req: AuthenticatedRequest, res: Response, mode: 'commande' | 'livraison'): Promise<void> => {
  try {
    const order = await SalesOrder.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: SalesOrderLine, as: 'lignes' }, { model: Customer, as: 'customer' }],
    });
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }
    if (mode === 'livraison' && order.statut === 'brouillon') {
      res.status(400).json({ error: 'Le bon de livraison n\'est disponible qu\'à partir du statut confirmée.' });
      return;
    }

    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const pdf = await generateSalesOrderPdf(order, order.get('lignes') as SalesOrderLine[], order.get('customer') as Customer, company, mode);
    const suffix = mode === 'livraison' ? 'BL' : 'BC';
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${order.numero}-${suffix}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur renderOrderPdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/orders/:id/pdf — bon de commande
export const getOrderPdf = (req: AuthenticatedRequest, res: Response) => renderOrderPdf(req, res, 'commande');
// GET /api/v1/crm/orders/:id/delivery-note — bon de livraison
export const getDeliveryNotePdf = (req: AuthenticatedRequest, res: Response) => renderOrderPdf(req, res, 'livraison');

// GET /api/v1/crm/orders/export
export const exportOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const orders = await SalesOrder.findAll({
      where: { companyId },
      include: [{ model: Customer, as: 'customer', attributes: ['nom'] }],
      order: [['createdAt', 'ASC']],
    });

    const csv = toCsv(orders, [
      { header: 'Numéro', value: (o) => o.numero },
      { header: 'Client', value: (o) => (o.get('customer') as Customer)?.nom },
      { header: 'Statut', value: (o) => o.statut },
      { header: 'Date de commande', value: (o) => String(o.dateCommande) },
      { header: 'Livraison prévue', value: (o) => (o.dateLivraisonPrevue ? String(o.dateLivraisonPrevue) : '') },
      { header: 'Total TTC', value: (o) => o.totalTTC },
    ]);
    sendCsv(res, 'commandes.csv', csv);
  } catch (error) {
    console.error('Erreur exportOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
