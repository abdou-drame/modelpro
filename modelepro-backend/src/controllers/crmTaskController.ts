import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CrmTask } from '../models/CrmTask';
import { Customer } from '../models/Customer';
import { Opportunity } from '../models/Opportunity';

const TASK_TYPES = ['tache', 'rappel', 'rendez_vous'] as const;
const MANAGER_ROLES = ['admin', 'manager', 'commercial'];

// Une action sur une tâche est permise à admin/manager/commercial (gestion large de l'activité
// commerciale) ou à la personne à qui la tâche est assignée (elle doit pouvoir reporter/annuler/
// terminer ce qui lui a été confié, même avec un companyRole plus restreint comme 'stock').
const canActOnTask = (req: AuthenticatedRequest, task: CrmTask): boolean => {
  if (req.user?.companyRole && MANAGER_ROLES.includes(req.user.companyRole)) return true;
  return task.assignedToUserId === req.user?.id;
};

// POST /api/v1/crm/tasks
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { type, titre, description, customerId, opportunityId, assignedToUserId, lieu, dateEcheance, rappelActif } = req.body;

    if (!titre) { res.status(400).json({ error: 'titre requis.' }); return; }
    if (type && !TASK_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${TASK_TYPES.join(', ')}` });
      return;
    }

    if (customerId) {
      const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
      if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }
    }
    if (opportunityId) {
      const opportunity = await Opportunity.findOne({ where: { id: Number(opportunityId), companyId } });
      if (!opportunity) { res.status(404).json({ error: 'Opportunité introuvable.' }); return; }
    }

    const echeance = dateEcheance ? new Date(dateEcheance) : null;
    const task = await CrmTask.create({
      companyId,
      type: type || 'tache',
      titre,
      description: description || null,
      customerId: customerId || null,
      opportunityId: opportunityId || null,
      assignedToUserId: assignedToUserId || null,
      lieu: lieu || null,
      dateEcheanceInitiale: echeance,
      dateEcheance: echeance,
      rappelActif: Boolean(rappelActif),
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Erreur createTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/tasks?type=&statut=&assignedToUserId=&customerId=&opportunityId=&page=&limit=
export const listTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { type, statut, assignedToUserId, customerId, opportunityId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (type && TASK_TYPES.includes(type as any)) where.type = type;
    if (statut) where.statut = statut;
    if (assignedToUserId) where.assignedToUserId = Number(assignedToUserId);
    if (customerId) where.customerId = Number(customerId);
    if (opportunityId) where.opportunityId = Number(opportunityId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await CrmTask.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'nom'] },
        { model: Opportunity, as: 'opportunity', attributes: ['id', 'nom'] },
      ],
      limit: Number(limit),
      offset,
      order: [['dateEcheance', 'ASC']],
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (error) {
    console.error('Erreur listTasks :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/tasks/:id
export const getTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: Customer, as: 'customer' },
        { model: Opportunity, as: 'opportunity' },
      ],
    });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }
    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur getTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/tasks/:id — champs descriptifs uniquement ; statut/échéance passent par les
// actions dédiées (reschedule/cancel/complete) pour garder un historique cohérent.
export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }

    const { titre, description, lieu, rappelActif, type } = req.body;
    if (type && !TASK_TYPES.includes(type)) {
      res.status(400).json({ error: `type invalide. Valeurs acceptées : ${TASK_TYPES.join(', ')}` });
      return;
    }
    if (titre !== undefined) task.titre = titre;
    if (description !== undefined) task.description = description;
    if (lieu !== undefined) task.lieu = lieu;
    if (rappelActif !== undefined) task.rappelActif = Boolean(rappelActif);
    if (type !== undefined) task.type = type;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur updateTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/tasks/:id/assign
export const assignTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }

    const { assignedToUserId } = req.body;
    task.assignedToUserId = assignedToUserId || null;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur assignTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/tasks/:id/reschedule
export const rescheduleTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }
    if (!canActOnTask(req, task)) { res.status(403).json({ error: 'Vous ne pouvez pas reporter cette tâche.' }); return; }

    const { dateEcheance, motif } = req.body;
    if (!dateEcheance) { res.status(400).json({ error: 'dateEcheance requise.' }); return; }

    task.dateEcheance = new Date(dateEcheance);
    task.motifReport = motif || null;
    task.statut = 'reporte';
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur rescheduleTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/tasks/:id/cancel
export const cancelTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }
    if (!canActOnTask(req, task)) { res.status(403).json({ error: 'Vous ne pouvez pas annuler cette tâche.' }); return; }

    task.statut = 'annule';
    task.motifAnnulation = req.body.motif || null;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur cancelTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/tasks/:id/complete
export const completeTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await CrmTask.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
    if (!task) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }
    if (!canActOnTask(req, task)) { res.status(403).json({ error: 'Vous ne pouvez pas terminer cette tâche.' }); return; }

    task.statut = 'fait';
    task.dateRealisation = new Date();
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    console.error('Erreur completeTask :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
