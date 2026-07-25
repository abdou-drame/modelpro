import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { MapPin, ShieldCheck } from 'lucide-react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { ArtisanPublic } from '@/lib/api/artisans'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - spacing.xl * 2
const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'
const PLACEHOLDER_PROFILE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

interface Props {
  artisan: ArtisanPublic
}

export function ArtisanCard({ artisan }: Props) {
  const coverUri = artisan.photosAtelier?.[0] ?? PLACEHOLDER_COVER
  const previewPhotos = artisan.photosAtelier?.slice(1, 4) ?? []

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/artisan/${artisan.id}`)}
      activeOpacity={0.93}
      accessibilityRole="button"
      accessibilityLabel={`Voir le profil de ${artisan.nomAtelier}, ${artisan.metier.nom}, note ${artisan.notemoyenne.toFixed(1)}`}
    >
      {/* Cover image */}
      <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(26,26,46,0.75)']}
        style={styles.coverGradient}
      />

      {/* Glass info bar posé sur la photo */}
      <View style={styles.glassBar}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.glassBorder} />

        <View style={styles.barContent}>
          <Image
            source={{ uri: artisan.photoProfil ?? PLACEHOLDER_PROFILE }}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{artisan.nomAtelier}</Text>
              {artisan.estValide && (
                <ShieldCheck size={13} color="#4ADE80" strokeWidth={2.5} />
              )}
            </View>
            <View style={styles.metaRow}>
              <StarRating value={artisan.notemoyenne} size={11} />
              <Text style={styles.metaText}>
                {artisan.notemoyenne.toFixed(1)} · {artisan.nombreAvis} avis
              </Text>
            </View>
            {artisan.localisation && (
              <View style={styles.locationRow}>
                <MapPin size={10} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                <Text style={styles.locationText}>{artisan.localisation}</Text>
              </View>
            )}
          </View>
          <Badge label={artisan.metier.nom} variant="primary" size="sm" />
        </View>
      </View>

      {/* Photos atelier en preview */}
      {previewPhotos.length > 0 && (
        <View style={styles.photosRow}>
          {previewPhotos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.previewPhoto}
              resizeMode="cover"
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.lg,
  },
  cover: {
    width: '100%',
    height: 160,
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 80,
    height: 80,
  },
  glassBar: {
    marginHorizontal: spacing.md,
    marginTop: -36,
    borderRadius: radius.lg,
    overflow: 'hidden',
    zIndex: 10,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.45)',
  },
  photosRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  previewPhoto: {
    flex: 1,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
})
