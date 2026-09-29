import { Router } from 'express';
import { handleWebhook } from '../controllers/paytrackController';
import { handleWebhook as handleDexpayWebhook } from '../controllers/dexpayController';

const router = Router();

// Webhooks publics : pas de JWT, la confiance vient de la signature HMAC vérifiée dans chaque handler.
router.post('/paytrack/webhook', handleWebhook);
router.post('/dexpay/webhook', handleDexpayWebhook);

export default router;
