import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { getMetiers, createAppointment, createOrder, getMyOrders, createReview, createClaim } from '../controllers/clientController';

const router = Router();

// Public
router.get('/metiers', getMetiers);

// Models public endpoints are in modelRoutes

// Client-protected endpoints
router.post('/appointments', protect, restrictTo('client'), createAppointment);
router.post('/orders', protect, restrictTo('client'), createOrder);
router.get('/orders/my-orders', protect, restrictTo('client'), getMyOrders);
router.post('/reviews', protect, restrictTo('client'), createReview);
router.post('/claims', protect, restrictTo('client'), createClaim);

export default router;
