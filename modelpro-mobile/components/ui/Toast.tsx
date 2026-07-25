import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle, useSharedValue,
  withSpring, withDelay, withTiming, runOnJS,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react-native'
import { BlurView } from 'expo-blur'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onHide?: () => void
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const ICON_COLORS = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.accent,
}

export function Toast({ message, variant = 'success', duration = 3000, onHide }: ToastProps) {
  const translateY = useSharedValue(-80)
  const opacity = useSharedValue(0)

  const Icon = ICONS[variant]
  const iconColor = ICON_COLORS[variant]

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 })
    opacity.value = withTiming(1, { duration: 200 })

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 })
      translateY.value = withTiming(-80, { duration: 250 }, (finished) => {
        if (finished && onHide) runOnJS(onHide)()
      })
    }, duration)

    return () => clearTimeout(timer)
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.border} />
      <Icon size={18} color={iconColor} strokeWidth={2} />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    zIndex: 9999,
    ...shadow.lg,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
})
