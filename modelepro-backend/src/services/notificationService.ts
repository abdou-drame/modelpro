import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendPushNotification } from './expoPushService';

type NotifType = 'nouveau_message' | 'demande_rdv' | 'rdv_statut' | 'commande_statut' | 'rappel' | 'notation' | 'paiement';

/**
 * Helper réutilisable pour créer une notification en base et pousser une notification
 * push sur le device de l'utilisateur (si un fcmToken est enregistré). Silencieux en cas
 * d'erreur pour ne jamais bloquer le flux principal.
 */
export const createNotification = async (
  userId: number,
  type: NotifType,
  titre: string,
  description: string,
  referenceId?: number
): Promise<void> => {
  try {
    await Notification.create({
      userId,
      type,
      titre,
      description,
      referenceId: referenceId ?? null,
      lu: false,
    });
  } catch (err) {
    console.error('[notificationService] Erreur création notification :', err);
  }

  try {
    const user = await User.findByPk(userId);
    if (user?.fcmToken) {
      await sendPushNotification({
        to: user.fcmToken,
        title: titre,
        body: description,
        data: { type, referenceId: referenceId ?? null },
      });
    }
  } catch (err) {
    console.error('[notificationService] Erreur envoi push :', err);
  }
};
