import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { createModel, getMyModels, deleteModel } from '../controllers/modelController';

const router = Router();

router.use(protect, restrictTo('artisan'));
router.post('/', createModel);
router.get('/my-models', getMyModels);
router.delete('/:id', deleteModel);

export default router;
