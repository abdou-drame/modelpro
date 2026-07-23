import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { Artisan } from '../models/Artisan';
import { createNotification } from '../services/notificationService';

export const createPayment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { orderId, montant, type, moyen, statut } = req.body;
    if (!orderId || !montant || !type || !moyen) {
      return res.status(400).json({ error: 'Champs requis manquants (orderId, montant, type, moyen).' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    const paymentStatut = statut || 'confirme';

    const payment = await Payment.create({
      orderId: Number(orderId),
      montant: Number(montant),
      type,
      moyen,
      statut: paymentStatut,
    });

    if (paymentStatut === 'confirme') {
      if (type === 'acompte') {
        order.paymentStatus = 'deposit_paid';
      } else if (type === 'solde' || type === 'integral') {
        order.paymentStatus = 'fully_paid';
      }
      await order.save();
    }

    // Notifications
    const artisan = await Artisan.findByPk(order.artisanId);
    if (artisan) {
      await createNotification(
        artisan.userId,
        'paiement',
        'Paiement enregistré',
        `Un paiement de ${montant} FCFA (${type}) a été effectué pour la commande #${order.id}.`,
        order.id
      );
    }
    if (order.clientId) {
      await createNotification(
        order.clientId,
        'paiement',
        'Paiement confirmé',
        `Votre paiement de ${montant} FCFA (${type}) pour la commande #${order.id} est enregistré.`,
        order.id
      );
    }

    res.status(201).json(payment);
  } catch (error) {
    console.error('Erreur createPayment :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création du paiement.' });
  }
};

export const getPaymentsByOrder = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const orderId = Number(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: 'orderId valide requis.' });

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const payments = await Payment.findAll({
      where: { orderId },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error('Erreur getPaymentsByOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des paiements.' });
  }
};
