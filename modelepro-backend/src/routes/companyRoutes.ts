import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { enforceSubscription } from '../middlewares/subscriptionMiddleware';
import { requireCompany, requireCompanyRole } from '../middlewares/tenantMiddleware';
import {
  registerCompany,
  getMyCompany,
  updateMyCompany,
  uploadCompanyLogo,
  listMembers,
  createMember,
  updateMemberRole,
  removeMember,
  listActivityLog,
} from '../controllers/companyController';
import { sendCompanyEmailOtp, enableCompanyEmailTwoFactor, disableCompanyEmailTwoFactor } from '../controllers/companyTwoFactorController';
import { subscribeCompany, cancelCompanySubscription } from '../controllers/dexpayController';
import { authLimiter } from '../middlewares/rateLimitMiddleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', registerCompany);

router.get('/me', protect, requireCompany, getMyCompany);
router.put('/me', protect, requireCompany, enforceSubscription, requireCompanyRole('admin'), updateMyCompany);
router.post('/me/logo', protect, requireCompany, enforceSubscription, requireCompanyRole('admin'), upload.single('logo'), uploadCompanyLogo);

// 2FA par e-mail (Phase 5) — libre-service sur son propre compte, aucun requireCompanyRole : ça
// n'affecte jamais que req.user.id, jamais un collègue (voir companyTwoFactorController.ts).
router.post('/me/2fa/email/send-code', protect, requireCompany, authLimiter, sendCompanyEmailOtp);
router.post('/me/2fa/email/enable', protect, requireCompany, enableCompanyEmailTwoFactor);
router.post('/me/2fa/email/disable', protect, requireCompany, disableCompanyEmailTwoFactor);

// Paiement DexPay des abonnements (2026-09-25) — volontairement SANS enforceSubscription : une
// entreprise suspendue/expirée doit pouvoir payer pour se réactiver, ce que enforceSubscription
// bloquerait sinon (même principe que les routes /support, jamais gatées non plus).
router.post('/me/subscription/dexpay/subscribe', protect, requireCompany, requireCompanyRole('admin'), subscribeCompany);
router.post('/me/subscription/dexpay/cancel', protect, requireCompany, requireCompanyRole('admin'), cancelCompanySubscription);

router.get('/me/activity-log', protect, requireCompany, listActivityLog);

router.get('/members', protect, requireCompany, listMembers);
router.post('/members', protect, requireCompany, enforceSubscription, requireCompanyRole('admin'), createMember);
router.patch('/members/:id/role', protect, requireCompany, enforceSubscription, requireCompanyRole('admin'), updateMemberRole);
router.delete('/members/:id', protect, requireCompany, enforceSubscription, requireCompanyRole('admin'), removeMember);

export default router;
