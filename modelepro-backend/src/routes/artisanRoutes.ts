import { Router } from 'express';
import { searchArtisans, updateArtisanProfile } from '../controllers/artisanController';
import { protect } from '../middlewares/authMiddleware'; // <-- Import du middleware

const router = Router();

// Route publique : Recherche d'artisans
router.get('/search', searchArtisans);

// Route privée : Modification du profil (L'artisan doit être connecté)
router.put('/profile', protect, updateArtisanProfile);

export default router;