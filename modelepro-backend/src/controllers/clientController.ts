import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Metier } from '../models/Metier';
import { Creation } from '../models/Creation';
import { Appointment } from '../models/Appointment';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { Claim } from '../models/Claim';

export const getMetiers = async (_req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const metiers = await Metier.findAll();
    res.status(200).json(metiers);
  } catch (error) {
    console.error('Erreur récupération des métiers :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des métiers.' });
  }
};

export const createAppointment = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, date, heure, notes } = req.body;
    if (!artisanId || !date || !heure) return res.status(400).json({ error: 'artisanId, date et heure requis.' });

    const appointment = await Appointment.create({ artisanId, clientId, date, heure, notes, statut: 'pending' });
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Erreur création rendez-vous :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création du rendez-vous.' });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, mesures, photoTissu, consignes, prix } = req.body;
    if (!artisanId) return res.status(400).json({ error: 'artisanId requis.' });

    const order = await Order.create({ artisanId, clientId, mesures, photoTissu, consignes, prix: prix || 0, statut: 'en_cours' });
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

    const orders = await Order.findAll({ where: { clientId }, order: [['createdAt', 'DESC']] });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erreur récupération commandes client :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des commandes.' });
  }
};

export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { artisanId, note, commentaire } = req.body;
    const numericNote = Number(note);
    if (!artisanId || !numericNote || numericNote < 1 || numericNote > 5) {
      return res.status(400).json({ error: 'Note invalide (1-5) et artisanId requis.' });
    }

    // Optionnel: vérifier si le client a une commande finalisée ou rendez-vous avec cet artisan
    const hasInteraction = await Order.findOne({ where: { clientId, artisanId, statut: { [Op.in]: ['livree'] } } }) ||
      await Appointment.findOne({ where: { clientId, artisanId } });

    if (!hasInteraction) {
      // On n'empêche pas la création, mais on peut avertir; ici on autorise quand même.
    }

    const review = await Review.create({ artisanId, clientId, note: numericNote, commentaire });
    res.status(201).json(review);
  } catch (error) {
    console.error('Erreur création évaluation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de l’évaluation.' });
  }
};

export const createClaim = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });
    if (req.user?.role !== 'client') return res.status(403).json({ error: 'Accès réservé aux clients.' });

    const { orderId, sujet, description } = req.body;
    if (!orderId || !sujet) return res.status(400).json({ error: 'orderId et sujet requis.' });

    // Vérifier que la commande appartient bien au client
    const order = await Order.findByPk(String(orderId));
    if (!order || order.clientId !== clientId) return res.status(403).json({ error: 'Commande introuvable ou non autorisée.' });

    const claim = await Claim.create({ orderId, clientId, sujet, description, statut: 'en_attente' });
    res.status(201).json(claim);
  } catch (error) {
    console.error('Erreur création réclamation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la réclamation.' });
  }
};
