import { Response } from 'express';
import { Transaction } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { PurchaseOrderLine } from '../models/PurchaseOrderLine';
import { PurchaseOrderPayment } from '../models/PurchaseOrderPayment';
import { Supplier } from '../models/Supplier';
import { SupplierContact } from '../models/SupplierContact';
import { Product } from '../models/Product';
import { nextDocumentNumber } from '../services/documentNumberingService';
import { Site } from '../models/Site';
import { applyStockMovement } from '../services/stockService';
import { Company } from '../models/Company';
import { generatePurchaseOrderPdf } from '../services/documentPdfGenerators';
import { toCsv, sendCsv } from '../services/csvExportService';
import { recordCompanyActivity } from '../services/auditService';
import { resolveSiteId } from '../services/siteService';

const ORDER_STATUSES = ['brouillon', 'envoyee', 'confirmee', 'recue', 'annulee'] as const;
const PAYMENT_MEANS = ['especes', 'virement', 'cheque', 'mobile_money', 'autre'] as const;
const EPSILON = 0.01;

const computeLineTotals = (line: { quantite: number; prixUnitaire: number; remisePct: number; tauxTaxe: number }) => {
  const brut = line.quantite * line.prixUnitaire;
  const remiseMontant = brut * (line.remisePct / 100);
  const totalLigneHT = brut - remiseMontant;
  const totalLigneTTC = totalLigneHT * (1 + line.tauxTaxe / 100);
  return { totalLigneHT, totalLigneTTC };
};

const recalculateOrderPayments = async (order: PurchaseOrder, transaction?: Transaction, save = true): Promise<void> => {
  const payments = await PurchaseOrderPayment.findAll({ where: { purchaseOrderId: order.id }, transaction });
  const montantPaye = payments.reduce((sum, p) => sum + p.montant, 0);
  order.montantPaye = montantPaye;
  order.soldeRestant = Math.max(0, order.totalTTC - montantPaye);
  if (save) await order.save({ transaction });
};

const recalculateOrderTotals = async (order: PurchaseOrder, transaction?: Transaction): Promise<void> => {
  const lines = await PurchaseOrderLine.findAll({ where: { purchaseOrderId: order.id }, transaction });
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
  await recalculateOrderPayments(order, transaction, false);
  await order.save({ transaction });
};

const appendHistory = (order: PurchaseOrder, statut: string, userId: number) => {
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

// POST /api/v1/crm/purchase-orders
export const createPurchaseOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { supplierId, contactId, siteId, dateEcheance, notes, remiseGlobale, lines } = req.body;

    if (!supplierId) { res.status(400).json({ error: 'supplierId requis.' }); return; }

    const supplier = await Supplier.findOne({ where: { id: Number(supplierId), companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    if (contactId) {
      const contact = await SupplierContact.findOne({ where: { id: Number(contactId), companyId, supplierId: supplier.id } });
      if (!contact) { res.status(404).json({ error: 'Contact introuvable pour ce fournisseur.' }); return; }
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

    const resolvedSiteId = await resolveSiteId(companyId, siteId);

    const order = await sequelize.transaction(async (t) => {
      const numero = await nextDocumentNumber(companyId, 'ACH', t);

      const order = await PurchaseOrder.create({
        companyId,
        numero,
        supplierId: supplier.id,
        contactId: contactId || null,
        siteId: resolvedSiteId,
        dateEcheance: dateEcheance || null,
        notes: notes || null,
        remiseGlobale: remiseGlobale !== undefined ? Number(remiseGlobale) : 0,
        createdByUserId: req.user!.id,
      }, { transaction: t });
      appendHistory(order, 'brouillon', req.user!.id);
      await order.save({ transaction: t });

      if (lineData.length > 0) {
        await PurchaseOrderLine.bulkCreate(lineData.map((l) => ({ ...l, purchaseOrderId: order.id })), { transaction: t });
      }

      await recalculateOrderTotals(order, t);
      return order;
    });

    const full = await PurchaseOrder.findByPk(order.id, { include: [{ model: PurchaseOrderLine, as: 'lignes' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createPurchaseOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la commande fournisseur.' });
  }
};

// GET /api/v1/crm/purchase-orders?statut=&supplierId=&page=&limit=
export const listPurchaseOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, supplierId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut && ORDER_STATUSES.includes(statut as any)) where.statut = statut;
    if (supplierId) where.supplierId = Number(supplierId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'nom'] }],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listPurchaseOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/purchase-orders/:id — historique consultable (critère principal, avec l'isolation)
export const getPurchaseOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: SupplierContact, as: 'contact' },
        { model: PurchaseOrderLine, as: 'lignes', include: [{ model: Product, as: 'product', attributes: ['id', 'nom', 'reference'] }] },
        { model: PurchaseOrderPayment, as: 'paiements' },
      ],
    });
    if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }

    const lignesAvecTotaux = (order.get('lignes') as PurchaseOrderLine[]).map((l) => ({
      ...l.toJSON(),
      ...computeLineTotals(l),
    }));

    res.status(200).json({
      ...order.toJSON(),
      lignes: lignesAvecTotaux,
      historiqueStatuts: order.historiqueStatuts ? JSON.parse(order.historiqueStatuts) : [],
    });
  } catch (error) {
    console.error('Erreur getPurchaseOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const findEditableOrder = async (req: AuthenticatedRequest, res: Response): Promise<PurchaseOrder | null> => {
  const order = await PurchaseOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
  if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return null; }
  if (order.statut !== 'brouillon') {
    res.status(400).json({ error: `Commande non modifiable dans le statut "${order.statut}" (seul un brouillon peut être modifié).` });
    return null;
  }
  return order;
};

// PUT /api/v1/crm/purchase-orders/:id — brouillon uniquement
export const updatePurchaseOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const companyId = req.user!.companyId!;
    const { supplierId, contactId, dateEcheance, notes, remiseGlobale } = req.body;

    if (supplierId !== undefined) {
      const supplier = await Supplier.findOne({ where: { id: Number(supplierId), companyId } });
      if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }
      order.supplierId = supplier.id;
    }
    if (contactId !== undefined) order.contactId = contactId || null;
    if (dateEcheance !== undefined) order.dateEcheance = dateEcheance;
    if (notes !== undefined) order.notes = notes;
    if (remiseGlobale !== undefined) order.remiseGlobale = Number(remiseGlobale);

    await order.save();
    await recalculateOrderTotals(order);

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur updatePurchaseOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/purchase-orders/:id/lines — brouillon uniquement
export const addLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const companyId = req.user!.companyId!;
    const count = await PurchaseOrderLine.count({ where: { purchaseOrderId: order.id } });

    let lineData;
    try {
      lineData = await buildLineData(companyId, req.body, count);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Ligne invalide.' });
      return;
    }

    const line = await PurchaseOrderLine.create({ ...lineData, purchaseOrderId: order.id });
    await recalculateOrderTotals(order);

    res.status(201).json({ ...line.toJSON(), ...computeLineTotals(line) });
  } catch (error) {
    console.error('Erreur addLine (purchase order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/purchase-orders/:id/lines/:lineId — brouillon uniquement
export const updateLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const line = await PurchaseOrderLine.findOne({ where: { id: Number(req.params.lineId), purchaseOrderId: order.id } });
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
    console.error('Erreur updateLine (purchase order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/purchase-orders/:id/lines/:lineId — brouillon uniquement
export const deleteLine = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await findEditableOrder(req, res);
    if (!order) return;

    const line = await PurchaseOrderLine.findOne({ where: { id: Number(req.params.lineId), purchaseOrderId: order.id } });
    if (!line) { res.status(404).json({ error: 'Ligne introuvable.' }); return; }

    await line.destroy();
    await recalculateOrderTotals(order);

    res.status(200).json({ message: 'Ligne supprimée.', order });
  } catch (error) {
    console.error('Erreur deleteLine (purchase order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const transition = (allowedFrom: string[], to: PurchaseOrder['statut']) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const order = await PurchaseOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
      if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }

      if (!allowedFrom.includes(order.statut)) {
        res.status(400).json({ error: `Transition impossible depuis le statut "${order.statut}".` });
        return;
      }

      if (to === 'envoyee') {
        const linesCount = await PurchaseOrderLine.count({ where: { purchaseOrderId: order.id } });
        if (linesCount === 0) {
          res.status(400).json({ error: "Impossible d'envoyer une commande sans aucune ligne." });
          return;
        }
      }

      order.statut = to;
      appendHistory(order, to, req.user!.id);
      await order.save();
      await recordCompanyActivity(req, `commande_achat.${to}`, 'PurchaseOrder', order.id, { numero: order.numero });
      res.status(200).json(order);
    } catch (error) {
      console.error('Erreur transition commande fournisseur :', error);
      res.status(500).json({ error: 'Une erreur est survenue.' });
    }
  };
};

// PATCH /api/v1/crm/purchase-orders/:id/send
export const sendPurchaseOrder = transition(['brouillon'], 'envoyee');
// PATCH /api/v1/crm/purchase-orders/:id/confirm
export const confirmPurchaseOrder = transition(['envoyee'], 'confirmee');
// PATCH /api/v1/crm/purchase-orders/:id/receive — réception : crée une entrée de stock par
// ligne rattachée à un produit du catalogue (lien "achats → stock", ROADMAP_BACKEND.md §7.5),
// sur le site principal de l'entreprise. Les entrées n'ont aucune raison d'échouer pour stock
// négatif (elles augmentent toujours le stock).
export const receivePurchaseOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const order = await PurchaseOrder.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: PurchaseOrderLine, as: 'lignes' }],
    });
    if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }
    if (!['envoyee', 'confirmee'].includes(order.statut)) {
      res.status(400).json({ error: `Transition impossible depuis le statut "${order.statut}".` });
      return;
    }

    const site = await Site.findOne({ where: { companyId, estPrincipal: true } }) || await Site.findOne({ where: { companyId } });
    if (!site) { res.status(400).json({ error: 'Aucun site disponible pour réceptionner le stock.' }); return; }

    const lines = (order.get('lignes') as PurchaseOrderLine[]).filter((l) => l.productId);

    await sequelize.transaction(async (t) => {
      for (const line of lines) {
        await applyStockMovement({
          companyId,
          productId: line.productId!,
          siteId: site.id,
          type: 'entree',
          delta: line.quantite,
          coutUnitaire: line.prixUnitaire,
          motif: `Réception commande fournisseur ${order.numero}`,
          purchaseOrderId: order.id,
          createdByUserId: req.user!.id,
        }, t);
      }

      order.statut = 'recue';
      appendHistory(order, 'recue', req.user!.id);
      await order.save({ transaction: t });
    });

    await recordCompanyActivity(req, 'commande_achat.recue', 'PurchaseOrder', order.id, { numero: order.numero });
    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur receivePurchaseOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la réception.' });
  }
};
// PATCH /api/v1/crm/purchase-orders/:id/cancel
export const cancelPurchaseOrder = transition(['brouillon', 'envoyee', 'confirmee'], 'annulee');

// POST /api/v1/crm/purchase-orders/:id/payments — règlement fait au fournisseur.
export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }
    if (order.statut === 'brouillon' || order.statut === 'annulee') {
      res.status(400).json({ error: 'Impossible de régler une commande en brouillon ou annulée.' });
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
    if (montantNumber > order.soldeRestant + EPSILON) {
      res.status(400).json({ error: `Le montant dépasse le solde restant (${order.soldeRestant} FCFA).` });
      return;
    }

    const payment = await sequelize.transaction(async (t) => {
      const payment = await PurchaseOrderPayment.create({
        companyId: order.companyId,
        purchaseOrderId: order.id,
        montant: montantNumber,
        moyen: moyen || 'especes',
        datePaiement: datePaiement || new Date(),
        reference: reference || null,
        notes: notes || null,
        createdByUserId: req.user!.id,
      }, { transaction: t });

      await recalculateOrderPayments(order, t);
      return payment;
    });

    await recordCompanyActivity(req, 'commande_achat.paiement_enregistre', 'PurchaseOrder', order.id, { numero: order.numero, montant: montantNumber });
    res.status(201).json({ payment, order });
  } catch (error) {
    console.error('Erreur recordPayment (purchase order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du règlement.' });
  }
};

// GET /api/v1/crm/purchase-orders/:id/payments
export const listPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }

    const payments = await PurchaseOrderPayment.findAll({ where: { purchaseOrderId: order.id }, order: [['datePaiement', 'ASC']] });
    res.status(200).json(payments);
  } catch (error) {
    console.error('Erreur listPayments (purchase order) :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/purchase-orders/:id/pdf
export const getPurchaseOrderPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: PurchaseOrderLine, as: 'lignes' }, { model: Supplier, as: 'supplier' }],
    });
    if (!order) { res.status(404).json({ error: 'Commande fournisseur introuvable.' }); return; }

    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const pdf = await generatePurchaseOrderPdf(order, order.get('lignes') as PurchaseOrderLine[], order.get('supplier') as Supplier, company);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${order.numero}.pdf"` });
    res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur getPurchaseOrderPdf :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la génération du PDF.' });
  }
};

// GET /api/v1/crm/purchase-orders/export
export const exportPurchaseOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const orders = await PurchaseOrder.findAll({
      where: { companyId },
      include: [{ model: Supplier, as: 'supplier', attributes: ['nom'] }],
      order: [['createdAt', 'ASC']],
    });

    const csv = toCsv(orders, [
      { header: 'Numéro', value: (o) => o.numero },
      { header: 'Fournisseur', value: (o) => (o.get('supplier') as Supplier)?.nom },
      { header: 'Statut', value: (o) => o.statut },
      { header: 'Date de commande', value: (o) => String(o.dateCommande) },
      { header: 'Échéance', value: (o) => (o.dateEcheance ? String(o.dateEcheance) : '') },
      { header: 'Total TTC', value: (o) => o.totalTTC },
      { header: 'Montant payé', value: (o) => o.montantPaye },
      { header: 'Solde restant', value: (o) => o.soldeRestant },
    ]);
    sendCsv(res, 'commandes-fournisseurs.csv', csv);
  } catch (error) {
    console.error('Erreur exportPurchaseOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
