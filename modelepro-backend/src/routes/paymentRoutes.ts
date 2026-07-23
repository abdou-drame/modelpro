import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  createPayment,
  getPaymentsByOrder,
  getPaymentSummary,
  getArtisanSubscriptions,
  updatePaymentStatus,
} from '../controllers/paymentController';

const router = Router();

router.post('/', protect, createPayment);
router.get('/order/:orderId', protect, getPaymentsByOrder);
router.get('/summary/:orderId', protect, getPaymentSummary);
router.get('/subscriptions/my', protect, getArtisanSubscriptions);
router.patch('/:id/status', protect, updatePaymentStatus);

export default router;
