import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeInLeft, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useEffect } from 'react'
import { Check, Clock } from 'lucide-react-native'
import { colors, fontSize, spacing, radius } from '@/constants/theme'
import { ORDER_STATUSES, OrderStatus } from '@/constants/enums'
import { ORDER_STATUS_LABELS } from '@/lib/utils/format'

const STEPS = ORDER_STATUSES.filter((s) => s !== 'annulee')

interface Props {
  statut: OrderStatus
  dateLivraisonEstimee?: string | null
}

function PulseDot() {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1
    )
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View style={[styles.activeDot, style]} />
  )
}

export function OrderTimeline({ statut, dateLivraisonEstimee }: Props) {
  const isCancelled = statut === 'annulee'
  const activeIndex = STEPS.indexOf(statut as any)

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isDone = i < activeIndex
        const isActive = i === activeIndex
        const isPending = i > activeIndex

        return (
          <Animated.View
            key={step}
            entering={FadeInLeft.delay(i * 60).springify()}
            style={styles.stepRow}
          >
            <View style={styles.indicator}>
              <View style={[
                styles.dot,
                isDone && styles.dotDone,
                isActive && styles.dotActive,
                isPending && styles.dotPending,
              ]}>
                {isDone && <Check size={11} color={colors.white} strokeWidth={3} />}
                {isActive && <PulseDot />}
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.line, isDone && styles.lineDone]} />
              )}
            </View>

            <View style={styles.label}>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isPending && styles.stepLabelPending,
              ]}>
                {ORDER_STATUS_LABELS[step]}
              </Text>
              {isActive && dateLivraisonEstimee && step === 'en_cours' && (
                <View style={styles.dateRow}>
                  <Clock size={11} color={colors.textSub} strokeWidth={2} />
                  <Text style={styles.dateText}>
                    Livraison estimée : {new Date(dateLivraisonEstimee).toLocaleDateString('fr-SN')}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )
      })}

      {isCancelled && (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>Commande annulée</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  indicator: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.primary,
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotPending: {
    backgroundColor: colors.bgMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  line: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
    paddingBottom: spacing.lg,
    gap: 3,
  },
  stepLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    paddingTop: 2,
  },
  stepLabelActive: {
    color: colors.accent,
  },
  stepLabelPending: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
  cancelledBadge: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cancelledText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
})
