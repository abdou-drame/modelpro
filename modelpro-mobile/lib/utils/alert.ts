import { Alert, Platform } from 'react-native'

export function showAlert(
  title: string,
  message?: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
) {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length === 0) {
      window.alert(`${title}${message ? '\n\n' + message : ''}`)
      return
    }

    if (buttons.length === 1) {
      window.alert(`${title}${message ? '\n\n' + message : ''}`)
      buttons[0].onPress?.()
      return
    }

    const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[1] ?? buttons[0]
    const cancelBtn = buttons.find((b) => b.style === 'cancel')

    const ok = window.confirm(`${title}${message ? '\n\n' + message : ''}`)
    if (ok) {
      confirmBtn?.onPress?.()
    } else {
      cancelBtn?.onPress?.()
    }
  } else {
    Alert.alert(title, message, buttons)
  }
}
