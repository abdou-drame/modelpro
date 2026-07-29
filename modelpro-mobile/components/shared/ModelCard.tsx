import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Star, Heart } from 'lucide-react-native'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { Model } from '@/lib/api/models'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

interface Props {
  model: Model
}

export function ModelCard({ model }: Props) {
  const atelier = model.artisan?.atelier ?? 'Atelier'
  const metier = model.artisan?.métier ?? 'Création'
  const note = Number(model.artisan?.noteMoyenne ?? 4.8).toFixed(1)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/model/${model.id}`)}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${model.titre}, par ${atelier}${model.prixEstimatif != null ? `, à partir de ${formatPrice(model.prixEstimatif)}` : ''}`}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: model.photoUrl ?? PLACEHOLDER }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Metier tag */}
        <View style={styles.badgeOverlay}>
          <View style={styles.glassTag}>
            <Text style={styles.glassTagText}>{metier}</Text>
          </View>
        </View>

        {/* Rating overlay */}
        <View style={styles.ratingBadge}>
          <Star size={10} color="#EAB308" fill="#EAB308" />
          <Text style={styles.ratingText}>{note}</Text>
        </View>

        {/* Price tag */}
        {model.prixEstimatif != null && (
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatPrice(model.prixEstimatif)}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{model.titre}</Text>
        <Text style={styles.artisan} numberOfLines={1}>{atelier}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgWarm,
    height: 155,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgWarm,
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  glassTag: {
    backgroundColor: 'rgba(26, 16, 5, 0.65)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  glassTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  pricePill: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...shadow.sm,
  },
  pricePillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: spacing.sm,
    gap: 2,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  artisan: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: '500',
  },
})
