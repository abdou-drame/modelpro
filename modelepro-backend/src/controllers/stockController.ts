import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Site } from '../models/Site';
import { StockItem } from '../models/StockItem';
import { StockMovement } from '../models/StockMovement';
import { Product } from '../models/Product';
import { applyStockMovement, StockNegativeError } from '../services/stockService';
import { toCsv, sendCsv } from '../services/csvExportService';
import { checkQuota } from '../services/subscriptionService';
import { recordCompanyActivity } from '../services/auditService';

const MOVEMENT_TYPES = ['entree', 'sortie', 'ajustement'] as const;

// "sans permission explicite" (critère principal) : seul companyRole 'admin', avec un
// forcerStockNegatif explicite dans la requête, peut autoriser un stock négatif.
const canForceNegative = (req: AuthenticatedRequest): boolean =>
  req.user?.companyRole === 'admin' && req.body?.forcerStockNegatif === true;

// --- Sites ---

// POST /api/v1/crm/sites
export const createSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { nom, adresse } = req.body;
    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }

    const quota = await checkQuota(companyId, 'sites');
    if (!quota.ok) {
      res.status(403).json({
        code: 'QUOTA_EXCEEDED',
        error: `Quota de sites atteint (${quota.current}/${quota.max}) pour votre plan. Passez à un plan supérieur.`,
      });
      return;
    }

    const site = await Site.create({ companyId, nom, adresse: adresse || null });
    res.status(201).json(site);
  } catch (error) {
    console.error('Erreur createSite :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/sites
export const listSites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sites = await Site.findAll({ where: { companyId: req.user!.companyId! }, order: [['createdAt', 'ASC']] });
    res.status(200).json(sites);
  } catch (error) {
    console.error('Erreur listSites :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/sites/:id
export const updateSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const site = await Site.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!site) { res.status(404).json({ error: 'Site introuvable.' }); return; }

    const { nom, adresse, statut } = req.body;
    if (statut && statut !== 'actif' && statut !== 'inactif') {
      res.status(400).json({ error: 'statut invalide. Valeurs acceptées : actif, inactif' });
      return;
    }
    if (nom !== undefined) site.nom = nom;
    if (adresse !== undefined) site.adresse = adresse;
    if (statut !== undefined) site.statut = statut;
    await site.save();

    res.status(200).json(site);
  } catch (error) {
    console.error('Erreur updateSite :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Stock ---

// GET /api/v1/crm/stock?siteId=&productId=&page=&limit=
export const listStockItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { siteId, productId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (siteId) where.siteId = Number(siteId);
    if (productId) where.productId = Number(productId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await StockItem.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'nom', 'reference', 'unite'] },
        { model: Site, as: 'site', attributes: ['id', 'nom'] },
      ],
      limit: Number(limit),
      offset,
      order: [['updatedAt', 'DESC']],
    });

    const data = rows.map((item) => ({ ...item.toJSON(), valeurStock: item.quantite * item.coutMoyenPondere }));

    res.status(200).json({ data, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listStockItems :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/stock/alerts — produits sous le seuil d'alerte configuré.
export const listStockAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const items = await StockItem.findAll({
      where: {
        companyId,
        seuilAlerte: { [Op.ne]: null },
        quantite: { [Op.lte]: sequelize.col('seuil_alerte') },
      },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'nom', 'reference'] },
        { model: Site, as: 'site', attributes: ['id', 'nom'] },
      ],
    });
    res.status(200).json(items);
  } catch (error) {
    console.error('Erreur listStockAlerts :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/stock/valuation?siteId= — valorisation simple (Σ quantite × coutMoyenPondere)
export const getStockValuation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { siteId } = req.query;

    const where: any = { companyId };
    if (siteId) where.siteId = Number(siteId);

    const items = await StockItem.findAll({ where });
    const valeurTotale = items.reduce((sum, i) => sum + i.quantite * i.coutMoyenPondere, 0);
    const quantiteTotale = items.reduce((sum, i) => sum + i.quantite, 0);

    res.status(200).json({ nombreReferences: items.length, quantiteTotale, valeurTotale });
  } catch (error) {
    console.error('Erreur getStockValuation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/stock/:id/threshold — définit le seuil d'alerte d'un StockItem.
export const setThreshold = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const item = await StockItem.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!item) { res.status(404).json({ error: 'Ligne de stock introuvable.' }); return; }

    const { seuilAlerte } = req.body;
    item.seuilAlerte = seuilAlerte === null ? null : Number(seuilAlerte);
    await item.save();

    res.status(200).json(item);
  } catch (error) {
    console.error('Erreur setThreshold :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/stock/movements?productId=&siteId=&type=&page=&limit= — historique consultable
export const listMovements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { productId, siteId, type, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (productId) where.productId = Number(productId);
    if (siteId) where.siteId = Number(siteId);
    if (type) where.type = type;

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await StockMovement.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'nom'] },
        { model: Site, as: 'site', attributes: ['id', 'nom'] },
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listMovements :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/stock/movements — entrée / sortie / ajustement manuel.
export const createMovement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { productId, siteId, type, quantite, coutUnitaire, motif } = req.body;

    if (!productId || !siteId || !type) {
      res.status(400).json({ error: 'productId, siteId et type sont requis.' });
      return;
    }
    if (!MOVEMENT_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${MOVEMENT_TYPES.join(', ')}` });
      return;
    }
    const quantiteNumber = Number(quantite);
    if (!quantiteNumber) {
      res.status(400).json({ error: 'quantite requise (non nulle).' });
      return;
    }
    if ((type === 'entree' || type === 'sortie') && quantiteNumber <= 0) {
      res.status(400).json({ error: 'quantite doit être strictement positive pour une entrée ou une sortie.' });
      return;
    }

    const product = await Product.findOne({ where: { id: Number(productId), companyId } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }
    const site = await Site.findOne({ where: { id: Number(siteId), companyId } });
    if (!site) { res.status(404).json({ error: 'Site introuvable.' }); return; }

    // ajustement : le signe saisi est le delta lui-même. entrée : toujours positif. sortie :
    // toujours négatif (l'utilisateur saisit la quantité qui sort, positive).
    const delta = type === 'sortie' ? -quantiteNumber : quantiteNumber;

    try {
      const result = await sequelize.transaction(async (t) => {
        return applyStockMovement({
          companyId,
          productId: product.id,
          siteId: site.id,
          type,
          delta,
          coutUnitaire: type === 'entree' ? coutUnitaire : null,
          motif,
          createdByUserId: req.user!.id,
          forcerStockNegatif: canForceNegative(req),
        }, t);
      });
      await recordCompanyActivity(req, `stock.mouvement_${type}`, 'Product', product.id, { produit: product.nom, quantite: quantiteNumber, site: site.nom });
      res.status(201).json(result);
    } catch (e) {
      if (e instanceof StockNegativeError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }
  } catch (error) {
    console.error('Erreur createMovement :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du mouvement.' });
  }
};

// POST /api/v1/crm/stock/inventaire — inventaire : quantité physique comptée, delta calculé
// automatiquement (comptée - système).
export const recordInventaire = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { productId, siteId, quantitePhysique, motif } = req.body;

    if (!productId || !siteId || quantitePhysique === undefined) {
      res.status(400).json({ error: 'productId, siteId et quantitePhysique sont requis.' });
      return;
    }
    const quantitePhysiqueNumber = Number(quantitePhysique);
    if (quantitePhysiqueNumber < 0) {
      res.status(400).json({ error: 'quantitePhysique ne peut pas être négative.' });
      return;
    }

    const product = await Product.findOne({ where: { id: Number(productId), companyId } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }
    const site = await Site.findOne({ where: { id: Number(siteId), companyId } });
    if (!site) { res.status(404).json({ error: 'Site introuvable.' }); return; }

    const existing = await StockItem.findOne({ where: { companyId, productId: product.id, siteId: site.id } });
    const quantiteActuelle = existing?.quantite ?? 0;
    const delta = quantitePhysiqueNumber - quantiteActuelle;

    if (delta === 0) {
      res.status(200).json({ message: 'Aucun écart constaté, stock déjà à jour.', item: existing });
      return;
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        return applyStockMovement({
          companyId,
          productId: product.id,
          siteId: site.id,
          type: 'inventaire',
          delta,
          motif: motif || `Inventaire : ${quantiteActuelle} → ${quantitePhysiqueNumber}`,
          createdByUserId: req.user!.id,
          forcerStockNegatif: canForceNegative(req),
        }, t);
      });
      await recordCompanyActivity(req, 'stock.inventaire', 'Product', product.id, { produit: product.nom, avant: quantiteActuelle, apres: quantitePhysiqueNumber });
      res.status(201).json(result);
    } catch (e) {
      if (e instanceof StockNegativeError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }
  } catch (error) {
    console.error('Erreur recordInventaire :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'inventaire.' });
  }
};

// GET /api/v1/crm/stock/export
export const exportStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const items = await StockItem.findAll({
      where: { companyId },
      include: [
        { model: Product, as: 'product', attributes: ['nom', 'reference'] },
        { model: Site, as: 'site', attributes: ['nom'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const csv = toCsv(items, [
      { header: 'Produit', value: (i) => (i.get('product') as Product)?.nom },
      { header: 'Référence', value: (i) => (i.get('product') as Product)?.reference },
      { header: 'Site', value: (i) => (i.get('site') as Site)?.nom },
      { header: 'Quantité', value: (i) => i.quantite },
      { header: 'Seuil d\'alerte', value: (i) => i.seuilAlerte },
      { header: 'Coût moyen pondéré', value: (i) => i.coutMoyenPondere },
      { header: 'Valeur du stock', value: (i) => i.quantite * i.coutMoyenPondere },
    ]);
    sendCsv(res, 'stock.csv', csv);
  } catch (error) {
    console.error('Erreur exportStock :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
