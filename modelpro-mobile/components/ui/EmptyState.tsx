import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  action?: { label: string; onPress: () => void }
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.container}>
      <Animated.View entering={FadeInUp.delay(260).springify()} style={styles.iconWrap}>
        {icon}
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(320).springify()} style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </Animated.View>
      {action && (
        <Animated.View entering={FadeInUp.delay(380).springify()}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    ...shadow.md,
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
})
