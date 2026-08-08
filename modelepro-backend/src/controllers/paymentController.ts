import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { Artisan } from '../models/Artisan';
import { Pack } from '../models/Pack';
import { createNotification } from '../services/notificationService';

// Durée en jours ajoutée à l'abonnement selon le cycle choisi.
const CYCLE_DAYS: Record<'mensuel' | 'annuel', number> = { mensuel: 30, annuel: 365 };

export const createPayment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { orderId, artisanId, montant, type, moyen, statut, referenceTransaction, packId, cycle } = req.body;

    const validTypes = ['acompte', 'solde', 'integral', 'frais_service', 'abonnement'];
    const validMoyens = ['wave', 'orange_money', 'free_money', 'especes'];

    if (!type || !moyen) {
      return res.status(400).json({ error: 'Champs requis manquants (type, moyen).' });
    }

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type de paiement invalide. Types acceptés : ${validTypes.join(', ')}` });
    }

    if (!validMoyens.includes(moyen)) {
      return res.status(400).json({ error: `Moyen de paiement invalide. Moyens acceptés : ${validMoyens.join(', ')}` });
    }

    if (type !== 'abonnement' && !montant) {
      return res.status(400).json({ error: 'Champ requis manquant (montant).' });
    }

    const paymentStatut = statut || 'confirme';

    // 1. Cas Abonnement Artisan (pack + cycle choisis explicitement, montant calculé côté serveur)
    if (type === 'abonnement') {
      let targetArtisanId = artisanId;
      if (!targetArtisanId) {
        const artisanProfile = await Artisan.findOne({ where: { userId } });
        if (artisanProfile) {
          targetArtisanId = artisanProfile.id;
        }
      }

      if (!targetArtisanId) {
        return res.status(400).json({ error: 'artisanId requis pour enregistrer un abonnement artisan.' });
      }

      if (!packId || (cycle !== 'mensuel' && cycle !== 'annuel')) {
        return res.status(400).json({ error: 'packId et cycle (mensuel|annuel) requis pour un paiement d\'abonnement.' });
      }

      const pack = await Pack.findByPk(packId);
      if (!pack || !pack.actif) {
        return res.status(404).json({ error: 'Pack introuvable ou inactif.' });
      }

      const montantCalcule = cycle === 'annuel' ? pack.prixAnnuel : pack.prixMensuel;

      const payment = await Payment.create({
        orderId: null,
        artisanId: Number(targetArtisanId),
        montant: montantCalcule,
        type: 'abonnement',
        moyen,
        statut: paymentStatut,
        referenceTransaction: referenceTransaction || null,
        packId: pack.id,
        cycle,
      });

      if (paymentStatut === 'confirme') {
        const artisan = await Artisan.findByPk(targetArtisanId);
        if (artisan) {
          const now = new Date();
          const currentEnd = artisan.dateFinAbonnement && new Date(artisan.dateFinAbonnement) > now
            ? new Date(artisan.dateFinAbonnement)
            : now;

          const newEnd = new Date(currentEnd);
          newEnd.setDate(newEnd.getDate() + CYCLE_DAYS[cycle as 'mensuel' | 'annuel']);

          artisan.statutAbonnement = 'actif';
          artisan.dateFinAbonnement = newEnd;
          artisan.packId = pack.id;
          await artisan.save();

          await createNotification(
            artisan.userId,
            'paiement',
            'Abonnement renouvelé',
            `Votre abonnement ${pack.nom} a été enregistré avec succès (${montantCalcule} FCFA via ${moyen}). Actif jusqu'au ${newEnd.toLocaleDateString()}.`,
            undefined
          );
        }
      }

      return res.status(201).json(payment);
    }

    // 2. Cas Paiement lié à une commande (acompte, solde, integral, frais_service)
    if (!orderId) {
      return res.status(400).json({ error: 'orderId requis pour ce type de paiement.' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    const payment = await Payment.create({
      orderId: Number(orderId),
      artisanId: order.artisanId,
      montant: Number(montant),
      type,
      moyen,
      statut: paymentStatut,
      referenceTransaction: referenceTransaction || null,
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
        `Un paiement de ${montant} FCFA (${type}) via ${moyen} a été effectué pour la commande #${order.id}.`,
        order.id
      );
    }
    if (order.clientId) {
      await createNotification(
        order.clientId,
        'paiement',
        'Paiement confirmé',
        `Votre paiement de ${montant} FCFA (${type}) via ${moyen} pour la commande #${order.id} est enregistré.`,
        order.id
      );
    }

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Erreur createPayment :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la création du paiement.' });
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

    return res.status(200).json(payments);
  } catch (error) {
    console.error('Erreur getPaymentsByOrder :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des paiements.' });
  }
};

export const getPaymentSummary = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const orderId = Number(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: 'orderId valide requis.' });

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const payments = await Payment.findAll({
      where: { orderId, statut: 'confirme' },
    });

    const totalPrice = order.totalPrice || order.prix || 0;
    const depositAmount = order.depositAmount || 0;

    let totalAcomptePaid = 0;
    let totalSoldePaid = 0;
    let totalFraisServicePaid = 0;

    payments.forEach((p) => {
      if (p.type === 'acompte') totalAcomptePaid += p.montant;
      else if (p.type === 'solde' || p.type === 'integral') totalSoldePaid += p.montant;
      else if (p.type === 'frais_service') totalFraisServicePaid += p.montant;
    });

    const totalOrderPaid = totalAcomptePaid + totalSoldePaid;
    const remainingBalance = Math.max(0, totalPrice - totalOrderPaid);

    return res.status(200).json({
      orderId: order.id,
      totalPrice,
      depositAmount,
      totalAcomptePaid,
      totalSoldePaid,
      totalFraisServicePaid,
      totalOrderPaid,
      remainingBalance,
      paymentStatus: order.paymentStatus,
      paymentsHistory: payments,
    });
  } catch (error) {
    console.error('Erreur getPaymentSummary :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors du calcul du résumé de paiement.' });
  }
};

export const getArtisanSubscriptions = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) return res.status(404).json({ error: 'Profil artisan introuvable.' });

    const subscriptions = await Payment.findAll({
      where: {
        artisanId: artisan.id,
        type: 'abonnement',
      },
      order: [['createdAt', 'DESC']],
    });

    const pack = artisan.packId ? await Pack.findByPk(artisan.packId) : null;

    return res.status(200).json({
      statutAbonnement: artisan.statutAbonnement,
      dateFinAbonnement: artisan.dateFinAbonnement,
      pack,
      subscriptions,
    });
  } catch (error) {
    console.error('Erreur getArtisanSubscriptions :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des abonnements.' });
  }
};

export const updatePaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const paymentId = Number(req.params.id);
    const { statut } = req.body;

    const validStatuts = ['en_attente', 'confirme', 'echoue', 'rembourse'];
    if (!statut || !validStatuts.includes(statut)) {
      return res.status(400).json({ error: `Statut valide requis (${validStatuts.join(', ')}).` });
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });

    payment.statut = statut;
    await payment.save();

    // Effet de bord si confirmé
    if (statut === 'confirme') {
      if (payment.orderId) {
        const order = await Order.findByPk(payment.orderId);
        if (order) {
          if (payment.type === 'acompte') {
            order.paymentStatus = 'deposit_paid';
          } else if (payment.type === 'solde' || payment.type === 'integral') {
            order.paymentStatus = 'fully_paid';
          }
          await order.save();
        }
      } else if (payment.type === 'abonnement' && payment.artisanId) {
        const artisan = await Artisan.findByPk(payment.artisanId);
        if (artisan) {
          const now = new Date();
          const currentEnd = artisan.dateFinAbonnement && new Date(artisan.dateFinAbonnement) > now
            ? new Date(artisan.dateFinAbonnement)
            : now;
          const newEnd = new Date(currentEnd);
          const cycle: 'mensuel' | 'annuel' = payment.cycle === 'annuel' ? 'annuel' : 'mensuel';
          newEnd.setDate(newEnd.getDate() + CYCLE_DAYS[cycle]);

          artisan.statutAbonnement = 'actif';
          artisan.dateFinAbonnement = newEnd;
          if (payment.packId) artisan.packId = payment.packId;
          await artisan.save();
        }
      }
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Erreur updatePaymentStatus :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du statut.' });
  }
};
