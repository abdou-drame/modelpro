import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { toCsv, sendCsv } from '../services/csvExportService';
import { recordCompanyActivity } from '../services/auditService';

const CUSTOMER_TYPES = ['particulier', 'entreprise'] as const;

// Signale les doublons probables (même téléphone ou même email dans la même entreprise) sans
// jamais bloquer la création — cf. ROADMAP_BACKEND.md ("recherche et détection de doublons").
const findPossibleDuplicates = async (companyId: number, telephone?: string | null, email?: string | null) => {
  const conditions: any[] = [];
  if (telephone) conditions.push({ telephone });
  if (email) conditions.push({ email });
  if (conditions.length === 0) return [];

  return Customer.findAll({
    where: { companyId, [Op.or]: conditions },
    attributes: ['id', 'nom', 'telephone', 'email', 'statut'],
    limit: 5,
  });
};

// GET /api/v1/crm/customers/check-duplicate?telephone=&email=
export const checkDuplicate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { telephone, email } = req.query;
    const duplicates = await findPossibleDuplicates(
      companyId,
      telephone ? String(telephone) : null,
      email ? String(email) : null
    );
    res.status(200).json({ duplicates });
  } catch (error) {
    console.error('Erreur checkDuplicate :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/customers
export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { nom, type, statut, email, telephone, adresse, segment, notes, assignedToUserId } = req.body;

    if (!nom) {
      res.status(400).json({ error: 'nom requis.' });
      return;
    }
    if (type && !CUSTOMER_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${CUSTOMER_TYPES.join(', ')}` });
      return;
    }
    if (statut && statut !== 'prospect' && statut !== 'client') {
      res.status(400).json({ error: "statut invalide. Valeurs acceptées : prospect, client" });
      return;
    }

    const duplicates = await findPossibleDuplicates(companyId, telephone, email);

    const customer = await Customer.create({
      companyId,
      nom,
      type: type || 'entreprise',
      statut: statut || 'prospect',
      email: email || null,
      telephone: telephone || null,
      adresse: adresse || null,
      segment: segment || null,
      notes: notes || null,
      assignedToUserId: assignedToUserId || null,
      convertedAt: statut === 'client' ? new Date() : null,
    });
    await recordCompanyActivity(req, 'client.cree', 'Customer', customer.id, { nom: customer.nom, statut: customer.statut });

    res.status(201).json({
      customer,
      warnings: duplicates.length > 0 ? { possibleDuplicates: duplicates } : undefined,
    });
  } catch (error) {
    console.error('Erreur createCustomer :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création.' });
  }
};

// GET /api/v1/crm/customers?statut=&segment=&search=&page=&limit=
export const listCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, segment, search, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (statut === 'prospect' || statut === 'client') where.statut = statut;
    if (segment) where.segment = segment;

    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      const s = `%${String(search).trim()}%`;
      where[Op.or] = [
        { nom: { [likeOp]: s } },
        { telephone: { [likeOp]: s } },
        { email: { [likeOp]: s } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Customer.findAndCountAll({
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
    console.error('Erreur listCustomers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la recherche.' });
  }
};

// GET /api/v1/crm/customers/:id
export const getCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customer = await Customer.findOne({
      where: { id: Number(req.params.id), companyId },
      include: [{ model: Contact, as: 'contacts' }],
    });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }
    res.status(200).json(customer);
  } catch (error) {
    console.error('Erreur getCustomer :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/customers/:id
export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customer = await Customer.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    const { nom, type, email, telephone, adresse, segment, notes, assignedToUserId } = req.body;
    if (type && !CUSTOMER_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${CUSTOMER_TYPES.join(', ')}` });
      return;
    }

    if (nom !== undefined) customer.nom = nom;
    if (type !== undefined) customer.type = type;
    if (email !== undefined) customer.email = email;
    if (telephone !== undefined) customer.telephone = telephone;
    if (adresse !== undefined) customer.adresse = adresse;
    if (segment !== undefined) customer.segment = segment;
    if (notes !== undefined) customer.notes = notes;
    if (assignedToUserId !== undefined) customer.assignedToUserId = assignedToUserId;
    await customer.save();

    res.status(200).json(customer);
  } catch (error) {
    console.error('Erreur updateCustomer :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/customers/:id/convert — prospect → client, sans ressaisie.
export const convertToClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customer = await Customer.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    if (customer.statut === 'client') {
      res.status(400).json({ error: 'Ce prospect est déjà client.' });
      return;
    }

    customer.statut = 'client';
    customer.convertedAt = new Date();
    await customer.save();
    await recordCompanyActivity(req, 'prospect.converti', 'Customer', customer.id, { nom: customer.nom });

    res.status(200).json(customer);
  } catch (error) {
    console.error('Erreur convertToClient :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/customers/export — export CSV/Excel (ROADMAP_BACKEND.md §7.6)
export const exportCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customers = await Customer.findAll({ where: { companyId }, order: [['createdAt', 'ASC']] });

    const csv = toCsv(customers, [
      { header: 'Nom', value: (c) => c.nom },
      { header: 'Type', value: (c) => c.type },
      { header: 'Statut', value: (c) => c.statut },
      { header: 'Téléphone', value: (c) => c.telephone },
      { header: 'Email', value: (c) => c.email },
      { header: 'Adresse', value: (c) => c.adresse },
      { header: 'Segment', value: (c) => c.segment },
      { header: 'Créé le', value: (c) => c.createdAt?.toISOString().slice(0, 10) },
    ]);
    sendCsv(res, 'clients-prospects.csv', csv);
  } catch (error) {
    console.error('Erreur exportCustomers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'export.' });
  }
};
