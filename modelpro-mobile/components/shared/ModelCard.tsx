import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Star } from 'lucide-react-native'
import { formatPrice, getImageUrl } from '@/lib/utils/format'
import { colors, radius, shadow, fontSize, spacing, fontFamily } from '@/constants/theme'
import type { Model } from '@/lib/api/models'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

interface Props {
  model: Model
  index?: number
}

export function ModelCard({ model, index = 0 }: Props) {
  const atelier = model.artisan?.atelier ?? 'Atelier'
  const note = Number(model.artisan?.noteMoyenne ?? 4.8).toFixed(1)

  return (
    <Animated.View entering={FadeIn.delay(Math.min(index * 50, 300)).duration(400)} style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(client)/model/${model.id}`)}
        activeOpacity={0.9}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUrl(model.photoUrl) ?? PLACEHOLDER }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Price badge */}
          {model.prixEstimatif != null && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{formatPrice(model.prixEstimatif)}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{model.titre}</Text>

          <View style={styles.meta}>
            <Text style={styles.atelier} numberOfLines={1}>{atelier}</Text>
            <View style={styles.rating}>
              <Star size={12} color={colors.accent} fill={colors.accent} />
              <Text style={styles.ratingText}>{note}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: colors.bgMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  priceBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  priceText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fontFamily.serif,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atelier: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
})
