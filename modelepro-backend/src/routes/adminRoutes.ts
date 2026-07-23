import { Router } from 'express';
import {
  getAllUsers,
  toggleUserStatus,
  deleteModelForce,
  getClaims,
  getPendingArtisans,
  getStats,
  verifyArtisan,
  rejectArtisan,
  getAllOrders,
  createMetier,
  updateMetier,
  deleteMetier,
  updateClaimStatus
} from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);

router.get('/pending-artisans', getPendingArtisans);
router.patch('/artisans/:id/verify', verifyArtisan);
router.patch('/artisans/:id/reject', rejectArtisan);

router.get('/orders', getAllOrders);
router.delete('/models/:id', deleteModelForce);
router.get('/claims', getClaims);
router.patch('/claims/:id/status', updateClaimStatus);
router.get('/stats', getStats);

router.post('/metiers', createMetier);
router.put('/metiers/:id', updateMetier);
router.delete('/metiers/:id', deleteMetier);

export default router;
