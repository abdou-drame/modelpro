import { Router } from 'express';
import { register, login, verifyTwoFactor, logout } from '../controllers/authController';
import { authLimiter } from '../middlewares/rateLimitMiddleware';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Route d'inscription : POST /api/v1/auth/register
router.post('/register', authLimiter, register);

// Route de connexion : POST /api/v1/auth/login
router.post('/login', authLimiter, login);

// Deuxième étape de connexion pour le personnel ATAABA avec 2FA activée : POST /api/v1/auth/2fa/verify
router.post('/2fa/verify', authLimiter, verifyTwoFactor);

// Déconnexion serveur (Phase 5) : POST /api/v1/auth/logout — invalide tous les jetons existants.
router.post('/logout', protect, logout);

export default router;