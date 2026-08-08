import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  createPayment,
  getPaymentsByOrder,
  getPaymentSummary,
  getArtisanSubscriptions,
  updatePaymentStatus,
  handlePaytechIpn,
  handlePaymentRedirect,
} from '../controllers/paymentController';

const router = Router();

// Webhook PayTech : pas d'authentification JWT (appelé par PayTech, pas par nos clients),
// la confiance vient de la vérification de signature dans le handler.
router.post('/paytech/ipn', handlePaytechIpn);

// Page de rebond ouverte par le navigateur système après paiement (PayTech exige un successUrl/
// cancelUrl en http(s), voir buildAppRedirectUrl) — pas d'auth, appelée depuis un navigateur sans token.
router.get('/redirect', handlePaymentRedirect);

router.post('/', protect, createPayment);
router.get('/order/:orderId', protect, getPaymentsByOrder);
router.get('/summary/:orderId', protect, getPaymentSummary);
router.get('/subscriptions/my', protect, getArtisanSubscriptions);
router.patch('/:id/status', protect, updatePaymentStatus);

export default router;
