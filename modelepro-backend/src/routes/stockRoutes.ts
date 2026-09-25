import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { enforceSubscription, requireFeature } from '../middlewares/subscriptionMiddleware';
import { PLAN_FEATURE_KEYS } from '../services/subscriptionService';
import { requireCompany, requireCompanyRole } from '../middlewares/tenantMiddleware';
import {
  createSite,
  listSites,
  updateSite,
  listStockItems,
  listStockAlerts,
  getStockValuation,
  setThreshold,
  listMovements,
  createMovement,
  recordInventaire,
  exportStock,
} from '../controllers/stockController';

const router = Router();

// Mêmes rôles que le module Fournisseurs (achats/stocks relèvent du rôle 'stock' du cahier des
// charges), lecture ouverte à tout membre de l'entreprise.
const canWrite = requireCompanyRole('admin', 'manager', 'stock');

// Stock/sites/inventaire de base : disponibles dès l'Essentiel (cahier NAATALIX_Formules_
// Fonctionnalites.docx, 2026-09-24 — "Gestion des stocks"/"Inventaire"/"Fournisseurs & achats"
// sont cochés sur les 3 formules). Seules les alertes de seuil et la valorisation restent
// réservées à partir du Pro. Appliqué route par route (PAS via router.use) : ce routeur est monté
// sur le même préfixe /api/v1/crm que crmRoutes et supplierRoutes — voir le commentaire équivalent
// dans supplierRoutes.ts pour la raison exacte (fallthrough Express entre routeurs partageant un
// préfixe).
const base = [protect, requireCompany, enforceSubscription];
const gateAlertes = [...base, requireFeature(PLAN_FEATURE_KEYS.STOCK_ALERTES)];
const gateValorisation = [...base, requireFeature(PLAN_FEATURE_KEYS.STOCK_VALORISATION)];

router.get('/sites', ...base, listSites);
router.post('/sites', ...base, canWrite, createSite);
router.put('/sites/:id', ...base, canWrite, updateSite);

router.get('/stock/alerts', ...gateAlertes, listStockAlerts);
router.get('/stock/valuation', ...gateValorisation, getStockValuation);
router.get('/stock/movements', ...base, listMovements);
router.post('/stock/movements', ...base, canWrite, createMovement);
router.post('/stock/inventaire', ...base, canWrite, recordInventaire);
router.get('/stock/export', ...base, exportStock);
router.put('/stock/:id/threshold', ...gateAlertes, canWrite, setThreshold);
router.get('/stock', ...base, listStockItems);

export default router;
