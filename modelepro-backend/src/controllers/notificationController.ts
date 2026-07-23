import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Notification } from '../models/Notification';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Erreur récupération notifications :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des notifications.' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const notificationId = Number(req.params.id);
    const notification = await Notification.findOne({ where: { id: notificationId, userId } });

    if (!notification) {
      return res.status(404).json({ error: 'Notification introuvable.' });
    }

    notification.lu = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.error('Erreur marquage notification :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour de la notification.' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    await Notification.update({ lu: true }, { where: { userId, lu: false } });

    return res.status(200).json({ message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (error) {
    console.error('Erreur markAllAsRead :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors du marquage des notifications.' });
  }
};
