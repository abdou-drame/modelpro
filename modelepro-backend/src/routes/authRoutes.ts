import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// Route d'inscription : POST /api/v1/auth/register
router.post('/register', register);

// Route de connexion : POST /api/v1/auth/login
router.post('/login', login);

export default router;