import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { MapPin, ShieldCheck, Star } from 'lucide-react-native'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { ArtisanPublic } from '@/lib/api/artisans'

const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'
const PLACEHOLDER_PROFILE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

interface Props {
  artisan: ArtisanPublic
  index?: number
}

export function ArtisanCard({ artisan, index = 0 }: Props) {
  const coverUri = artisan.photosAtelier?.[0] ?? PLACEHOLDER_COVER
  const previewPhotos = artisan.photosAtelier?.slice(1, 4) ?? []
  const rating = artisan.noteMoyenne ?? 0
  const reviewCount = artisan.nombreAvis ?? 0

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 70, 450)).springify().damping(14).mass(0.8)}
    >
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
              <ShieldCheck size={11} color="#10B981" strokeWidth={2.5} />
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
                  <MapPin size={11} color="#9CA3AF" strokeWidth={2} />
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
                  color={n <= Math.round(rating) ? '#D4AF37' : '#2D2D2D'}
                  fill={n <= Math.round(rating) ? '#D4AF37' : 'transparent'}
                  strokeWidth={1.5}
                />
              ))}
            </View>
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>
              ({reviewCount} avis)
            </Text>
          </View>

          {/* Photo gallery preview strip */}
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
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    ...shadow.md,
  },
  coverWrapper: {
    position: 'relative',
    height: 140,
    backgroundColor: '#0A0A0A',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  métierBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  métierText: {
    color: '#D4AF37',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  validBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#141414',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  validText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  nameBlock: { flex: 1 },
  atelierName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: '#9CA3AF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingValue: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ratingCount: {
    fontSize: fontSize.xs,
    color: '#9CA3AF',
  },
  galleryStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  galleryThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
})
