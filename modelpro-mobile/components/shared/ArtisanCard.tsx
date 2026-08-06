import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { MapPin, ShieldCheck, Star, ChevronRight } from 'lucide-react-native'
import { colors, radius, shadow, fontSize, spacing, fontFamily } from '@/constants/theme'
import { getImageUrl } from '@/lib/utils/format'
import type { ArtisanPublic } from '@/lib/api/artisans'

// Pas de placeholder cover : la photo d'atelier n'est affichée que si réelle.
const PLACEHOLDER_PROFILE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

interface Props {
  artisan: ArtisanPublic
  index?: number
}

export function ArtisanCard({ artisan, index = 0 }: Props) {
  const coverUri = getImageUrl(artisan.photosAtelier?.[0]) ?? null
  const previewPhotos = (artisan.photosAtelier?.slice(1, 4) ?? []).map((p) => getImageUrl(p) ?? p)
  const rating = artisan.noteMoyenne ?? 0
  const reviewCount = artisan.nombreAvis ?? 0

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 70, 450)).springify().damping(14).mass(0.8)}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(client)/artisan/${artisan.id}`)}
        activeOpacity={0.95}
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${artisan.atelier}, ${artisan.métier}, note ${rating.toFixed(1)} sur 5`}
      >
        {/* Cover Image */}
        <View style={styles.coverWrapper}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
          ) : null}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(28,21,16,0.7)']}
            style={styles.coverGradient}
          />

          {/* Métier badge - top right */}
          <LinearGradient
            colors={[colors.gradientDark, colors.primary]}
            style={styles.metierBadge}
          >
            <Text style={styles.metierText} numberOfLines={1}>{artisan.métier}</Text>
          </LinearGradient>

          {/* Validation badge - top left */}
          {artisan.statutValidation === 'valide' && (
            <View style={styles.validBadge}>
              <ShieldCheck size={12} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.validText}>Vérifié</Text>
            </View>
          )}

          {/* Rating overlay - bottom */}
          <View style={styles.ratingOverlay}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={14}
                  color={n <= Math.round(rating) ? colors.gold : 'rgba(255,255,255,0.3)'}
                  fill={n <= Math.round(rating) ? colors.gold : 'transparent'}
                  strokeWidth={1.5}
                />
              ))}
            </View>
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount})</Text>
          </View>
        </View>

        {/* Info section */}
        <View style={styles.info}>
          {/* Avatar + name row */}
          <View style={styles.nameRow}>
            <View style={styles.avatarWrapper}>
              {artisan.photoProfil ? (
                <Image
                  source={{ uri: getImageUrl(artisan.photoProfil) }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: colors.white, fontWeight: '700', fontSize: fontSize.md }}>
                    {(artisan.user?.prenom?.[0] ?? '') + (artisan.user?.nom?.[0] ?? '') || artisan.atelier?.[0] || 'A'}
                  </Text>
                </View>
              )}
              <View style={styles.avatarRing} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.atelierName} numberOfLines={1}>{artisan.atelier}</Text>
              {artisan.localisation && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.locationText} numberOfLines={1}>{artisan.localisation}</Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>

          {/* Gallery preview */}
          {previewPhotos.length > 0 && (
            <View style={styles.galleryStrip}>
              {previewPhotos.map((photoUrl, idx) => (
                <Image
                  key={idx}
                  source={{ uri: photoUrl }}
                  style={styles.galleryThumb}
                  resizeMode="cover"
                />
              ))}
              {previewPhotos.length >= 3 && (
                <View style={styles.morePhotos}>
                  <Text style={styles.morePhotosText}>+</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.lg,
  },
  coverWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.4,
    backgroundColor: colors.bgMuted,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  // Métier badge
  metierBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  metierText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Valid badge
  validBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    ...shadow.sm,
  },
  validText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },

  // Rating overlay
  ratingOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.white,
  },
  reviewCount: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },

  // Info section
  info: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  avatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radius.lg + 2,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  atelierName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fontFamily.serif,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
    fontWeight: '500',
  },

  // Gallery
  galleryStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  galleryThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  morePhotos: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  morePhotosText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textMuted,
  },
})
