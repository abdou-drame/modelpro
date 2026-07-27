import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { formatPrice } from '@/lib/utils/format'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { Model } from '@/lib/api/models'

const WARM_GRADIENTS: [string, string][] = [
  ['#C47A3A', '#8B3A0F'],
  ['#4A7C59', '#2D5A3D'],
  ['#6B4C3B', '#3D2B1F'],
  ['#7A6A4A', '#4A3D2A'],
  ['#3A5A7C', '#1F3D5A'],
]

function getGradient(id: number): [string, string] {
  return WARM_GRADIENTS[id % WARM_GRADIENTS.length]
}

interface Props {
  model: Model
}

export function ModelCard({ model }: Props) {
  const [start, end] = getGradient(model.id)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/model/${model.id}`)}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${model.titre}, par ${model.artisan.nomAtelier}${model.prixEstimatif != null ? `, à partir de ${formatPrice(model.prixEstimatif)}` : ''}`}
    >
      <View style={styles.imageWrapper}>
        {model.photoUrl ? (
          <Image source={{ uri: model.photoUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[start, end]} style={styles.image} />
        )}
        {model.artisan.metier.nom ? (
          <View style={styles.badgeOverlay}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{model.artisan.metier.nom.toUpperCase()}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{model.titre}</Text>
        <Text style={styles.artisan} numberOfLines={1}>{model.artisan.nomAtelier}</Text>
        {model.prixEstimatif != null && (
          <Text style={styles.price}>{formatPrice(model.prixEstimatif)}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    overflow: 'hidden', flex: 1, ...shadow.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  imageWrapper: { position: 'relative' },
  image: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.bgMuted },
  badgeOverlay: { position: 'absolute', bottom: spacing.sm, left: spacing.sm },
  badgePill: {
    backgroundColor: 'rgba(26, 16, 5, 0.65)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.2 },
  body: { padding: spacing.md, gap: 3 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, letterSpacing: -0.1 },
  artisan: { fontSize: fontSize.xs, color: colors.textSub },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginTop: 2 },
})
