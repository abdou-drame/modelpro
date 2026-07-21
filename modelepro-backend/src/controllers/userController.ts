import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import { Review } from '../models/Review';
import { fn, col } from 'sequelize';

/**
 * GET /api/v1/users/me
 * Retourne le profil de l'utilisateur connecté (sans mot de passe).
 */
export const getMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    return res.status(200).json(user);
  } catch (error) {
    console.error('Erreur getMyProfile :', error);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

/**
 * PUT /api/v1/users/me
 * Met à jour le profil de l'utilisateur connecté.
 */
export const updateMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { nom, prenom, telephone, email } = req.body;

    await User.update(
      { nom, prenom, telephone, email },
      { where: { id: userId } }
    );

    const updated = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Erreur updateMyProfile :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour.' });
  }
};

/**
 * GET /api/v1/artisans/:id
 * Profil public d'un artisan avec créations et note moyenne.
 */
export const getPublicArtisanProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const artisanId = Number(req.params.id);
    if (!artisanId || isNaN(artisanId)) return res.status(400).json({ error: 'ID artisan invalide.' });

    const artisan = await Artisan.findByPk(artisanId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nom', 'prenom', 'telephone'],
        },
        {
          model: Creation,
          as: 'catalogue',
          attributes: ['id', 'titre', 'description', 'photoUrl', 'prixEstimatif'],
        },
      ],
    });

    if (!artisan) return res.status(404).json({ error: 'Artisan introuvable.' });

    // Calcul de la note moyenne
    const reviewResult = await Review.findOne({
      where: { artisanId },
      attributes: [[fn('AVG', col('note')), 'noteMoyenne']],
      raw: true,
    });
    const noteMoyenne = reviewResult ? Number((reviewResult as any).noteMoyenne) || 0 : 0;

    return res.status(200).json({ ...artisan.toJSON(), noteMoyenne });
  } catch (error) {
    console.error('Erreur getPublicArtisanProfile :', error);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
