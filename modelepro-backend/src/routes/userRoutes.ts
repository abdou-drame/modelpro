import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

export default router;
