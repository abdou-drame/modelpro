import { Router } from 'express';
import { register, login, verifyTwoFactor } from '../controllers/authController';
import { authLimiter } from '../middlewares/rateLimitMiddleware';

const router = Router();

// Route d'inscription : POST /api/v1/auth/register
router.post('/register', authLimiter, register);

// Route de connexion : POST /api/v1/auth/login
router.post('/login', authLimiter, login);

// Deuxième étape de connexion pour le personnel ATAABA avec 2FA activée : POST /api/v1/auth/2fa/verify
router.post('/2fa/verify', authLimiter, verifyTwoFactor);

export default router;