import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { SupportTicket } from '../models/SupportTicket';
import { SupportTicketMessage } from '../models/SupportTicketMessage';
import { Company } from '../models/Company';
import { recordAudit } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const CATEGORIES = ['question', 'incident', 'facturation', 'integration', 'autre'] as const;
const PRIORITES = ['basse', 'normale', 'haute', 'critique'] as const;
const STATUTS = ['ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme'] as const;

// --- Côté entreprise (volontairement SANS enforceSubscription : une entreprise suspendue doit
// pouvoir contacter le support pour régulariser sa situation) ---

// POST /api/v1/support/tickets
export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sujet, message, categorie, priorite } = req.body;
    if (!sujet || !message) { res.status(400).json({ error: 'sujet et message requis.' }); return; }
    if (categorie && !CATEGORIES.includes(categorie)) { res.status(400).json({ error: `categorie invalide (${CATEGORIES.join('|')}).` }); return; }
    if (priorite && !PRIORITES.includes(priorite)) { res.status(400).json({ error: `priorite invalide (${PRIORITES.join('|')}).` }); return; }

    const ticket = await SupportTicket.create({
      companyId: req.user!.companyId!, createdByUserId: req.user!.id, sujet,
      categorie: categorie || 'question', priorite: priorite || 'normale',
    });
    await SupportTicketMessage.create({ ticketId: ticket.id, authorUserId: req.user!.id, authorType: 'company_user', message });
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Erreur createTicket :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/support/tickets?statut=
export const listMyTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: any = { companyId: req.user!.companyId! };
    if (req.query.statut && STATUTS.includes(req.query.statut as any)) where.statut = req.query.statut;
    res.status(200).json(await SupportTicket.findAll({ where, order: [['updatedAt', 'DESC']] }));
  } catch (error) {
    console.error('Erreur listMyTickets :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/support/tickets/:id — sans les notes internes du personnel
export const getMyTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: SupportTicketMessage, as: 'messages', where: { interne: false }, required: false }],
      order: [[{ model: SupportTicketMessage, as: 'messages' }, 'createdAt', 'ASC']],
    });
    if (!ticket) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Erreur getMyTicket :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/support/tickets/:id/messages
export const replyMyTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!ticket) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }
    if (ticket.statut === 'ferme') { res.status(400).json({ error: 'Ce ticket est fermé.' }); return; }
    if (!req.body.message) { res.status(400).json({ error: 'message requis.' }); return; }

    const message = await SupportTicketMessage.create({ ticketId: ticket.id, authorUserId: req.user!.id, authorType: 'company_user', message: req.body.message });
    if (ticket.statut === 'en_attente_client' || ticket.statut === 'resolu') { ticket.statut = 'en_cours'; ticket.resolvedAt = null; }
    ticket.changed('updatedAt', true);
    await ticket.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Erreur replyMyTicket :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Back-office (support + superadmin) ---

// GET /api/v1/backoffice/tickets?statut=&priorite=&companyId=&page=
export const listAllTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statut, priorite, companyId, page = 1, limit = 30 } = req.query;
    const where: any = {};
    if (statut) where.statut = String(statut);
    if (priorite) where.priorite = String(priorite);
    if (companyId) where.companyId = Number(companyId);
    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await SupportTicket.findAndCountAll({ where, limit: Number(limit), offset, order: [['updatedAt', 'DESC']] });
    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listAllTickets :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/tickets/:id — avec notes internes
export const getTicketAsStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findByPk(Number(req.params.id), {
      include: [{ model: SupportTicketMessage, as: 'messages' }, { model: Company, as: 'company', attributes: ['id', 'nom'] }],
      order: [[{ model: SupportTicketMessage, as: 'messages' }, 'createdAt', 'ASC']],
    });
    if (!ticket) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Erreur getTicketAsStaff :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/tickets/:id/messages { message, interne? }
export const replyAsStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findByPk(Number(req.params.id));
    if (!ticket) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }
    if (!req.body.message) { res.status(400).json({ error: 'message requis.' }); return; }
    const interne = Boolean(req.body.interne);

    const message = await SupportTicketMessage.create({ ticketId: ticket.id, authorUserId: req.user!.id, authorType: 'staff', message: req.body.message, interne });
    if (!interne) {
      if (ticket.statut === 'ouvert') ticket.statut = 'en_attente_client';
      ticket.changed('updatedAt', true);
      await ticket.save();
      await createNotification(ticket.createdByUserId, 'nouveau_message', 'Réponse du support Naatalix', `Le support a répondu à votre ticket « ${ticket.sujet} ».`, ticket.id);
    }
    await recordAudit({ actorUserId: req.user!.id, actorType: 'staff', companyId: ticket.companyId, action: 'ticket.reply', objectType: 'SupportTicket', objectId: ticket.id, details: { interne }, req });
    res.status(201).json(message);
  } catch (error) {
    console.error('Erreur replyAsStaff :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/backoffice/tickets/:id { statut?, priorite?, assignedStaffId? }
export const updateTicketAsStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticket = await SupportTicket.findByPk(Number(req.params.id));
    if (!ticket) { res.status(404).json({ error: 'Ticket introuvable.' }); return; }

    const { statut, priorite, assignedStaffId } = req.body;
    if (statut !== undefined && !STATUTS.includes(statut)) { res.status(400).json({ error: `statut invalide (${STATUTS.join('|')}).` }); return; }
    if (priorite !== undefined && !PRIORITES.includes(priorite)) { res.status(400).json({ error: `priorite invalide (${PRIORITES.join('|')}).` }); return; }

    if (statut !== undefined) {
      ticket.statut = statut;
      ticket.resolvedAt = statut === 'resolu' || statut === 'ferme' ? new Date() : null;
    }
    if (priorite !== undefined) ticket.priorite = priorite;
    if (assignedStaffId !== undefined) ticket.assignedStaffId = assignedStaffId || null;
    await ticket.save();

    await recordAudit({ actorUserId: req.user!.id, actorType: 'staff', companyId: ticket.companyId, action: 'ticket.update', objectType: 'SupportTicket', objectId: ticket.id, details: { statut, priorite, assignedStaffId }, req });
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Erreur updateTicketAsStaff :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
