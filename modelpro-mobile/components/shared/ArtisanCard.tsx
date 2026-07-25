import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { MapPin, ShieldCheck } from 'lucide-react-native'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { colors, radius, shadow, fontSize, spacing } from '@/constants/theme'
import type { ArtisanPublic } from '@/lib/api/artisans'

const PLACEHOLDER_PROFILE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
const PLACEHOLDER_ATELIER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

interface Props {
  artisan: ArtisanPublic
}

export function ArtisanCard({ artisan }: Props) {
  const previewPhotos = artisan.photosAtelier?.slice(0, 3) ?? []

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(client)/artisan/${artisan.id}`)}
      activeOpacity={0.93}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: artisan.photoProfil ?? PLACEHOLDER_PROFILE }}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{artisan.nomAtelier}</Text>
            {artisan.estValide && (
              <ShieldCheck size={15} color={colors.success} strokeWidth={2} />
            )}
          </View>
          <Badge label={artisan.metier.nom} variant="primary" size="sm" />
          <View style={styles.meta}>
            <StarRating value={artisan.notemoyenne} size={12} />
            <Text style={styles.metaText}>
              {artisan.notemoyenne.toFixed(1)} · {artisan.nombreAvis} avis
            </Text>
          </View>
          {artisan.localisation && (
            <View style={styles.locationRow}>
              <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.location}>{artisan.localisation}</Text>
            </View>
          )}
        </View>
      </View>

      {previewPhotos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
        >
          {previewPhotos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri: uri ?? PLACEHOLDER_ATELIER }}
              style={styles.previewPhoto}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    ...shadow.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSub,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  location: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  photosScroll: {
    marginTop: spacing.xs,
  },
  previewPhoto: {
    width: 100,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
  },
})
