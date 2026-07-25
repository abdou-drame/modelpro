import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { authApi } from '@/lib/api/auth'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerFcmToken(): Promise<void> {
  if (!Device.isDevice) return

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
}
