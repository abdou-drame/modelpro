import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { createPayment, getPaymentsByOrder } from '../controllers/paymentController';

const router = Router();

router.post('/', protect, createPayment);
router.get('/order/:orderId', protect, getPaymentsByOrder);

export default router;
