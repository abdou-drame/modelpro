import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { MapPin, ShieldCheck, Star, ChevronRight } from 'lucide-react-native'
import { colors, radius, shadow, fontSize, spacing, fontFamily } from '@/constants/theme'
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
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 300)).duration(400)}>
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(client)/artisan/${artisan.id}`)} activeOpacity={0.9}>
        {/* Cover */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(26,17,12,0.7)']} style={styles.coverGradient} />

          <View style={styles.metierBadge}>
            <Text style={styles.metierText}>{artisan.métier}</Text>
          </View>

          {artisan.statutValidation === 'valide' && (
            <View style={styles.validBadge}>
              <ShieldCheck size={12} color={colors.success} strokeWidth={2} />
              <Text style={styles.validText}>Vérifié</Text>
            </View>
          )}

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={14} color={n <= Math.round(rating) ? colors.accent : 'rgba(255,255,255,0.3)'} fill={n <= Math.round(rating) ? colors.accent : 'transparent'} strokeWidth={1.5} />
            ))}
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount})</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Image source={{ uri: artisan.photoProfil ?? PLACEHOLDER_PROFILE }} style={styles.avatar} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.atelier} numberOfLines={1}>{artisan.atelier}</Text>
              {artisan.localisation && (
                <View style={styles.locRow}>
                  <MapPin size={12} color={colors.accent} strokeWidth={1.5} />
                  <Text style={styles.locText} numberOfLines={1}>{artisan.localisation}</Text>
                </View>
              )}
            </View>
            <ChevronRight size={18} color={colors.textLight} strokeWidth={1.5} />
          </View>

          {previewPhotos.length > 0 && (
            <View style={styles.gallery}>
              {previewPhotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.thumb} resizeMode="cover" />
              ))}
              {previewPhotos.length >= 3 && (
                <View style={styles.moreThumb}><Text style={styles.moreText}>+</Text></View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, ...shadow.sm },

  coverWrap: { position: 'relative', width: '100%', aspectRatio: 1.4, backgroundColor: colors.bgMuted },
  cover: { width: '100%', height: '100%' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },

  metierBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  metierText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },

  validBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: colors.bgCard, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  validText: { color: colors.success, fontSize: 10, fontWeight: '600' },

  ratingRow: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white, marginLeft: spacing.xs },
  reviewCount: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)' },

  info: { padding: spacing.md, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border },
  atelier: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, fontFamily: fontFamily.serif },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locText: { fontSize: fontSize.xs, color: colors.textMuted },

  gallery: { flexDirection: 'row', gap: spacing.xs },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderLight },
  moreThumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: fontSize.lg, fontWeight: '500', color: colors.textMuted },
})
