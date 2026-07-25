import { View, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, FadeIn,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { colors, radius, spacing } from '@/constants/theme'

function Bone({ width, height, style }: { width?: number | string; height?: number; style?: any }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    )
  }, [])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        styles.bone,
        { width: width ?? '100%', height: height ?? 16, borderRadius: (height ?? 16) / 2 },
        animStyle,
        style,
      ]}
    />
  )
}

export function SkeletonOrderCard() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Bone width="60%" height={16} />
          <Bone width="40%" height={12} />
        </View>
        <Bone width={72} height={24} />
      </View>
      <View style={styles.row}>
        <Bone width="35%" height={12} />
        <Bone width="30%" height={12} />
      </View>
    </Animated.View>
  )
}

export function SkeletonModelCard() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.modelCard}>
      <Bone width="100%" height={160} style={{ borderRadius: radius.xl }} />
      <View style={{ gap: spacing.sm, padding: spacing.sm }}>
        <Bone width="70%" height={14} />
        <Bone width="45%" height={12} />
      </View>
    </Animated.View>
  )
}

export function SkeletonArtisanCard() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.artisanCard}>
      <Bone width="100%" height={120} style={{ borderRadius: radius.xl }} />
      <View style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={styles.row}>
          <Bone width={48} height={48} style={{ borderRadius: 24 }} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Bone width="60%" height={14} />
            <Bone width="40%" height={12} />
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

export function SkeletonMessageRow() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.messageRow}>
      <Bone width={48} height={48} style={{ borderRadius: 24 }} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={styles.row}>
          <Bone width="40%" height={14} />
          <Bone width="20%" height={12} />
        </View>
        <Bone width="75%" height={12} />
      </View>
    </Animated.View>
  )
}

export function SkeletonList({ count = 4, type = 'order' }: {
  count?: number
  type?: 'order' | 'model' | 'artisan' | 'message'
}) {
  const CardComponent = {
    order: SkeletonOrderCard,
    model: SkeletonModelCard,
    artisan: SkeletonArtisanCard,
    message: SkeletonMessageRow,
  }[type]

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bone: { backgroundColor: colors.border },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modelCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  artisanCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
  },
  list: { gap: spacing.md, padding: spacing.lg },
})
