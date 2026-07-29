import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Star } from 'lucide-react-native'
import { formatPrice } from '@/lib/utils/format'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { Model } from '@/lib/api/models'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

interface Props {
  model: Model
  index?: number
}

export function ModelCard({ model, index = 0 }: Props) {
  const atelier = model.artisan?.atelier ?? 'Atelier'
  const metier = model.artisan?.métier ?? 'Création'
  const note = Number(model.artisan?.noteMoyenne ?? 4.8).toFixed(1)

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 60, 400)).springify().damping(14).mass(0.8)}
      style={{ flex: 1 }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(client)/model/${model.id}`)}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`${model.titre}, par ${atelier}${model.prixEstimatif != null ? `, à partir de ${formatPrice(model.prixEstimatif)}` : ''}`}
      >
        {/* RÈGLE STRICTE 1 : Format carré (aspectRatio: 1) + resizeMode: 'cover' */}
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
            <Star size={10} color="#C05A2B" fill="#C05A2B" />
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
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    ...shadow.sm,
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    aspectRatio: 1, // Format carré obligatoire
    backgroundColor: '#FAF8F5',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF8F5',
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  glassTag: {
    backgroundColor: 'rgba(26, 16, 5, 0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  glassTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1005',
  },
  pricePill: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: '#C05A2B',
    borderRadius: radius.md,
    paddingHorizontal: 9,
    paddingVertical: 4,
    ...shadow.sm,
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: spacing.sm,
    gap: 2,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: '#1A1005',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
  },
  artisan: {
    fontSize: fontSize.xs,
    color: '#7A6A58',
    fontWeight: '600',
  },
})
