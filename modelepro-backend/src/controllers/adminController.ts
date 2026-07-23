import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Claim } from '../models/Claim';
import { Creation } from '../models/Creation';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Metier } from '../models/Metier';
import { createNotification } from '../services/notificationService';

// 1. Liste de tous les utilisateurs (Admin)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Erreur getAllUsers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des utilisateurs.' });
  }
};

// 2. Suspension / activation d'un compte utilisateur (Admin)
export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!statut || !['actif', 'suspendu'].includes(statut)) {
      res.status(400).json({ error: 'Statut invalide (actif ou suspendu).' });
      return;
    }

    const user = await User.findByPk(Number(id));
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    user.statut = statut;
    await user.save();

    res.status(200).json({ message: `Le compte a été marqué comme ${statut}.`, user });
  } catch (error) {
    console.error('Erreur toggleUserStatus :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// 3. Liste des artisans en attente
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

// 4. Valider un artisan avec notification
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

    // Notification à l'artisan
    await createNotification(
      artisanProfile.userId,
      'rdv_statut',
      'Profil artisan validé !',
      'Votre profil artisan a été validé par l\'administration. Vous pouvez maintenant recevoir des commandes.',
      artisanProfile.id
    );

    res.status(200).json({ message: 'Profil artisan validé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la validation de l’artisan :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la validation de l’artisan.' });
  }
};

// 5. Rejeter un artisan avec motif et notification
export const rejectArtisan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motifRejet } = req.body;

    const artisanProfile = await Artisan.findOne({
      where: {
        [Op.or]: [{ userId: id }, { id }],
      },
    });

    if (!artisanProfile) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    await artisanProfile.update({
      statutValidation: 'rejete',
      motifRejet: motifRejet || null,
    });

    // Notification à l'artisan
    await createNotification(
      artisanProfile.userId,
      'rdv_statut',
      'Profil artisan non validé',
      `Votre profil n'a pas été validé. Motif : ${motifRejet || 'Dossier incomplet.'}`,
      artisanProfile.id
    );

    res.status(200).json({ message: 'Profil artisan rejeté avec motif.', artisanProfile });
  } catch (error) {
    console.error('Erreur rejectArtisan :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du rejet de l\'artisan.' });
  }
};

// 6. Liste de toutes les commandes (Admin)
export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] },
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur getAllOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
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
      include: [{ model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] }],
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
    const [totalUsers, totalArtisansActifs, totalClients, totalCommandes, totalClaims, chiffreAffairesTotal] = await Promise.all([
      User.count(),
      Artisan.count({ where: { statutValidation: 'valide' } }),
      User.count({ where: { role: 'client' } }),
      Order.count(),
      Claim.count(),
      Order.sum('prix') || 0,
    ]);

    res.status(200).json({
      totalUsers,
      totalArtisansActifs,
      totalClients,
      totalCommandes,
      totalClaims,
      chiffreAffairesTotal: Number(chiffreAffairesTotal || 0),
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du calcul des statistiques.' });
  }
};

export const updateClaimStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { statut } = req.body;
    
    const allowedStatuses = ['en_attente', 'en_cours', 'resolu', 'rejete'];
    if (!statut || !allowedStatuses.includes(statut)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }

    const claim = await Claim.findByPk(Number(id));
    if (!claim) {
      res.status(404).json({ error: 'Réclamation introuvable.' });
      return;
    }

    claim.statut = statut;
    await claim.save();

    res.status(200).json(claim);
  } catch (error) {
    console.error('Erreur mise à jour de la réclamation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour.' });
  }
};

export const createMetier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nom, description } = req.body;
    if (!nom) {
      res.status(400).json({ error: 'Le nom du métier est requis.' });
      return;
    }
    const metier = await Metier.create({ nom, description });
    res.status(201).json(metier);
  } catch (error) {
    console.error('Erreur création métier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const updateMetier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { nom, description } = req.body;
    
    const metier = await Metier.findByPk(id);
    if (!metier) {
      res.status(404).json({ error: 'Métier introuvable.' });
      return;
    }
    
    if (nom) metier.nom = nom;
    if (description !== undefined) metier.description = description;
    
    await metier.save();
    res.status(200).json(metier);
  } catch (error) {
    console.error('Erreur mise à jour métier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const deleteMetier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const metier = await Metier.findByPk(id);
    
    if (!metier) {
      res.status(404).json({ error: 'Métier introuvable.' });
      return;
    }
    
    await metier.destroy();
    res.status(200).json({ message: 'Métier supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur suppression métier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
