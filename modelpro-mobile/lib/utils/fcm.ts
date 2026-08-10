import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { authApi } from '@/lib/api/auth'

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
  } catch (e) {
    console.warn('[FCM] setNotificationHandler skipped:', e)
  }
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

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
    console.log('Expo Push Token:', token)
    if (token) {
      await authApi.updateFcmToken(token)
    }
  } catch (e) {
    console.warn('[FCM] Push token registration skipped:', e)
  }
}
