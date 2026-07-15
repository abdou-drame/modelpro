import { Router } from 'express';
import {
  deleteModelForce,
  getClaims,
  getPendingArtisans,
  getStats,
  verifyArtisan,
} from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/pending-artisans', getPendingArtisans);
router.patch('/artisans/:id/verify', verifyArtisan);
router.delete('/models/:id', deleteModelForce);
router.get('/claims', getClaims);
router.get('/stats', getStats);

export default router;
