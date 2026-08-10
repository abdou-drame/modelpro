import { Router } from 'express';
import multer from 'multer';
import { getMyProfile, searchArtisans, updateArtisanProfile, uploadAtelierPhotos, uploadValidationDocument, uploadAvatarPhoto, deleteAtelierPhoto, uploadLogo, changePack } from '../controllers/artisanController';
import { getAppointments, updateAppointmentStatus, getOrders, getOrderDetails, updateOrderStatus, getArtisanStats, updateOrderDeliveryDate, rescheduleAppointment, getMyReviews } from '../controllers/artisanDashboardController';
import { getMyWallet, requestWithdrawal } from '../controllers/walletController';
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
router.delete('/photos', protect, restrictTo('artisan'), deleteAtelierPhoto);
router.post('/avatar', protect, restrictTo('artisan'), upload.single('avatar'), uploadAvatarPhoto);
router.post('/logo', protect, restrictTo('artisan'), upload.single('logo'), uploadLogo);
router.post('/document', protect, restrictTo('artisan'), upload.single('document'), uploadValidationDocument);
router.put('/pack', protect, restrictTo('artisan'), changePack);

router.get('/appointments', protect, restrictTo('artisan'), getAppointments);
router.patch('/appointments/:id/status', protect, restrictTo('artisan'), updateAppointmentStatus);
router.patch('/appointments/:id/reschedule', protect, restrictTo('artisan'), rescheduleAppointment);

router.get('/orders', protect, restrictTo('artisan'), getOrders);
router.get('/orders/:id', protect, restrictTo('artisan'), getOrderDetails);
router.patch('/orders/:id/status', protect, restrictTo('artisan'), updateOrderStatus);
router.patch('/orders/:id/delivery-date', protect, restrictTo('artisan'), updateOrderDeliveryDate);

router.get('/stats', protect, restrictTo('artisan'), getArtisanStats);
router.get('/reviews', protect, restrictTo('artisan'), getMyReviews);

router.get('/wallet', protect, restrictTo('artisan'), getMyWallet);
router.post('/wallet/retrait', protect, restrictTo('artisan'), requestWithdrawal);

export default router;