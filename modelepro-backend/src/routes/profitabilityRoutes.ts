import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { enforceSubscription, requireFeature } from '../middlewares/subscriptionMiddleware';
import { PLAN_FEATURE_KEYS } from '../services/subscriptionService';
import { requireCompany, requireCompanyRole } from '../middlewares/tenantMiddleware';
import {
  createSimulation,
  listSimulations,
  getSimulation,
  updateSimulation,
  archiveSimulation,
  restoreSimulation,
  duplicateSimulation,
  addCost,
  updateCost,
  deleteCost,
  targetProfit,
  getScenarios,
  sensitivityAnalysis,
  discountSimulation,
  compareSimulations,
  supplierComparison,
  getPrevisionnelVsReel,
  getTresorerie,
  getProfitabilityScore,
} from '../controllers/profitabilityController';

const router = Router();

// Profils cahier des charges §4 (Dirigeant, Responsable financier, Responsable commercial)
// mappés sur les companyRole existants : admin/manager (pilotage), finance (coûts/marges),
// commercial (prix/remises/objectifs). Lecture ouverte à tout membre de l'entreprise.
const canWrite = requireCompanyRole('admin', 'manager', 'finance', 'commercial');

// Rentabilité "basique" (simulations, coûts) disponible dès l'Essentiel ; l'analyse "avancée"
// (comparaisons, scénarios, sensibilité, simulation de remise, objectif de profit) reste réservée
// à partir du Pro (cahier NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24 : "Analyse de
// rentabilité" = Basique/Avancée/Avancée).
router.use(protect, requireCompany, enforceSubscription);
const advanced = requireFeature(PLAN_FEATURE_KEYS.RENTABILITE_AVANCEE);

// /compare et /supplier-comparison avant /:id pour ne pas être capturés comme un id.
router.get('/simulations/compare', advanced, compareSimulations);
router.get('/supplier-comparison', advanced, supplierComparison);

// Rentabilité avancée (2026-09-26) : prévisionnel vs réel, trésorerie, score /100.
router.get('/tresorerie', advanced, getTresorerie);
router.get('/score', advanced, getProfitabilityScore);

router.get('/simulations', listSimulations);
router.post('/simulations', canWrite, createSimulation);
router.get('/simulations/:id', getSimulation);
router.put('/simulations/:id', canWrite, updateSimulation);
router.patch('/simulations/:id/archive', canWrite, archiveSimulation);
router.patch('/simulations/:id/restore', canWrite, restoreSimulation);
router.post('/simulations/:id/duplicate', canWrite, duplicateSimulation);

router.post('/simulations/:id/costs', canWrite, addCost);
router.put('/simulations/:id/costs/:costId', canWrite, updateCost);
router.delete('/simulations/:id/costs/:costId', canWrite, deleteCost);

router.post('/simulations/:id/target-profit', advanced, targetProfit);
router.get('/simulations/:id/scenarios', advanced, getScenarios);
router.post('/simulations/:id/sensitivity', advanced, sensitivityAnalysis);
router.post('/simulations/:id/discount-simulation', advanced, discountSimulation);
router.get('/simulations/:id/previsionnel-vs-reel', advanced, getPrevisionnelVsReel);

export default router;
