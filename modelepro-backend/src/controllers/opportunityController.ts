import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Opportunity } from '../models/Opportunity';
import { PipelineStage } from '../models/PipelineStage';
import { Customer } from '../models/Customer';

const clampProbabilite = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
};

// Dérive statut + dateCloture à partir des flags de l'étape — écriture centralisée ici pour
// éviter que statut diverge de l'étape réelle (voir Opportunity.statut).
const applyStageEffect = (opportunity: Opportunity, stage: PipelineStage) => {
  opportunity.stageId = stage.id;
  if (stage.estGagne) {
    opportunity.statut = 'gagnee';
    opportunity.dateCloture = new Date();
  } else if (stage.estPerdu) {
    opportunity.statut = 'perdue';
    opportunity.dateCloture = new Date();
  } else {
    opportunity.statut = 'ouverte';
    opportunity.dateCloture = null;
  }
};

// POST /api/v1/crm/opportunities
export const createOpportunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { customerId, nom, stageId, valeur, probabilite, assignedToUserId, prochaineAction, dateProchaineAction, notes } = req.body;

    if (!customerId || !nom) {
      res.status(400).json({ error: 'customerId et nom sont requis.' });
      return;
    }

    const customer = await Customer.findOne({ where: { id: Number(customerId), companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    let stage: PipelineStage | null;
    if (stageId) {
      stage = await PipelineStage.findOne({ where: { id: Number(stageId), companyId } });
      if (!stage) { res.status(404).json({ error: 'Étape de pipeline introuvable.' }); return; }
    } else {
      stage = await PipelineStage.findOne({ where: { companyId }, order: [['ordre', 'ASC']] });
      if (!stage) { res.status(400).json({ error: "Aucune étape de pipeline configurée pour cette entreprise." }); return; }
    }

    const opportunity = await Opportunity.build({
      companyId,
      customerId: customer.id,
      nom,
      valeur: valeur !== undefined ? Number(valeur) : 0,
      probabilite: clampProbabilite(probabilite),
      assignedToUserId: assignedToUserId || null,
      prochaineAction: prochaineAction || null,
      dateProchaineAction: dateProchaineAction || null,
      notes: notes || null,
    });
    applyStageEffect(opportunity, stage);
    await opportunity.save();

    res.status(201).json(opportunity);
  } catch (error) {
    console.error('Erreur createOpportunity :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/opportunities?stageId=&statut=&assignedToUserId=&customerId=&page=&limit=
export const listOpportunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { stageId, statut, assignedToUserId, customerId, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    if (stageId) where.stageId = Number(stageId);
    if (statut === 'ouverte' || statut === 'gagnee' || statut === 'perdue') where.statut = statut;
    if (assignedToUserId) where.assignedToUserId = Number(assignedToUserId);
    if (customerId) where.customerId = Number(customerId);

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Opportunity.findAndCountAll({
      where,
      include: [
        { model: PipelineStage, as: 'stage' },
        { model: Customer, as: 'customer', attributes: ['id', 'nom', 'statut'] },
      ],
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
    console.error('Erreur listOpportunities :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/opportunities/:id
export const getOpportunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const opportunity = await Opportunity.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [
        { model: PipelineStage, as: 'stage' },
        { model: Customer, as: 'customer' },
      ],
    });
    if (!opportunity) { res.status(404).json({ error: 'Opportunité introuvable.' }); return; }
    res.status(200).json(opportunity);
  } catch (error) {
    console.error('Erreur getOpportunity :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/opportunities/:id — champs génériques ; le changement d'étape passe par
// PATCH /:id/stage pour garder statut/dateCloture cohérents en un seul point d'écriture.
export const updateOpportunity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const opportunity = await Opportunity.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
    });
    if (!opportunity) { res.status(404).json({ error: 'Opportunité introuvable.' }); return; }

    const { nom, valeur, probabilite, assignedToUserId, prochaineAction, dateProchaineAction, notes } = req.body;
    if (nom !== undefined) opportunity.nom = nom;
    if (valeur !== undefined) opportunity.valeur = Number(valeur);
    if (probabilite !== undefined) opportunity.probabilite = clampProbabilite(probabilite);
    if (assignedToUserId !== undefined) opportunity.assignedToUserId = assignedToUserId;
    if (prochaineAction !== undefined) opportunity.prochaineAction = prochaineAction;
    if (dateProchaineAction !== undefined) opportunity.dateProchaineAction = dateProchaineAction;
    if (notes !== undefined) opportunity.notes = notes;
    await opportunity.save();

    res.status(200).json(opportunity);
  } catch (error) {
    console.error('Erreur updateOpportunity :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/opportunities/:id/stage
export const moveToStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { stageId } = req.body;
    if (!stageId) { res.status(400).json({ error: 'stageId requis.' }); return; }

    const opportunity = await Opportunity.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!opportunity) { res.status(404).json({ error: 'Opportunité introuvable.' }); return; }

    const stage = await PipelineStage.findOne({ where: { id: Number(stageId), companyId } });
    if (!stage) { res.status(404).json({ error: 'Étape de pipeline introuvable.' }); return; }

    applyStageEffect(opportunity, stage);
    await opportunity.save();

    res.status(200).json(opportunity);
  } catch (error) {
    console.error('Erreur moveToStage :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/opportunities/forecast — prévision de CA : total pondéré des opportunités
// ouvertes (valeur × probabilité), globalement et par étape.
export const getForecast = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;

    const openOpportunities = await Opportunity.findAll({
      where: { companyId, statut: 'ouverte' },
      include: [{ model: PipelineStage, as: 'stage', attributes: ['id', 'nom', 'ordre'] }],
    });

    let totalValeur = 0;
    let totalPondere = 0;
    const parEtape: Record<number, { stageId: number; nom: string; ordre: number; nombre: number; valeur: number; pondere: number }> = {};

    for (const opp of openOpportunities) {
      const pondere = opp.valeur * (opp.probabilite / 100);
      totalValeur += opp.valeur;
      totalPondere += pondere;

      const stage = (opp as any).stage as PipelineStage | undefined;
      if (stage) {
        if (!parEtape[stage.id]) {
          parEtape[stage.id] = { stageId: stage.id, nom: stage.nom, ordre: stage.ordre, nombre: 0, valeur: 0, pondere: 0 };
        }
        parEtape[stage.id].nombre += 1;
        parEtape[stage.id].valeur += opp.valeur;
        parEtape[stage.id].pondere += pondere;
      }
    }

    res.status(200).json({
      nombreOpportunitesOuvertes: openOpportunities.length,
      totalValeur,
      totalPondere,
      parEtape: Object.values(parEtape).sort((a, b) => a.ordre - b.ordre),
    });
  } catch (error) {
    console.error('Erreur getForecast :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
