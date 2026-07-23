import { Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Appointment } from '../models/Appointment';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { createNotification } from '../services/notificationService';

const parseIdParam = (value: string | string[] | undefined): number | null => {
  if (!value) return null;
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const appointments = await Appointment.findAll({
      where: { artisanId: artisan.id },
      include: [{ model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Erreur récupération des rendez-vous :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des rendez-vous.' });
  }
};

const appointmentStatuses = ['confirme', 'annule'];

export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const appointmentId = parseIdParam(req.params.id);
    if (appointmentId === null) {
      res.status(400).json({ error: 'Identifiant de rendez-vous invalide.' });
      return;
    }

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Rendez-vous introuvable.' });
      return;
    }

    if (appointment.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas modifier un rendez-vous qui ne vous appartient pas.' });
      return;
    }

    const { statut, motifRefus } = req.body;
    const allowedStatuses = ['confirme', 'annule', 'accepte', 'refuse', 'termine'];
    if (!statut || !allowedStatuses.includes(statut)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }

    appointment.statut = statut;
    if (statut === 'refuse' && motifRefus) {
      appointment.motifRefus = motifRefus;
    }
    await appointment.save();

    // Notifier le client du changement de statut du RDV
    await createNotification(
      appointment.clientId,
      'rdv_statut',
      'Mise à jour de votre rendez-vous',
      `Votre rendez-vous a été marqué comme : ${statut}${motifRefus ? `. Motif : ${motifRefus}` : ''}.`,
      appointment.id
    );

    res.status(200).json(appointment);
  } catch (error) {
    console.error('Erreur mise à jour du statut rendez-vous :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du rendez-vous.' });
  }
};

export const rescheduleAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const appointmentId = parseIdParam(req.params.id);
    if (appointmentId === null) {
      res.status(400).json({ error: 'Identifiant de rendez-vous invalide.' });
      return;
    }

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Rendez-vous introuvable.' });
      return;
    }

    if (appointment.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas modifier un rendez-vous qui ne vous appartient pas.' });
      return;
    }

    const { proposedDate } = req.body;
    if (!proposedDate) {
      res.status(400).json({ error: 'Date proposée (proposedDate) requise.' });
      return;
    }

    appointment.statut = 'reporte';
    appointment.proposedDate = new Date(proposedDate);
    await appointment.save();

    await createNotification(
      appointment.clientId,
      'rdv_statut',
      'Proposition de report de rendez-vous',
      `L'artisan a proposé une nouvelle date pour votre rendez-vous : ${appointment.proposedDate.toLocaleDateString()}.`,
      appointment.id
    );

    res.status(200).json(appointment);
  } catch (error) {
    console.error('Erreur report rendez-vous :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du report du rendez-vous.' });
  }
};

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const orders = await Order.findAll({
      where: { artisanId: artisan.id },
      include: [{ model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur récupération des commandes :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
  }
};

export const getOrderDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const orderId = parseIdParam(req.params.id);
    if (orderId === null) {
      res.status(400).json({ error: 'Identifiant de commande invalide.' });
      return;
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'client', attributes: ['nom', 'prenom', 'telephone'] }],
    });

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    if (order.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas accéder à une commande qui ne vous appartient pas.' });
      return;
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur récupération du détail commande :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du détail de la commande.' });
  }
};

const orderStatuses = ['en_attente', 'acceptee', 'en_cours', 'en_finition', 'prete', 'livree', 'annulee'];

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const orderId = parseIdParam(req.params.id);
    if (orderId === null) {
      res.status(400).json({ error: 'Identifiant de commande invalide.' });
      return;
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    if (order.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas modifier une commande qui ne vous appartient pas.' });
      return;
    }

    const { statut, motifAnnulation } = req.body;
    if (!statut || !orderStatuses.includes(statut)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }

    order.statut = statut as any;
    if (statut === 'annulee' && motifAnnulation) {
      order.motifAnnulation = motifAnnulation;
    }
    await order.save();

    await createNotification(
      order.clientId,
      'commande_statut',
      'Mise à jour du statut de votre commande',
      `Votre commande est maintenant : ${statut.replace('_', ' ')}.`,
      order.id
    );

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur mise à jour du statut commande :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du statut de la commande.' });
  }
};

export const updateOrderDeliveryDate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const orderId = parseIdParam(req.params.id);
    if (!orderId) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }

    const order = await Order.findByPk(orderId);
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }
    if (order.artisanId !== artisan.id) { res.status(403).json({ error: 'Accès refusé.' }); return; }

    const { deliveryDate, deliveryDateReason } = req.body;
    
    order.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    order.deliveryDateReason = deliveryDateReason || null;
    await order.save();

    if (order.deliveryDate) {
      await createNotification(
        order.clientId,
        'commande_statut',
        'Date de réception fixée ou modifiée',
        `La date de livraison prévue est le ${order.deliveryDate.toLocaleDateString()}.`,
        order.id
      );
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur updateOrderDeliveryDate :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const updateOrderPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const orderId = parseIdParam(req.params.id);
    if (!orderId) { res.status(400).json({ error: 'Identifiant invalide.' }); return; }

    const order = await Order.findByPk(orderId);
    if (!order) { res.status(404).json({ error: 'Commande introuvable.' }); return; }
    if (order.artisanId !== artisan.id) { res.status(403).json({ error: 'Accès refusé.' }); return; }

    const { paymentStatus, depositAmount, totalPrice } = req.body;
    const allowedPaymentStatuses = ['unpaid', 'deposit_paid', 'fully_paid'];
    if (paymentStatus && !allowedPaymentStatuses.includes(paymentStatus)) {
      res.status(400).json({ error: 'Statut de paiement invalide.' });
      return;
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (depositAmount !== undefined) order.depositAmount = depositAmount;
    if (totalPrice !== undefined) order.totalPrice = totalPrice;
    
    await order.save();

    await createNotification(
      order.clientId,
      'commande_statut',
      'Mise à jour du paiement',
      `Le statut de paiement de votre commande est maintenant : ${order.paymentStatus}.`,
      order.id
    );

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur updateOrderPayment :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

export const getArtisanStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const chiffreAffaires = await Order.sum('prix', {
      where: {
        artisanId: artisan.id,
        statut: 'livree',
      },
    });

    const commandesEnCours = await Order.count({
      where: {
        artisanId: artisan.id,
        statut: {
          [Op.in]: ['en_cours', 'en_finition', 'prete'],
        },
      },
    });

    const reviewResult = await Review.findOne({
      where: { artisanId: artisan.id },
      attributes: [[fn('AVG', col('note')), 'noteGlobale']],
      raw: true,
    });

    // TypeScript can't infer the raw aggregation shape from Sequelize.
    // Use `any` to silence the type-check (we trust the DB return shape).
    const noteGlobale = reviewResult ? Number((reviewResult as any).noteGlobale) || 0 : 0;

    res.status(200).json({
      chiffreAffaires: Number(chiffreAffaires || 0),
      commandesEnCours,
      noteGlobale,
    });
  } catch (error) {
    console.error('Erreur récupération des statistiques artisan :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des statistiques.' });
  }
};
