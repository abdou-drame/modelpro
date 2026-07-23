import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { Client } from '../models/Client';
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
 * Met à jour le profil de l'utilisateur connecté (dont la photo et la localisation pour le client).
 */
export const updateMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { nom, prenom, telephone, email, photoUrl, localisation } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    await user.update({
      ...(nom !== undefined && { nom }),
      ...(prenom !== undefined && { prenom }),
      ...(telephone !== undefined && { telephone }),
      ...(email !== undefined && { email }),
      ...(photoUrl !== undefined && { photoUrl }),
    });

    if (user.role === 'client' && localisation !== undefined) {
      await Client.update({ localisation }, { where: { userId } });
    }

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
 * PATCH /api/v1/users/fcm-token
 * Enregistre ou met à jour le jeton FCM de notification push pour l'utilisateur connecté.
 */
export const updateFcmToken = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'Le champ fcmToken est requis.' });

    await User.update({ fcmToken }, { where: { id: userId } });

    return res.status(200).json({ message: 'Token FCM mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur updateFcmToken :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du token FCM.' });
  }
};

/**
 * GET /api/v1/artisans/:id
 * Profil public d'un artisan avec créations, note moyenne et nombre d'avis.
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
          attributes: ['id', 'nom', 'prenom', 'telephone', 'photoUrl'],
        },
        {
          model: Creation,
          as: 'catalogue',
          attributes: ['id', 'titre', 'description', 'photoUrl', 'prixEstimatif', 'delaiEstime', 'options', 'categorie'],
        },
      ],
    });

    if (!artisan) return res.status(404).json({ error: 'Artisan introuvable.' });

    // Calcul de la note moyenne et du nombre d'avis
    const reviewStats = await Review.findOne({
      where: { artisanId },
      attributes: [
        [fn('AVG', col('note')), 'noteMoyenne'],
        [fn('COUNT', col('id')), 'nombreAvis'],
      ],
      raw: true,
    });

    const noteMoyenne = reviewStats ? Number((reviewStats as any).noteMoyenne) || 0 : 0;
    const nombreAvis = reviewStats ? Number((reviewStats as any).nombreAvis) || 0 : 0;

    return res.status(200).json({ ...artisan.toJSON(), noteMoyenne, nombreAvis });
  } catch (error) {
    console.error('Erreur getPublicArtisanProfile :', error);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
