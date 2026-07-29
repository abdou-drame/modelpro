import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { authApi } from '@/lib/api/auth'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

export async function registerFcmToken(): Promise<void> {
  // FCM push notifications require native device or VAPID on web
  if (Platform.OS === 'web') return
  if (!Device.isDevice) return

  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (token) {
      await authApi.updateFcmToken(token)
    }
  } catch (e) {
    console.warn('[FCM] Push token registration skipped:', e)
  }
}
