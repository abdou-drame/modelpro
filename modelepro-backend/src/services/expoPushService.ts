const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Envoie une notification push à un token Expo (capturé côté mobile via
 * getExpoPushTokenAsync, voir lib/utils/fcm.ts). Le service Expo relaie ensuite vers
 * FCM (Android) ou APNs (iOS) selon la plateforme du device. Silencieux en cas d'échec
 * pour ne jamais bloquer le flux principal (même logique que createNotification).
 */
export const sendPushNotification = async (message: PushMessage): Promise<void> => {
  if (!message.to || !message.to.startsWith('ExponentPushToken')) return;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.to,
        title: message.title,
        body: message.body,
        data: message.data || {},
      }),
    });

    const result = (await response.json()) as { data?: { status?: string } };
    if (!response.ok || result?.data?.status === 'error') {
      console.error('[expoPushService] Échec envoi push :', result);
    }
  } catch (err) {
    console.error('[expoPushService] Erreur envoi push :', err);
  }
};
