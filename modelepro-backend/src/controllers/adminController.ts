import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Claim } from '../models/Claim';
import { Creation } from '../models/Creation';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Metier } from '../models/Metier';
import { Appointment } from '../models/Appointment';
import { Payment } from '../models/Payment';
import { createNotification } from '../services/notificationService';

// 1. Liste et recherche de tous les utilisateurs (Clients & Artisans & Admins)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, statut } = req.query;

    const whereClause: any = {};
    if (role) whereClause.role = role;
    if (statut) whereClause.statut = statut;

    if (search) {
      const searchTerm = `%${search}%`;
      whereClause[Op.or] = [
        { nom: { [Op.like]: searchTerm } },
        { prenom: { [Op.like]: searchTerm } },
        { telephone: { [Op.like]: searchTerm } },
        { email: { [Op.like]: searchTerm } },
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        { model: Artisan, as: 'artisanProfile', required: false }
      ],
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

// 4. Liste de tous les artisans (Contrôle profils & abonnements)
export const getAllArtisansAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const artisans = await Artisan.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'nom', 'prenom', 'telephone', 'email', 'statut'] }
      ],
      order: [['noteMoyenne', 'DESC']],
    });
    res.status(200).json(artisans);
  } catch (error) {
    console.error('Erreur getAllArtisansAdmin :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des artisans.' });
  }
};

// 5. Valider un artisan avec notification
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

// 6. Rejeter un artisan avec motif et notification
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

// 7. Liste de toutes les commandes avec identification des retards (Admin)
export const getAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] },
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const now = new Date();
    const formattedOrders = orders.map((o) => {
      const orderJson: any = o.toJSON();
      const isLate = Boolean(
        o.deliveryDate &&
        new Date(o.deliveryDate) < now &&
        !['livree', 'annulee'].includes(o.statut)
      );
      orderJson.estEnRetard = isLate;
      return orderJson;
    });

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error('Erreur getAllOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
  }
};

// 8. Obtenir spécifiquement les commandes en retard
export const getOverdueOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const overdueOrders = await Order.findAll({
      where: {
        deliveryDate: { [Op.lt]: now },
        statut: { [Op.notIn]: ['livree', 'annulee'] },
      },
      include: [
        { model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] },
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }
      ],
      order: [['deliveryDate', 'ASC']],
    });

    res.status(200).json(overdueOrders);
  } catch (error) {
    console.error('Erreur getOverdueOrders :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes en retard.' });
  }
};

// 9. Modération des modèles (Consulter tous les modèles du catalogue)
export const getAllModelsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const models = await Creation.findAll({
      include: [
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(models);
  } catch (error) {
    console.error('Erreur getAllModelsAdmin :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des modèles.' });
  }
};

// 10. Suppression forcée / Modération d'un modèle
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

// 11. Consultation globale de tous les Rendez-vous
export const getAllAppointmentsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const appointments = await Appointment.findAll({
      include: [
        { model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] },
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }
      ],
      order: [['date', 'DESC']],
    });
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Erreur getAllAppointmentsAdmin :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des rendez-vous.' });
  }
};

// 12. Consultation des réclamations
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

// 13. Mettre à jour le statut d'une réclamation (en_attente, en_cours, resolu, rejete)
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

// 14. Suivi global des paiements, frais & abonnements
export const getAllPaymentsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payments = await Payment.findAll({
      include: [
        { model: Order, as: 'order', required: false },
        { model: Artisan, as: 'artisan', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(payments);
  } catch (error) {
    console.error('Erreur getAllPaymentsAdmin :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des paiements.' });
  }
};

// 15. Gestion des Métiers (Créer, Modifier, Désactiver)
export const createMetier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nom, description, actif } = req.body;
    if (!nom) {
      res.status(400).json({ error: 'Le nom du métier est requis.' });
      return;
    }
    const metier = await Metier.create({
      nom,
      description: description || null,
      actif: actif !== undefined ? actif : true,
    });
    res.status(201).json(metier);
  } catch (error) {
    console.error('Erreur création métier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const updateMetier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { nom, description, actif } = req.body;

    const metier = await Metier.findByPk(id);
    if (!metier) {
      res.status(404).json({ error: 'Métier introuvable.' });
      return;
    }

    if (nom) metier.nom = nom;
    if (description !== undefined) metier.description = description;
    if (actif !== undefined) metier.actif = actif;

    await metier.save();
    res.status(200).json(metier);
  } catch (error) {
    console.error('Erreur mise à jour métier :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const toggleMetierStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const metier = await Metier.findByPk(id);

    if (!metier) {
      res.status(404).json({ error: 'Métier introuvable.' });
      return;
    }

    metier.actif = !metier.actif;
    await metier.save();
    res.status(200).json({ message: `Métier ${metier.actif ? 'activé' : 'désactivé'} avec succès.`, metier });
  } catch (error) {
    console.error('Erreur toggleMetierStatus :', error);
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

// 16. Tableau de bord & Statistiques globales enrichies (Section 12)
export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const [
      totalUsers,
      totalArtisansActifs,
      totalClients,
      totalCommandes,
      totalAppointments,
      totalClaims,
      chiffreAffairesTotal,
      commandesEnRetardCount,
      totalAbonnementsActifs,
    ] = await Promise.all([
      User.count(),
      Artisan.count({ where: { statutValidation: 'valide' } }),
      User.count({ where: { role: 'client' } }),
      Order.count(),
      Appointment.count(),
      Claim.count(),
      Order.sum('prix') || 0,
      Order.count({
        where: {
          deliveryDate: { [Op.lt]: now },
          statut: { [Op.notIn]: ['livree', 'annulee'] },
        },
      }),
      Artisan.count({ where: { statutAbonnement: 'actif' } }),
    ]);

    // Métiers les plus demandés (basé sur le métier des artisans des commandes)
    const topArtisans = await Artisan.findAll({
      attributes: ['métier', 'noteMoyenne', 'nombreAvis'],
      order: [['noteMoyenne', 'DESC']],
      limit: 5,
    });

    const metiersDistribution: { [key: string]: number } = {};
    const allArtisans = await Artisan.findAll({ attributes: ['métier'] });
    allArtisans.forEach((a) => {
      metiersDistribution[a.métier] = (metiersDistribution[a.métier] || 0) + 1;
    });

    const metiersPlusDemandes = Object.entries(metiersDistribution)
      .map(([metier, count]) => ({ metier, count }))
      .sort((a, b) => b.count - a.count);

    const caTotal = Number(chiffreAffairesTotal || 0);

    res.status(200).json({
      totalUsers,
      totalArtisansActifs,
      totalClients,
      totalCommandes,
      totalAppointments,
      totalClaims,
      chiffreAffairesTotal: caTotal,
      commandesEnRetardCount,
      totalAbonnementsActifs,
      tableauDeBord: {
        totalUsers,
        totalArtisansActifs,
        totalClients,
        totalCommandes,
        totalAppointments,
        totalClaims,
        chiffreAffairesTotal: caTotal,
        commandesEnRetardCount,
        totalAbonnementsActifs,
      },
      statistiquesAvancees: {
        metiersPlusDemandes,
        artisansMieuxNotes: topArtisans,
      },
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du calcul des statistiques.' });
  }
};
