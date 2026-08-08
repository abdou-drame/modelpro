import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { Artisan } from '../models/Artisan';
import { Pack } from '../models/Pack';
import { createNotification } from '../services/notificationService';
import { initiatePayment as initiatePaytechPayment, verifyIpnSignature, buildAppRedirectUrl } from '../services/paytechService';

// Durée en jours ajoutée à l'abonnement selon le cycle choisi.
const CYCLE_DAYS: Record<'mensuel' | 'annuel', number> = { mensuel: 30, annuel: 365 };

/**
 * Applique l'effet d'un paiement d'abonnement confirmé : prolonge dateFinAbonnement,
 * active l'artisan sur le pack payé, notifie. Réutilisé par updatePaymentStatus (confirmation
 * manuelle) et par l'IPN PayTech (confirmation automatique).
 */
const applyConfirmedAbonnementEffect = async (payment: Payment): Promise<void> => {
  if (!payment.artisanId) return;

  const artisan = await Artisan.findByPk(payment.artisanId);
  if (!artisan) return;

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

  const pack = payment.packId ? await Pack.findByPk(payment.packId) : null;
  await createNotification(
    artisan.userId,
    'paiement',
    'Abonnement renouvelé',
    `Votre abonnement${pack ? ' ' + pack.nom : ''} a été confirmé (${payment.montant} FCFA via ${payment.moyen}). Actif jusqu'au ${newEnd.toLocaleDateString()}.`,
    undefined
  );
};

/**
 * Applique l'effet d'un paiement de commande confirmé : met à jour paymentStatus, notifie
 * artisan + client. Réutilisé par le paiement en espèces (confirmation immédiate),
 * updatePaymentStatus (confirmation manuelle) et l'IPN PayTech (confirmation automatique).
 */
const applyConfirmedOrderPaymentEffect = async (payment: Payment): Promise<void> => {
  if (!payment.orderId) return;

  const order = await Order.findByPk(payment.orderId);
  if (!order) return;

  if (payment.type === 'acompte') {
    order.paymentStatus = 'deposit_paid';
  } else if (payment.type === 'solde' || payment.type === 'integral') {
    order.paymentStatus = 'fully_paid';
  }
  await order.save();

  const artisan = await Artisan.findByPk(order.artisanId);
  if (artisan) {
    await createNotification(
      artisan.userId,
      'paiement',
      'Paiement reçu',
      `Un paiement de ${payment.montant} FCFA (${payment.type}) via ${payment.moyen} a été effectué pour la commande #${order.id}.`,
      order.id
    );
  }
  if (order.clientId) {
    await createNotification(
      order.clientId,
      'paiement',
      'Paiement confirmé',
      `Votre paiement de ${payment.montant} FCFA (${payment.type}) via ${payment.moyen} pour la commande #${order.id} est confirmé.`,
      order.id
    );
  }
};

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

      // Paiement électronique (wave/orange_money/free_money) : passage obligatoire par PayTech.
      // Le statut n'est jamais pris depuis le client ici — sinon n'importe quel utilisateur
      // authentifié pourrait s'auto-confirmer un abonnement sans payer.
      if (moyen !== 'especes') {
        const payment = await Payment.create({
          orderId: null,
          artisanId: Number(targetArtisanId),
          montant: montantCalcule,
          type: 'abonnement',
          moyen,
          statut: 'en_attente',
          referenceTransaction: null,
          packId: pack.id,
          cycle,
        });

        try {
          const mobileScheme = process.env.MOBILE_APP_SCHEME || 'modelpro';
          const paytechResponse = await initiatePaytechPayment({
            itemName: `Abonnement ${pack.nom}`,
            itemPrice: montantCalcule,
            refCommand: `ABO-${payment.id}`,
            commandName: `Abonnement ${pack.nom} (${cycle}) - artisan #${targetArtisanId}`,
            customField: { paymentId: payment.id, type: 'abonnement' },
            successUrl: buildAppRedirectUrl(`${mobileScheme}://(artisan)/subscription?payment=success`),
            cancelUrl: buildAppRedirectUrl(`${mobileScheme}://(artisan)/subscription?payment=cancel`),
          });

          payment.referenceTransaction = paytechResponse.token;
          await payment.save();

          return res.status(201).json({ ...payment.toJSON(), redirectUrl: paytechResponse.redirect_url });
        } catch (paytechError) {
          console.error('Erreur initiation PayTech :', paytechError);
          payment.statut = 'echoue';
          await payment.save();
          return res.status(502).json({ error: "Impossible d'initier le paiement PayTech." });
        }
      }

      // Paiement en espèces : déclaratif, confirmé directement (remise en main propre).
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

    // Paiement électronique (wave/orange_money/free_money) : passage obligatoire par PayTech,
    // même logique que pour l'abonnement artisan — le statut n'est jamais pris depuis le client,
    // sinon n'importe quel client pourrait s'auto-déclarer un paiement sans avoir payé.
    if (moyen !== 'especes') {
      const payment = await Payment.create({
        orderId: Number(orderId),
        artisanId: order.artisanId,
        montant: Number(montant),
        type,
        moyen,
        statut: 'en_attente',
        referenceTransaction: null,
      });

      try {
        const mobileScheme = process.env.MOBILE_APP_SCHEME || 'modelpro';
        const paytechResponse = await initiatePaytechPayment({
          itemName: `Paiement ${type} - commande #${order.id}`,
          itemPrice: Number(montant),
          refCommand: `ORD-${payment.id}`,
          commandName: `Paiement ${type} - commande #${order.id}`,
          customField: { paymentId: payment.id, type: 'commande' },
          successUrl: buildAppRedirectUrl(`${mobileScheme}://(client)/payment?orderId=${order.id}&payment=success`),
          cancelUrl: buildAppRedirectUrl(`${mobileScheme}://(client)/payment?orderId=${order.id}&payment=cancel`),
        });

        payment.referenceTransaction = paytechResponse.token;
        await payment.save();

        return res.status(201).json({ ...payment.toJSON(), redirectUrl: paytechResponse.redirect_url });
      } catch (paytechError) {
        console.error('Erreur initiation PayTech (commande) :', paytechError);
        payment.statut = 'echoue';
        await payment.save();
        return res.status(502).json({ error: "Impossible d'initier le paiement PayTech." });
      }
    }

    // Espèces : déclaratif, confirmé directement (remise en main propre).
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
      await applyConfirmedOrderPaymentEffect(payment);
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
        await applyConfirmedOrderPaymentEffect(payment);
      } else if (payment.type === 'abonnement') {
        await applyConfirmedAbonnementEffect(payment);
      }
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Erreur updatePaymentStatus :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du statut.' });
  }
};

/**
 * Webhook public appelé par PayTech (IPN) après validation ou annulation d'un paiement.
 * Route non authentifiée par JWT — la confiance vient de la vérification de signature PayTech.
 */
export const handlePaytechIpn = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!verifyIpnSignature(req.body)) {
      console.warn('[PayTech IPN] Signature invalide, requête rejetée.', req.body);
      return res.status(403).send('IPN KO NOT FROM PAYTECH');
    }

    let customField: { paymentId?: number } = {};
    try {
      customField = JSON.parse(req.body.custom_field || '{}');
    } catch {
      customField = {};
    }

    const paymentId = Number(customField.paymentId);
    if (!paymentId) {
      return res.status(400).send('custom_field invalide : paymentId manquant.');
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).send('Paiement introuvable.');
    }

    // Idempotence : PayTech peut renvoyer plusieurs fois la même notification.
    if (payment.statut === 'confirme') {
      return res.status(200).send('IPN OK (déjà traité)');
    }

    if (req.body.type_event === 'sale_complete') {
      payment.statut = 'confirme';
      await payment.save();

      if (payment.orderId) {
        await applyConfirmedOrderPaymentEffect(payment);
      } else if (payment.type === 'abonnement') {
        await applyConfirmedAbonnementEffect(payment);
      }
    } else if (req.body.type_event === 'sale_canceled') {
      payment.statut = 'echoue';
      await payment.save();
    }

    return res.status(200).send('IPN OK');
  } catch (error) {
    console.error('Erreur handlePaytechIpn :', error);
    return res.status(500).send('Erreur serveur');
  }
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Page de rebond publique : PayTech redirige le navigateur ici (successUrl/cancelUrl doivent
 * être en http(s), voir buildAppRedirectUrl) après paiement, et cette page renvoie l'utilisateur
 * vers le deep link réel de l'app mobile (modelpro://...). N'a aucun rôle dans la confirmation
 * du paiement, qui passe par handlePaytechIpn — sert uniquement à ramener l'utilisateur dans l'app.
 */
export const handlePaymentRedirect = (req: Request, res: Response): void => {
  const to = typeof req.query.to === 'string' ? req.query.to : '';
  const mobileScheme = process.env.MOBILE_APP_SCHEME || 'modelpro';

  if (!to.startsWith(`${mobileScheme}://`)) {
    res.status(400).send('Redirection invalide.');
    return;
  }

  const safeTo = escapeHtml(to);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${safeTo}" />
    <title>Retour à l'application...</title>
  </head>
  <body>
    <p>Retour à l'application...</p>
    <p><a href="${safeTo}">Cliquez ici si rien ne se passe.</a></p>
    <script>window.location.href = ${JSON.stringify(to)};</script>
  </body>
</html>`);
};
