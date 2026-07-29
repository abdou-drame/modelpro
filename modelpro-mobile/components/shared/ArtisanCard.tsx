import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { MapPin, ShieldCheck, Star } from 'lucide-react-native'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { ArtisanPublic } from '@/lib/api/artisans'

const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'
const PLACEHOLDER_PROFILE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

interface Props {
  artisan: ArtisanPublic
}

export function ArtisanCard({ artisan }: Props) {
  const coverUri = artisan.photosAtelier?.[0] ?? PLACEHOLDER_COVER
  const previewPhotos = artisan.photosAtelier?.slice(1, 4) ?? []
  const rating = artisan.noteMoyenne ?? 0
  const reviewCount = artisan.nombreAvis ?? 0

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/artisan/${artisan.id}`)}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Voir le profil de ${artisan.atelier}, ${artisan.métier}, note ${rating.toFixed(1)} sur 5`}
    >
      {/* Cover — 3:4 ratio */}
      <View style={styles.coverWrapper}>
        <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />

        {/* Métier badge — top right */}
        <View style={styles.métierBadge}>
          <Text style={styles.métierText} numberOfLines={1}>{artisan.métier}</Text>
        </View>

        {/* Validation badge — top left */}
        {artisan.statutValidation === 'valide' && (
          <View style={styles.validBadge}>
            <ShieldCheck size={11} color={colors.success} strokeWidth={2.5} />
            <Text style={styles.validText}>Vérifié</Text>
          </View>
        )}
      </View>

      {/* Info section */}
      <View style={styles.info}>
        {/* Avatar + name row */}
        <View style={styles.nameRow}>
          <Image
            source={{ uri: artisan.photoProfil ?? PLACEHOLDER_PROFILE }}
            style={styles.avatar}
          />
          <View style={styles.nameBlock}>
            <Text style={styles.atelierName} numberOfLines={1}>{artisan.atelier}</Text>
            {artisan.localisation ? (
              <View style={styles.locationRow}>
                <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.locationText} numberOfLines={1}>{artisan.localisation}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={12}
                color={n <= Math.round(rating) ? '#D97706' : colors.border}
                fill={n <= Math.round(rating) ? '#D97706' : 'transparent'}
                strokeWidth={1.5}
              />
            ))}
          </View>
          <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>
            ({reviewCount} avis{reviewCount > 1 ? '' : ''})
          </Text>
        </View>

        {/* Preview photos row */}
        {previewPhotos.length > 0 && (
          <View style={styles.previewRow}>
            {previewPhotos.map((uri, i) => (
              <View key={i} style={styles.previewThumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
            ))}
            {previewPhotos.length < 3 &&
              Array.from({ length: 3 - previewPhotos.length }).map((_, i) => (
                <View key={`empty-${i}`} style={[styles.previewThumb, styles.previewThumbEmpty]} />
              ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const COVER_HEIGHT = 220

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.md,
  },

  /* Cover */
  coverWrapper: {
    height: COVER_HEIGHT,
    backgroundColor: colors.bgMuted,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  métierBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: 140,
  },
  métierText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  validBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  validText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.2,
  },

  /* Info */
  info: {
    padding: spacing.md,
    gap: spacing.sm,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    flexShrink: 0,
    backgroundColor: colors.bgMuted,
  },
  nameBlock: { flex: 1, gap: 2 },
  atelierName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#92400E',
  },
  ratingCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  previewRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  previewThumb: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgMuted,
  },
  previewThumbEmpty: {
    backgroundColor: colors.bgMuted,
    opacity: 0.5,
  },
})
