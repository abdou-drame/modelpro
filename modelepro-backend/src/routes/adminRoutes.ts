import { Router } from 'express';
import {
  getAllUsers,
  toggleUserStatus,
  getAllArtisansAdmin,
  getPendingArtisans,
  verifyArtisan,
  rejectArtisan,
  getAllOrders,
  getOverdueOrders,
  getAllModelsAdmin,
  deleteModelForce,
  getAllAppointmentsAdmin,
  getClaims,
  updateClaimStatus,
  getAllPaymentsAdmin,
  getStats,
  createMetier,
  updateMetier,
  toggleMetierStatus,
  deleteMetier,
} from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect, restrictTo('admin'));

// Tableau de bord & Statistiques
router.get('/stats', getStats);

// Gestion clients & utilisateurs
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);

// Gestion artisans
router.get('/artisans', getAllArtisansAdmin);
router.get('/pending-artisans', getPendingArtisans);
router.patch('/artisans/:id/verify', verifyArtisan);
router.patch('/artisans/:id/reject', rejectArtisan);

// Gestion métiers & catégories
router.post('/metiers', createMetier);
router.put('/metiers/:id', updateMetier);
router.patch('/metiers/:id/toggle', toggleMetierStatus);
router.delete('/metiers/:id', deleteMetier);

// Gestion modèles & modération
router.get('/models', getAllModelsAdmin);
router.delete('/models/:id', deleteModelForce);

// Gestion commandes & retards
router.get('/orders', getAllOrders);
router.get('/orders/overdue', getOverdueOrders);

// Gestion rendez-vous
router.get('/appointments', getAllAppointmentsAdmin);

// Gestion réclamations / litiges
router.get('/claims', getClaims);
router.patch('/claims/:id/status', updateClaimStatus);

// Gestion paiements & abonnements
router.get('/payments', getAllPaymentsAdmin);

export default router;
