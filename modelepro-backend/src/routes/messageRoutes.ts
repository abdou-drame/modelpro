import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { getOrderMessages, sendMessage } from '../controllers/messageController';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', protect, upload.single('photo'), sendMessage);
router.get('/order/:orderId', protect, getOrderMessages);

export default router;
