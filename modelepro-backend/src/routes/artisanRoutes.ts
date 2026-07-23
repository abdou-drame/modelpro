import { Router } from 'express';
import multer from 'multer';
import { getMyProfile, searchArtisans, updateArtisanProfile, uploadAtelierPhotos, uploadValidationDocument } from '../controllers/artisanController';
import { getAppointments, updateAppointmentStatus, getOrders, getOrderDetails, updateOrderStatus, getArtisanStats, updateOrderDeliveryDate, updateOrderPayment, rescheduleAppointment } from '../controllers/artisanDashboardController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Route publique : Recherche d'artisans
router.get('/search', searchArtisans);

// Routes privées réservées aux artisans
router.get('/profile', protect, restrictTo('artisan'), getMyProfile);
router.put('/profile', protect, restrictTo('artisan'), updateArtisanProfile);
router.post('/photos', protect, restrictTo('artisan'), upload.array('photos', 5), uploadAtelierPhotos);
router.post('/document', protect, restrictTo('artisan'), upload.single('document'), uploadValidationDocument);

router.get('/appointments', protect, restrictTo('artisan'), getAppointments);
router.patch('/appointments/:id/status', protect, restrictTo('artisan'), updateAppointmentStatus);
router.patch('/appointments/:id/reschedule', protect, restrictTo('artisan'), rescheduleAppointment);

router.get('/orders', protect, restrictTo('artisan'), getOrders);
router.get('/orders/:id', protect, restrictTo('artisan'), getOrderDetails);
router.patch('/orders/:id/status', protect, restrictTo('artisan'), updateOrderStatus);
router.patch('/orders/:id/delivery-date', protect, restrictTo('artisan'), updateOrderDeliveryDate);
router.patch('/orders/:id/payment', protect, restrictTo('artisan'), updateOrderPayment);

router.get('/stats', protect, restrictTo('artisan'), getArtisanStats);

export default router;