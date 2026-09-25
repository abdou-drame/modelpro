import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { PipelineStage } from '../models/PipelineStage';
import { Opportunity } from '../models/Opportunity';

// GET /api/v1/crm/pipeline-stages
export const listStages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stages = await PipelineStage.findAll({
      where: { companyId: req.user!.companyId! },
      order: [['ordre', 'ASC']],
    });
    res.status(200).json(stages);
  } catch (error) {
    console.error('Erreur listStages :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/pipeline-stages
export const createStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nom, ordre, estGagne, estPerdu } = req.body;
    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }

    const stage = await PipelineStage.create({
      companyId: req.user!.companyId!,
      nom,
      ordre: ordre !== undefined ? Number(ordre) : 0,
      estGagne: Boolean(estGagne),
      estPerdu: Boolean(estPerdu),
    });

    res.status(201).json(stage);
  } catch (error) {
    console.error('Erreur createStage :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/pipeline-stages/:id
export const updateStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stage = await PipelineStage.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
    });
    if (!stage) { res.status(404).json({ error: 'Étape introuvable.' }); return; }

    const { nom, ordre, estGagne, estPerdu } = req.body;
    if (nom !== undefined) stage.nom = nom;
    if (ordre !== undefined) stage.ordre = Number(ordre);
    if (estGagne !== undefined) stage.estGagne = Boolean(estGagne);
    if (estPerdu !== undefined) stage.estPerdu = Boolean(estPerdu);
    await stage.save();

    res.status(200).json(stage);
  } catch (error) {
    console.error('Erreur updateStage :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/pipeline-stages/:id — refusé si des opportunités utilisent encore l'étape,
// pour ne jamais laisser une opportunité pointer vers une étape inexistante.
export const deleteStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stage = await PipelineStage.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
    });
    if (!stage) { res.status(404).json({ error: 'Étape introuvable.' }); return; }

    const opportunitiesCount = await Opportunity.count({ where: { stageId: stage.id } });
    if (opportunitiesCount > 0) {
      res.status(400).json({
        error: `Impossible de supprimer cette étape : ${opportunitiesCount} opportunité(s) l'utilisent encore. Déplacez-les d'abord vers une autre étape.`,
      });
      return;
    }

    await stage.destroy();
    res.status(200).json({ message: 'Étape supprimée.' });
  } catch (error) {
    console.error('Erreur deleteStage :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
