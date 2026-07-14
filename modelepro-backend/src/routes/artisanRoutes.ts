import { Router } from 'express';
import { getMyProfile, searchArtisans, updateArtisanProfile } from '../controllers/artisanController';
import { getAppointments, updateAppointmentStatus, getOrders, getOrderDetails, updateOrderStatus, getArtisanStats } from '../controllers/artisanDashboardController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

// Route publique : Recherche d'artisans
router.get('/search', searchArtisans);

// Routes privées réservées aux artisans
router.get('/profile', protect, restrictTo('artisan'), getMyProfile);
router.put('/profile', protect, restrictTo('artisan'), updateArtisanProfile);

router.get('/appointments', protect, restrictTo('artisan'), getAppointments);
router.patch('/appointments/:id/status', protect, restrictTo('artisan'), updateAppointmentStatus);

router.get('/orders', protect, restrictTo('artisan'), getOrders);
router.get('/orders/:id', protect, restrictTo('artisan'), getOrderDetails);
router.patch('/orders/:id/status', protect, restrictTo('artisan'), updateOrderStatus);

router.get('/stats', protect, restrictTo('artisan'), getArtisanStats);

export default router;