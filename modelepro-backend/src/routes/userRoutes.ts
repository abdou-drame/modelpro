import { Router } from 'express';
import { getMyProfile, updateMyProfile, updateFcmToken } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.patch('/fcm-token', protect, updateFcmToken);

export default router;
