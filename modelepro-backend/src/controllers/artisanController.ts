import { Response } from 'express';
import { Op, fn, col } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from '../models/Artisan';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// 1. Moteur de recherche avancé (Localisation, casse, accents)
export const searchArtisans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { metier, atelier, localisation } = req.query;
    const artisanConditions: any = {};

    if (metier) {
      artisanConditions.métier = { [Op.iLike]: `%${metier}%` };
    }

    if (atelier) {
      artisanConditions.atelier = { [Op.iLike]: `%${atelier}%` };
    }

    if (localisation) {
      artisanConditions[Op.and] = [
        sequelize.where(
          fn('unaccent', col('localisation')),
          { [Op.iLike]: fn('unaccent', `%${localisation}%`) }
        )
      ];
    }

    const artisans = await Artisan.findAll({
      where: artisanConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nom', 'prenom', 'telephone', 'email'],
          where: { statut: 'actif' }
        }
      ]
    });

    res.status(200).json(artisans);
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la recherche.' });
  }
};

// 2. Modification du profil connecté
export const updateArtisanProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== 'artisan') {
      res.status(403).json({ error: 'Accès interdit. Seul un artisan peut modifier ce profil.' });
      return;
    }

    const { nom, prenom, telephone, métier, atelier, description, localisation, horaires, zone } = req.body;

    // Mise à jour de la table commune 'users'
    await User.update(
      { nom, prenom, telephone },
      { where: { id: userId } }
    );

    // Mise à jour de la table spécifique 'artisans'
    await Artisan.update(
      { métier, atelier, description, localisation, horaires, zone },
      { where: { userId } }
    );

    res.status(200).json({ message: 'Profil artisan mis à jour avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du profil.' });
  }
};
// 3. Récupération du profil de l'artisan connecté (pour l'application mobile)
export const getMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== 'artisan') {
      res.status(403).json({ error: 'Accès interdit. Seul un artisan peut accéder à ces informations.' });
      return;
    }

    // On récupère l'artisan avec ses informations d'utilisateur associées
    const artisan = await Artisan.findOne({
      where: { userId }, // Note : s'assure que ton champ est bien camelCase 'userId' ou snake_case 'user_id' selon ton modèle
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nom', 'prenom', 'telephone', 'email']
        }
      ]
    });

    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    res.status(200).json(artisan);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du profil.' });
  }
};