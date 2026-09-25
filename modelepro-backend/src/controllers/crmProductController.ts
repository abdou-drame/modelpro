import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Product } from '../models/Product';
import { toCsv, sendCsv } from '../services/csvExportService';
import { hasFeature, PLAN_FEATURE_KEYS } from '../services/subscriptionService';

const PRODUCT_TYPES = ['produit', 'service'] as const;

// POST /api/v1/crm/products
export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { reference, nom, description, type, categorie, prixUnitaire, tauxTaxe, unite, disponible, variantes } = req.body;

    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }
    if (type && !PRODUCT_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${PRODUCT_TYPES.join(', ')}` });
      return;
    }
    // "Variantes produits" réservé à partir du Pro (cahier NAATALIX_Formules_Fonctionnalites.docx,
    // 2026-09-24). Gate au niveau du champ (pas de la route) : le catalogue de base reste
    // accessible dès l'Essentiel, seul l'ajout de variantes est bloqué.
    if (variantes && !(await hasFeature(companyId, PLAN_FEATURE_KEYS.VARIANTES_PRODUITS))) {
      res.status(403).json({ code: 'FEATURE_NOT_IN_PLAN', error: 'Les variantes produits ne sont pas incluses dans votre formule d\'abonnement.' });
      return;
    }

    const product = await Product.create({
      companyId,
      reference: reference || null,
      nom,
      description: description || null,
      type: type || 'produit',
      categorie: categorie || null,
      prixUnitaire: prixUnitaire !== undefined ? Number(prixUnitaire) : 0,
      tauxTaxe: tauxTaxe !== undefined ? Number(tauxTaxe) : 0,
      unite: unite || null,
      disponible: disponible !== undefined ? Boolean(disponible) : true,
      variantes: variantes ? JSON.stringify(variantes) : null,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Erreur createProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/products?type=&categorie=&statut=&disponible=&search=&page=&limit=
export const listProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { type, categorie, statut, disponible, search, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (type === 'produit' || type === 'service') where.type = type;
    if (categorie) where.categorie = categorie;
    if (statut === 'actif' || statut === 'inactif') where.statut = statut;
    if (disponible !== undefined) where.disponible = disponible === 'true';

    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      const s = `%${String(search).trim()}%`;
      where[Op.or] = [
        { nom: { [likeOp]: s } },
        { reference: { [likeOp]: s } },
        { categorie: { [likeOp]: s } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Product.findAndCountAll({
      where,
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
    console.error('Erreur listProducts :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/products/:id
export const getProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }
    res.status(200).json(product);
  } catch (error) {
    console.error('Erreur getProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/products/:id
export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const product = await Product.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }

    const { reference, nom, description, type, categorie, prixUnitaire, tauxTaxe, unite, statut, disponible, variantes } = req.body;
    if (type && !PRODUCT_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${PRODUCT_TYPES.join(', ')}` });
      return;
    }
    if (statut && statut !== 'actif' && statut !== 'inactif') {
      res.status(400).json({ error: 'statut invalide. Valeurs acceptées : actif, inactif' });
      return;
    }
    if (variantes && !(await hasFeature(companyId, PLAN_FEATURE_KEYS.VARIANTES_PRODUITS))) {
      res.status(403).json({ code: 'FEATURE_NOT_IN_PLAN', error: 'Les variantes produits ne sont pas incluses dans votre formule d\'abonnement.' });
      return;
    }

    if (reference !== undefined) product.reference = reference;
    if (nom !== undefined) product.nom = nom;
    if (description !== undefined) product.description = description;
    if (type !== undefined) product.type = type;
    if (categorie !== undefined) product.categorie = categorie;
    if (prixUnitaire !== undefined) product.prixUnitaire = Number(prixUnitaire);
    if (tauxTaxe !== undefined) product.tauxTaxe = Number(tauxTaxe);
    if (unite !== undefined) product.unite = unite;
    if (statut !== undefined) product.statut = statut;
    if (disponible !== undefined) product.disponible = Boolean(disponible);
    if (variantes !== undefined) product.variantes = variantes ? JSON.stringify(variantes) : null;
    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error('Erreur updateProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/products/export
export const exportProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const products = await Product.findAll({ where: { companyId }, order: [['createdAt', 'ASC']] });

    const csv = toCsv(products, [
      { header: 'Référence', value: (p) => p.reference },
      { header: 'Nom', value: (p) => p.nom },
      { header: 'Type', value: (p) => p.type },
      { header: 'Catégorie', value: (p) => p.categorie },
      { header: 'Prix unitaire', value: (p) => p.prixUnitaire },
      { header: 'Taux taxe (%)', value: (p) => p.tauxTaxe },
      { header: 'Unité', value: (p) => p.unite },
      { header: 'Statut', value: (p) => p.statut },
      { header: 'Disponible', value: (p) => (p.disponible ? 'oui' : 'non') },
    ]);
    sendCsv(res, 'catalogue-produits.csv', csv);
  } catch (error) {
    console.error('Erreur exportProducts :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
