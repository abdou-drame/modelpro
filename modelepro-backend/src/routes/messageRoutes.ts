import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { getOrderMessages, sendMessage, getConversations, markMessageAsRead } from '../controllers/messageController';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé. Seules les images sont acceptées.'));
    }
  },
});

router.post('/', protect, upload.single('photo'), sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/order/:orderId', protect, getOrderMessages);
router.patch('/:id/read', protect, markMessageAsRead);

export default router;
