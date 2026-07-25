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
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/model/${model.id}`)}
      activeOpacity={0.92}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: model.photoUrl ?? PLACEHOLDER }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.badgeOverlay}>
          <Badge label={model.artisan.metier.nom} variant="neutral" size="sm" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{model.titre}</Text>

        <View style={styles.row}>
          <Text style={styles.artisan}>{model.artisan.nomAtelier}</Text>
          <View style={styles.ratingRow}>
            <StarRating value={model.artisan.notemoyenne} size={11} />
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
    borderRadius: radius.lg,
    overflow: 'hidden',
    flex: 1,
    ...shadow.md,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
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
