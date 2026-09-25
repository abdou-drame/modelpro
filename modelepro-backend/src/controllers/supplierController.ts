import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Supplier } from '../models/Supplier';
import { SupplierContact } from '../models/SupplierContact';
import { SupplierProduct } from '../models/SupplierProduct';
import { Product } from '../models/Product';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { toCsv, sendCsv } from '../services/csvExportService';

// POST /api/v1/crm/suppliers
export const createSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { nom, ninea, email, telephone, adresse, conditionsPaiement, notes } = req.body;
    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }

    const supplier = await Supplier.create({
      companyId, nom, ninea: ninea || null, email: email || null, telephone: telephone || null,
      adresse: adresse || null, conditionsPaiement: conditionsPaiement || null, notes: notes || null,
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error('Erreur createSupplier :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers?search=&statut=&page=&limit=
export const listSuppliers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { search, statut, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut === 'actif' || statut === 'inactif') where.statut = statut;
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      const s = `%${String(search).trim()}%`;
      where[Op.or] = [{ nom: { [likeOp]: s } }, { telephone: { [likeOp]: s } }, { email: { [likeOp]: s } }];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Supplier.findAndCountAll({
      where, limit: Number(limit), offset, order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listSuppliers :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers/:id
export const getSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: SupplierContact, as: 'contacts' },
        { model: SupplierProduct, as: 'produitsFournis', include: [{ model: Product, as: 'product', attributes: ['id', 'nom'] }] },
      ],
    });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }
    res.status(200).json(supplier);
  } catch (error) {
    console.error('Erreur getSupplier :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/suppliers/:id
export const updateSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const { nom, ninea, email, telephone, adresse, conditionsPaiement, notes, statut } = req.body;
    if (statut && statut !== 'actif' && statut !== 'inactif') {
      res.status(400).json({ error: 'statut invalide. Valeurs acceptées : actif, inactif' });
      return;
    }
    if (nom !== undefined) supplier.nom = nom;
    if (ninea !== undefined) supplier.ninea = ninea;
    if (email !== undefined) supplier.email = email;
    if (telephone !== undefined) supplier.telephone = telephone;
    if (adresse !== undefined) supplier.adresse = adresse;
    if (conditionsPaiement !== undefined) supplier.conditionsPaiement = conditionsPaiement;
    if (notes !== undefined) supplier.notes = notes;
    if (statut !== undefined) supplier.statut = statut;
    await supplier.save();

    res.status(200).json(supplier);
  } catch (error) {
    console.error('Erreur updateSupplier :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers/:id/statement — historique et solde (ce que l'entreprise doit à ce fournisseur)
export const getSupplierStatement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const supplier = await Supplier.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const orders = await PurchaseOrder.findAll({
      where: { companyId, supplierId: supplier.id, statut: { [Op.ne]: 'annulee' } },
      order: [['dateCommande', 'ASC']],
    });

    let totalAchats = 0;
    let totalPaye = 0;
    for (const o of orders) {
      totalAchats += o.totalTTC;
      totalPaye += o.montantPaye;
    }
    const soldeDu = Math.max(0, totalAchats - totalPaye);

    res.status(200).json({
      supplier: { id: supplier.id, nom: supplier.nom },
      totalAchats,
      totalPaye,
      soldeDu,
      commandes: orders,
    });
  } catch (error) {
    console.error('Erreur getSupplierStatement :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Contacts fournisseur ---

// POST /api/v1/crm/suppliers/:supplierId/contacts
export const createSupplierContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const supplierId = Number(req.params.supplierId);
    const supplier = await Supplier.findOne({ where: { id: supplierId, companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const { nom, prenom, fonction, email, telephone, notes } = req.body;
    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }

    const contact = await SupplierContact.create({
      companyId, supplierId, nom, prenom: prenom || null, fonction: fonction || null,
      email: email || null, telephone: telephone || null, notes: notes || null,
    });
    res.status(201).json(contact);
  } catch (error) {
    console.error('Erreur createSupplierContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers/:supplierId/contacts
export const listSupplierContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const supplierId = Number(req.params.supplierId);
    const supplier = await Supplier.findOne({ where: { id: supplierId, companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const contacts = await SupplierContact.findAll({ where: { supplierId, companyId }, order: [['createdAt', 'ASC']] });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Erreur listSupplierContacts :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/supplier-contacts/:id
export const updateSupplierContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contact = await SupplierContact.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!contact) { res.status(404).json({ error: 'Contact introuvable.' }); return; }

    const { nom, prenom, fonction, email, telephone, notes } = req.body;
    if (nom !== undefined) contact.nom = nom;
    if (prenom !== undefined) contact.prenom = prenom;
    if (fonction !== undefined) contact.fonction = fonction;
    if (email !== undefined) contact.email = email;
    if (telephone !== undefined) contact.telephone = telephone;
    if (notes !== undefined) contact.notes = notes;
    await contact.save();

    res.status(200).json(contact);
  } catch (error) {
    console.error('Erreur updateSupplierContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/supplier-contacts/:id
export const deleteSupplierContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contact = await SupplierContact.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!contact) { res.status(404).json({ error: 'Contact introuvable.' }); return; }
    await contact.destroy();
    res.status(200).json({ message: 'Contact supprimé.' });
  } catch (error) {
    console.error('Erreur deleteSupplierContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Produits fournis ---

// POST /api/v1/crm/suppliers/:supplierId/products
export const linkSupplierProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const supplierId = Number(req.params.supplierId);
    const supplier = await Supplier.findOne({ where: { id: supplierId, companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const { productId, prixAchat, referenceFournisseur, delaiLivraison, notes } = req.body;
    if (!productId) { res.status(400).json({ error: 'productId requis.' }); return; }

    const product = await Product.findOne({ where: { id: Number(productId), companyId } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }

    const existing = await SupplierProduct.findOne({ where: { supplierId, productId: product.id } });
    if (existing) {
      res.status(400).json({ error: 'Ce produit est déjà associé à ce fournisseur.', supplierProductId: existing.id });
      return;
    }

    const link = await SupplierProduct.create({
      companyId, supplierId, productId: product.id,
      prixAchat: prixAchat !== undefined ? Number(prixAchat) : 0,
      referenceFournisseur: referenceFournisseur || null,
      delaiLivraison: delaiLivraison || null,
      notes: notes || null,
    });
    res.status(201).json(link);
  } catch (error) {
    console.error('Erreur linkSupplierProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers/:supplierId/products
export const listSupplierProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const supplierId = Number(req.params.supplierId);
    const supplier = await Supplier.findOne({ where: { id: supplierId, companyId } });
    if (!supplier) { res.status(404).json({ error: 'Fournisseur introuvable.' }); return; }

    const links = await SupplierProduct.findAll({
      where: { supplierId, companyId },
      include: [{ model: Product, as: 'product' }],
      order: [['createdAt', 'ASC']],
    });
    res.status(200).json(links);
  } catch (error) {
    console.error('Erreur listSupplierProducts :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/supplier-products/:id
export const updateSupplierProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const link = await SupplierProduct.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!link) { res.status(404).json({ error: 'Association introuvable.' }); return; }

    const { prixAchat, referenceFournisseur, delaiLivraison, notes } = req.body;
    if (prixAchat !== undefined) link.prixAchat = Number(prixAchat);
    if (referenceFournisseur !== undefined) link.referenceFournisseur = referenceFournisseur;
    if (delaiLivraison !== undefined) link.delaiLivraison = delaiLivraison;
    if (notes !== undefined) link.notes = notes;
    await link.save();

    res.status(200).json(link);
  } catch (error) {
    console.error('Erreur updateSupplierProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/supplier-products/:id
export const deleteSupplierProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const link = await SupplierProduct.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!link) { res.status(404).json({ error: 'Association introuvable.' }); return; }
    await link.destroy();
    res.status(200).json({ message: 'Association supprimée.' });
  } catch (error) {
    console.error('Erreur deleteSupplierProduct :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/suppliers/export
export const exportSuppliers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const suppliers = await Supplier.findAll({ where: { companyId }, order: [['createdAt', 'ASC']] });

    const csv = toCsv(suppliers, [
      { header: 'Nom', value: (s) => s.nom },
      { header: 'NINEA', value: (s) => s.ninea },
      { header: 'Téléphone', value: (s) => s.telephone },
      { header: 'Email', value: (s) => s.email },
      { header: 'Adresse', value: (s) => s.adresse },
      { header: 'Conditions de paiement', value: (s) => s.conditionsPaiement },
      { header: 'Statut', value: (s) => s.statut },
    ]);
    sendCsv(res, 'fournisseurs.csv', csv);
  } catch (error) {
    console.error('Erreur exportSuppliers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
