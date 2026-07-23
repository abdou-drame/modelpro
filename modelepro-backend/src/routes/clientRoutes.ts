import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
  getMetiers,
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  createOrder,
  getMyOrders,
  cancelOrder,
  createReview,
  getArtisanReviews,
  createClaim,
  getMyClaims
} from '../controllers/clientController';
import { getPublicArtisanProfile } from '../controllers/userController';

const router = Router();

// Public
router.get('/metiers', getMetiers);
router.get('/artisans/:id', getPublicArtisanProfile);
router.get('/artisans/:artisanId/reviews', getArtisanReviews);

// Protected endpoints
router.get('/appointments/my-appointments', protect, getMyAppointments);
router.post('/appointments', protect, restrictTo('client'), createAppointment);
router.patch('/appointments/:id/cancel', protect, cancelAppointment);

router.post('/orders', protect, restrictTo('client'), createOrder);
router.get('/orders/my-orders', protect, restrictTo('client'), getMyOrders);
router.patch('/orders/:id/cancel', protect, cancelOrder);

router.post('/reviews', protect, restrictTo('client'), createReview);
router.post('/claims', protect, restrictTo('client'), createClaim);
router.get('/claims/my-claims', protect, getMyClaims);

export default router;
