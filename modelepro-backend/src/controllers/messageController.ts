import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Order } from '../models/Order';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';

interface MulterFileLike {
  originalname: string;
  buffer: Buffer;
}

const uploadDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const senderId = req.user?.id;
    if (!senderId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const { orderId, texte } = req.body;

    let order = null as Order | null;
    if (orderId) {
      order = await Order.findByPk(orderId);
    } else {
      // Résoudre la commande en tenant compte que artisanId dans orders = profil artisan id (pas userId)
      // On cherche d'abord comme client (clientId = userId directement)
      order = await Order.findOne({
        where: { clientId: senderId },
        order: [['createdAt', 'DESC']],
      });

      // Si pas trouvé comme client, chercher comme artisan via le profil
      if (!order) {
        const artisanProfileForOrder = await Artisan.findOne({ where: { userId: senderId } });
        if (artisanProfileForOrder) {
          order = await Order.findOne({
            where: { artisanId: artisanProfileForOrder.id },
            order: [['createdAt', 'DESC']],
          });
        }
      }
    }

    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    // Résoudre le profil artisan pour pouvoir comparer userId (senderId) avec artisanProfile.userId
    const artisanProfileOfOrder = await Artisan.findByPk(order.artisanId, { attributes: ['id', 'userId'] });
    const isClient = order.clientId === senderId;
    const isArtisan = artisanProfileOfOrder?.userId === senderId;
    if (!isClient && !isArtisan) return res.status(403).json({ error: 'Vous ne faites pas partie de cette commande.' });

    let photoUrl: string | null = null;
    const file = req.file as MulterFileLike | undefined;
    if (file?.buffer) {
      const fileName = `${Date.now()}-${file.originalname}`;
      const destPath = path.join(uploadDir, fileName);
      fs.writeFileSync(destPath, file.buffer);
      photoUrl = `/uploads/${fileName}`;
    }

    const hasText = typeof texte === 'string' && texte.trim().length > 0;
    if (!hasText && !photoUrl) {
      return res.status(400).json({ error: 'Le message doit contenir du texte ou une photo.' });
    }

    const message = await Message.create({
      orderId: order.id,
      senderId,
      texte: hasText ? texte : null,
      photoUrl,
      lu: false,
    });

    let recipientId: number | null = null;
    if (isClient) {
      // Expéditeur = client → destinataire = artisan (on réutilise artisanProfileOfOrder déjà chargé)
      recipientId = artisanProfileOfOrder?.userId ?? null;
    } else if (isArtisan) {
      // Expéditeur = artisan → destinataire = client
      recipientId = order.clientId;
    }

    if (recipientId) {
      await Notification.create({
        userId: recipientId,
        type: 'nouveau_message',
        titre: 'Nouveau message',
        description: 'Vous avez reçu un nouveau message concernant votre commande.',
        referenceId: order.id,
        lu: false,
      });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error('Erreur envoi message :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de l’envoi du message.' });
  }
};

export const getOrderMessages = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifié.' });

    const orderId = Number(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: 'orderId requis.' });

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    const artisanProfileOfOrder = await Artisan.findByPk(order.artisanId, { attributes: ['userId'] });
    const isParticipant = order.clientId === userId || artisanProfileOfOrder?.userId === userId;
    if (!isParticipant) return res.status(403).json({ error: 'Vous n\'avez pas accès à cette discussion.' });

    const messages = await Message.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']],
      include: [{ model: User, as: 'sender', attributes: ['id', 'nom', 'prenom', 'role'] }],
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Erreur récupération messages :', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des messages.' });
  }
};
