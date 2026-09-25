import { Router } from 'express';
import { handleWebhook } from '../controllers/paytrackController';

const router = Router();

// Webhook public : pas de JWT, la confiance vient de la signature HMAC vérifiée dans le handler.
router.post('/paytrack/webhook', handleWebhook);

export default router;
