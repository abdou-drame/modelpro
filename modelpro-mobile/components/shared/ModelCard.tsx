import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { StarRating } from '@/components/ui/StarRating'
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
  const note = model.artisan?.noteMoyenne ?? 0

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
        <View style={styles.badgeOverlay}>
          <Badge label={metier} variant="neutral" size="sm" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{model.titre}</Text>

        <View style={styles.row}>
          <Text style={styles.artisan}>{atelier}</Text>
          <View style={styles.ratingRow}>
            <StarRating value={note} size={11} />
          </View>
        </View>

        {model.prixEstimatif != null && (
          <Text style={styles.price}>{formatPrice(model.prixEstimatif)}</Text>
        )}
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
    backgroundColor: colors.bgMuted,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 125,
    backgroundColor: colors.bgMuted,
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artisan: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
})
