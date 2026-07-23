import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';

const router = Router();

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);

export default router;
