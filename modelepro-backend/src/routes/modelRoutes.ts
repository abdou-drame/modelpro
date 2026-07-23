import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { createModel, updateModel, getMyModels, deleteModel, getAllModels, getModelById } from '../controllers/modelController';

const router = Router();

// Public endpoints
router.get('/', getAllModels);

// Protected artisan endpoints
router.get('/my-models', protect, restrictTo('artisan'), getMyModels);

// Public endpoint for individual model lookup
router.get('/:id', getModelById);

router.post('/', protect, restrictTo('artisan'), createModel);
router.put('/:id', protect, restrictTo('artisan'), updateModel);
router.delete('/:id', protect, restrictTo('artisan'), deleteModel);

export default router;
