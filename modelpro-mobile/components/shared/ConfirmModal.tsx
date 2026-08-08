import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAlertStore } from '@/lib/store/alertStore'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

// Rendu web du fallback pour showAlert() (voir lib/utils/alert.ts) : remplace
// window.alert/window.confirm par un vrai dialogue au style de l'app.
export function ConfirmModal() {
  const { visible, title, message, buttons, hide } = useAlertStore()

  const handlePress = (onPress?: () => void) => {
    hide()
    onPress?.()
  }

  const handleDismiss = () => {
    handlePress(buttons.find((b) => b.style === 'cancel')?.onPress)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.actions, buttons.length > 2 && styles.actionsColumn]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  buttons.length <= 2 && styles.btnRow,
                  btn.style === 'cancel' && styles.btnCancel,
                  btn.style === 'destructive' && styles.btnDestructive,
                  btn.style !== 'cancel' && btn.style !== 'destructive' && styles.btnDefault,
                ]}
                activeOpacity={0.85}
                onPress={() => handlePress(btn.onPress)}
              >
                <Text
                  style={[
                    styles.btnText,
                    btn.style === 'cancel' && styles.btnTextCancel,
                    btn.style === 'destructive' && styles.btnTextDestructive,
                    btn.style !== 'cancel' && btn.style !== 'destructive' && styles.btnTextDefault,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.md * 1.4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flex: 1,
  },
  btnDefault: {
    backgroundColor: colors.primary,
  },
  btnCancel: {
    backgroundColor: colors.bgMuted,
  },
  btnDestructive: {
    backgroundColor: colors.errorBg,
  },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  btnTextDefault: {
    color: colors.white,
  },
  btnTextCancel: {
    color: colors.textSecondary,
  },
  btnTextDestructive: {
    color: colors.error,
  },
})
