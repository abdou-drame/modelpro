import { Notification } from '../models/Notification';

type NotifType = 'nouveau_message' | 'demande_rdv' | 'rdv_statut' | 'commande_statut' | 'rappel' | 'notation';

/**
 * Helper réutilisable pour créer une notification en base.
 * Silencieux en cas d'erreur pour ne jamais bloquer le flux principal.
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
};
