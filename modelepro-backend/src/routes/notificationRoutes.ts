import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getNotifications, markAsRead } from '../controllers/notificationController';

const router = Router();

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);

export default router;
