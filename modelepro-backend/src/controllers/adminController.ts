import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Claim } from '../models/Claim';
import { Creation } from '../models/Creation';
import { Order } from '../models/Order';
import { User } from '../models/User';

export const getPendingArtisans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const artisans = await User.findAll({
      where: { role: 'artisan' },
      include: [
        {
          model: Artisan,
          as: 'artisanProfile',
          where: { statutValidation: 'en_attente' },
          required: true,
        },
      ],
      attributes: ['id', 'nom', 'prenom', 'telephone', 'email', 'role', 'statut'],
    });

    res.status(200).json(artisans);
  } catch (error) {
    console.error('Erreur lors de la récupération des artisans en attente :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des artisans en attente.' });
  }
};

export const verifyArtisan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const artisanProfile = await Artisan.findOne({
      where: {
        [Op.or]: [{ userId: id }, { id }],
      },
    });

    if (!artisanProfile) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    await artisanProfile.update({ statutValidation: 'valide' });

    res.status(200).json({ message: 'Profil artisan validé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la validation de l’artisan :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la validation de l’artisan.' });
  }
};

export const deleteModelForce = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deleted = await Creation.destroy({ where: { id: req.params.id } });

    if (!deleted) {
      res.status(404).json({ error: 'Modèle introuvable.' });
      return;
    }

    res.status(200).json({ message: 'Modèle supprimé définitivement.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression du modèle.' });
  }
};

export const getClaims = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const claims = await Claim.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(claims);
  } catch (error) {
    console.error('Erreur lors de la récupération des réclamations :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des réclamations.' });
  }
};

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [totalArtisansActifs, totalClients, totalCommandes, chiffreAffairesTotal] = await Promise.all([
      Artisan.count({ where: { statutValidation: 'valide' } }),
      User.count({ where: { role: 'client' } }),
      Order.count(),
      Order.sum('prix') || 0,
    ]);

    res.status(200).json({
      totalArtisansActifs,
      totalClients,
      totalCommandes,
      chiffreAffairesTotal,
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du calcul des statistiques.' });
  }
};
