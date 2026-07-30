import { Router } from 'express';
import {
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAllArtisansAdmin,
  getPendingArtisans,
  getArtisanProfileAdmin,
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
  deleteReview,
  getAllReviewsAdmin,
  deleteArtisanAdmin,
  suspendArtisan,
  reactivateArtisan,
  updateArtisanSubscriptionAdmin,
} from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect, restrictTo('admin'));

// Tableau de bord & Statistiques
router.get('/stats', getStats);

// Gestion clients & utilisateurs (suspension / activation)
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Gestion artisans
router.get('/artisans', getAllArtisansAdmin);
router.get('/pending-artisans', getPendingArtisans);
router.get('/artisans/:id', getArtisanProfileAdmin);
router.patch('/artisans/:id/verify', verifyArtisan);
router.patch('/artisans/:id/reject', rejectArtisan);
router.patch('/artisans/:id/suspend', suspendArtisan);
router.patch('/artisans/:id/reactivate', reactivateArtisan);
router.patch('/artisans/:id/subscription', updateArtisanSubscriptionAdmin);
router.delete('/artisans/:id', deleteArtisanAdmin);

// Suppression & consultation d'avis
router.get('/reviews', getAllReviewsAdmin);
router.delete('/reviews/:id', deleteReview);

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
