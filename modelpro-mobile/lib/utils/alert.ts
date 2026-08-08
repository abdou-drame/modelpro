import { Alert, Platform } from 'react-native'
import { useAlertStore } from '@/lib/store/alertStore'

export function showAlert(
  title: string,
  message?: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
) {
  if (Platform.OS === 'web') {
    useAlertStore.getState().show(title, message, buttons)
    return
  }
  Alert.alert(title, message, buttons)
}
