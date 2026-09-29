import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requirePlatformStaff } from '../middlewares/platformMiddleware';
import {
  createStaff, listStaff, setStaffStatus,
  listCompanies, getCompanyDetail, listCompanyMembers,
  listPlans, createPlan, updatePlan,
  suspendCompany, reactivateCompany, changePlan, renewCompanySubscription, extendTrial, subscriptionHistory,
  getPlatformStats, listAuditLogs,
} from '../controllers/backofficeController';
import { listAllTickets, getTicketAsStaff, replyAsStaff, updateTicketAsStaff } from '../controllers/supportController';
import { listEvents as listPaytrackEvents, listTransactions as listPaytrackTransactions } from '../controllers/paytrackController';
import { listEvents as listDexpayEvents } from '../controllers/dexpayController';
import { setupTwoFactor, confirmTwoFactor, disableTwoFactor, resetStaffTwoFactor } from '../controllers/twoFactorController';

const router = Router();

// Back-office ATAABA (cahier des charges §14, F-019) : realm séparé des comptes entreprise,
// revalidé en base à chaque requête (platformMiddleware). Toute action d'écriture est journalisée
// dans AuditLog par le contrôleur.
const anyStaff = requirePlatformStaff('superadmin', 'support', 'readonly');
const supportOrAbove = requirePlatformStaff('superadmin', 'support');
const superadmin = requirePlatformStaff('superadmin');

router.use(protect);

router.get('/staff', superadmin, listStaff);
router.post('/staff', superadmin, createStaff);
router.patch('/staff/:id/status', superadmin, setStaffStatus);

// 2FA (Phase 5) — setup/confirm/disable agissent toujours sur le compte staff appelant lui-même
// (anyStaff : chacun gère sa propre 2FA) ; reset est le filet de récupération superadmin sur un
// compte tiers (téléphone perdu/cassé).
router.post('/2fa/setup', anyStaff, setupTwoFactor);
router.post('/2fa/confirm', anyStaff, confirmTwoFactor);
router.post('/2fa/disable', anyStaff, disableTwoFactor);
router.post('/staff/:id/2fa/reset', superadmin, resetStaffTwoFactor);

router.get('/stats', anyStaff, getPlatformStats);
router.get('/audit-logs', superadmin, listAuditLogs);

router.get('/plans', anyStaff, listPlans);
router.post('/plans', superadmin, createPlan);
router.put('/plans/:id', superadmin, updatePlan);

router.get('/companies', anyStaff, listCompanies);
router.get('/companies/:id', anyStaff, getCompanyDetail);
router.get('/companies/:id/members', supportOrAbove, listCompanyMembers);
router.get('/companies/:id/subscription/history', anyStaff, subscriptionHistory);
router.patch('/companies/:id/suspend', superadmin, suspendCompany);
router.patch('/companies/:id/reactivate', superadmin, reactivateCompany);
router.patch('/companies/:id/subscription/plan', superadmin, changePlan);
router.post('/companies/:id/subscription/renew', superadmin, renewCompanySubscription);
router.post('/companies/:id/trial/extend', superadmin, extendTrial);

router.get('/integrations/paytrack/events', supportOrAbove, listPaytrackEvents);
router.get('/integrations/paytrack/transactions', supportOrAbove, listPaytrackTransactions);
router.get('/integrations/dexpay/events', supportOrAbove, listDexpayEvents);

router.get('/tickets', supportOrAbove, listAllTickets);
router.get('/tickets/:id', supportOrAbove, getTicketAsStaff);
router.post('/tickets/:id/messages', supportOrAbove, replyAsStaff);
router.patch('/tickets/:id', supportOrAbove, updateTicketAsStaff);

export default router;
