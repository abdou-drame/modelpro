import { Transaction } from 'sequelize';
import { PipelineStage } from '../models/PipelineStage';
import { Site } from '../models/Site';

const DEFAULT_STAGES: Array<{ nom: string; ordre: number; estGagne: boolean; estPerdu: boolean }> = [
  { nom: 'Prospection', ordre: 1, estGagne: false, estPerdu: false },
  { nom: 'Qualification', ordre: 2, estGagne: false, estPerdu: false },
  { nom: 'Proposition', ordre: 3, estGagne: false, estPerdu: false },
  { nom: 'Négociation', ordre: 4, estGagne: false, estPerdu: false },
  { nom: 'Gagné', ordre: 5, estGagne: true, estPerdu: false },
  { nom: 'Perdu', ordre: 6, estGagne: false, estPerdu: true },
];

// Étapes de pipeline par défaut créées à l'inscription d'une entreprise, pour que le pipeline
// soit utilisable immédiatement sans configuration préalable ("étapes configurables" : ces
// valeurs par défaut restent modifiables ensuite via /crm/pipeline-stages).
export const seedDefaultPipelineStages = async (companyId: number, transaction: Transaction): Promise<void> => {
  await PipelineStage.bulkCreate(
    DEFAULT_STAGES.map((stage) => ({ companyId, ...stage })),
    { transaction }
  );
};

// Site principal créé automatiquement à l'inscription, pour que les mouvements de stock
// (notamment automatiques : réception d'achat, livraison de commande) aient toujours un site
// cible sans configuration préalable. Reste modifiable/complétable ensuite via /crm/sites.
export const seedDefaultSite = async (companyId: number, transaction: Transaction): Promise<void> => {
  await Site.create({ companyId, nom: 'Site principal', estPrincipal: true }, { transaction });
};
