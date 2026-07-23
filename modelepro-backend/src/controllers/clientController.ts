import { Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Metier } from '../models/Metier';
import { Creation } from '../models/Creation';
import { Appointment } from '../models/Appointment';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { Claim } from '../models/Claim';
import { Artisan } from '../models/Artisan';
import { User } from '../models/User';
import { createNotification } from '../services/notificationService';

export const getMetiers = async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const metiers = await Metier.findAll();
    res.status(200).json(metiers);
  } catch (error) {
    console.error('Erreur récupération des métiers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des métiers.' });
  }
};

// --- RENDEZ-VOUS CLIENT ---

export const createAppointment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, date, heure, notes, type } = req.body;
    if (!artisanId || !date) return res.status(400).json({ error: 'artisanId et date requis.' });

    const appointment = await Appointment.create({ artisanId, clientId, date, notes, type: type || null, statut: 'demande' });

    // Notifier l'artisan
    const artisan = await Artisan.findByPk(artisanId);
    if (artisan) {
      await createNotification(
        artisan.userId,
        'demande_rdv',
        'Nouvelle demande de rendez-vous',
        'Un client a formulé une demande de rendez-vous.',
        appointment.id
      );
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Erreur création rendez-vous :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création du rendez-vous.' });
  }
};

export const getMyAppointments = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const appointments = await Appointment.findAll({
      where: { clientId },
      include: [
        {
          model: Artisan,
          as: 'artisan',
          include: [{ model: User, as: 'user', attributes: ['nom', 'prenom', 'telephone'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Erreur getMyAppointments :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

export const cancelAppointment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const id = Number(req.params.id);
    const appointment = await Appointment.findByPk(id);

    if (!appointment) return res.status(404).json({ error: 'Rendez-vous introuvable.' });

    // Client ou Artisan propriétaire
    const artisanProfile = await Artisan.findOne({ where: { userId } });
    const isClient = appointment.clientId === userId;
    const isArtisan = artisanProfile && appointment.artisanId === artisanProfile.id;

    if (!isClient && !isArtisan) {
      return res.status(403).json({ error: 'Non autorisé à annuler ce rendez-vous.' });
    }

    appointment.statut = 'annule';
    await appointment.save();

    const recipientId = isClient ? (artisanProfile ? artisanProfile.userId : (await Artisan.findByPk(appointment.artisanId))?.userId) : appointment.clientId;
    if (recipientId) {
      await createNotification(
        recipientId,
        'rdv_statut',
        'Rendez-vous annulé',
        'Un rendez-vous a été annulé.',
        appointment.id
      );
    }

    res.status(200).json(appointment);
  } catch (error) {
    console.error('Erreur cancelAppointment :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- COMMANDES CLIENT ---

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, modeleId, mesures, photoTissu, consignes, prix, couleur, taille, matiere, customizationText, customizationPhoto } = req.body;
    if (!artisanId) return res.status(400).json({ error: 'artisanId requis.' });

    const artisan = await Artisan.findByPk(artisanId);
    if (!artisan) return res.status(404).json({ error: 'Artisan introuvable.' });

    const order = await Order.create({
      artisanId,
      clientId,
      modeleId: modeleId ? Number(modeleId) : null,
      mesures: mesures || null,
      photoTissu: photoTissu || null,
      consignes: consignes || null,
      prix: prix || 0,
      couleur: couleur || null,
      taille: taille || null,
      matiere: matiere || null,
      customizationText: customizationText || null,
      customizationPhoto: customizationPhoto || null,
      statut: 'en_attente',
      paymentStatus: 'unpaid'
    });

    // Incrémenter le nombreCommandes du modèle si lié
    if (modeleId) {
      await Creation.increment('nombreCommandes', { where: { id: modeleId } });
    }

    // Notifier automatiquement l'artisan lors d'une nouvelle commande
    await createNotification(
      artisan.userId,
      'commande_statut',
      'Nouvelle commande reçue !',
      'Vous avez reçu une nouvelle commande d\'un client.',
      order.id
    );

    res.status(201).json(order);
  } catch (error) {
    console.error('Erreur création commande :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la commande.' });
  }
};

export const getMyOrders = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const orders = await Order.findAll({
      where: { clientId },
      include: [
        {
          model: Artisan,
          as: 'artisan',
          include: [{ model: User, as: 'user', attributes: ['nom', 'prenom', 'telephone'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur récupération commandes client :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const id = Number(req.params.id);
    const { motifAnnulation } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const artisanProfile = await Artisan.findOne({ where: { userId } });
    const isClient = order.clientId === userId;
    const isArtisan = artisanProfile && order.artisanId === artisanProfile.id;

    if (!isClient && !isArtisan) {
      return res.status(403).json({ error: 'Non autorisé à annuler cette commande.' });
    }

    order.statut = 'annulee';
    order.motifAnnulation = motifAnnulation || null;
    await order.save();

    const recipientId = isClient ? (artisanProfile ? artisanProfile.userId : (await Artisan.findByPk(order.artisanId))?.userId) : order.clientId;
    if (recipientId) {
      await createNotification(
        recipientId,
        'commande_statut',
        'Commande annulée',
        `La commande a été annulée. Motif : ${motifAnnulation || 'Non spécifié'}.`,
        order.id
      );
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Erreur cancelOrder :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'annulation de la commande.' });
  }
};

// --- SYSTÈME D'AVIS ---

export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, note, noteQualite, noteDelai, noteCommunication, notePrix, noteProfessionnalisme, commentaire } = req.body;
    if (!artisanId) return res.status(400).json({ error: 'artisanId requis.' });

    // Exiger qu'au moins une commande soit avec statut 'livree' avec cet artisan
    const deliveredOrder = await Order.findOne({
      where: { clientId, artisanId: Number(artisanId), statut: 'livree' }
    });

    if (!deliveredOrder) {
      return res.status(403).json({ error: 'Vous ne pouvez laisser un avis qu’après une commande livrée par cet artisan.' });
    }

    // Calcul de la note globale à partir des 5 sous-notes ou de la note directe
    const subNotes = [noteQualite, noteDelai, noteCommunication, notePrix, noteProfessionnalisme].map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 5);
    let calculatedNote = Number(note);
    if (isNaN(calculatedNote) && subNotes.length === 0) {
      calculatedNote = 5;
    }
    if (subNotes.length > 0) {
      calculatedNote = Math.round(subNotes.reduce((a, b) => a + b, 0) / subNotes.length);
    }

    if (calculatedNote < 1 || calculatedNote > 5) {
      return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5.' });
    }

    const review = await Review.create({
      artisanId: Number(artisanId),
      clientId,
      note: calculatedNote,
      noteQualite: noteQualite ? Number(noteQualite) : null,
      noteDelai: noteDelai ? Number(noteDelai) : null,
      noteCommunication: noteCommunication ? Number(noteCommunication) : null,
      notePrix: notePrix ? Number(notePrix) : null,
      noteProfessionnalisme: noteProfessionnalisme ? Number(noteProfessionnalisme) : null,
      commentaire: commentaire || null,
    });

    // Mise à jour automatique de la noteMoyenne et du nombreAvis sur l'artisan
    const stats = await Review.findOne({
      where: { artisanId: Number(artisanId) },
      attributes: [
        [fn('AVG', col('note')), 'avgNote'],
        [fn('COUNT', col('id')), 'countAvis'],
      ],
      raw: true,
    });

    const newAvg = stats ? Number((stats as any).avgNote) || 0 : 0;
    const newCount = stats ? Number((stats as any).countAvis) || 0 : 0;

    await Artisan.update(
      { noteMoyenne: newAvg, nombreAvis: newCount },
      { where: { id: Number(artisanId) } }
    );

    res.status(201).json(review);
  } catch (error) {
    console.error('Erreur création évaluation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de l’évaluation.' });
  }
};

export const getArtisanReviews = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const artisanId = Number(req.params.artisanId);
    if (!artisanId) return res.status(400).json({ error: 'artisanId valide requis.' });

    const reviews = await Review.findAll({
      where: { artisanId },
      include: [{ model: User, as: 'client', attributes: ['id', 'nom', 'prenom', 'photoUrl'] }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Erreur getArtisanReviews :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des avis.' });
  }
};

// --- RÉCLAMATIONS ---

export const createClaim = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { orderId, sujet, description, preuvePhotoUrl } = req.body;
    if (!sujet) return res.status(400).json({ error: 'Le sujet de la réclamation est requis.' });

    const validMotifs = ['retard', 'mauvaise_qualite', 'non_conforme', 'artisan_absent', 'paiement_conteste', 'non_reception', 'comportement_inapproprie'];
    if (!validMotifs.includes(sujet)) {
      // Si le sujet ne fait pas partie des motifs standardisés, on l'autorise si texte libre, sinon on peut valider
    }

    if (orderId) {
      const order = await Order.findByPk(String(orderId));
      if (!order || order.clientId !== clientId) {
        return res.status(403).json({ error: 'Commande introuvable ou non autorisée.' });
      }
    }

    const claim = await Claim.create({
      orderId: orderId ? Number(orderId) : null,
      clientId,
      sujet,
      description: description || null,
      preuvePhotoUrl: preuvePhotoUrl || null,
      statut: 'en_attente',
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Erreur création réclamation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la réclamation.' });
  }
};

export const getMyClaims = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const claims = await Claim.findAll({
      where: { clientId },
      include: [{ model: Order, as: 'order' }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(claims);
  } catch (error) {
    console.error('Erreur getMyClaims :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des réclamations.' });
  }
};
