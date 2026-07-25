import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, MapPin, ShieldCheck, MessageCircle, Calendar } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { artisansApi } from '@/lib/api/artisans'
import { modelsApi } from '@/lib/api/models'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { formatRelative } from '@/lib/utils/format'

const { width } = Dimensions.get('window')

export default function ArtisanProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const artisanId = Number(id)

  const { data: artisan, isLoading } = useQuery({
    queryKey: ['artisan', artisanId],
    queryFn: () => artisansApi.getById(artisanId).then((r) => r.data),
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['artisan-reviews', artisanId],
    queryFn: () => artisansApi.getReviews(artisanId).then((r) => r.data),
  })

  const { data: modelsData } = useQuery({
    queryKey: ['models', null, artisanId],
    queryFn: () => modelsApi.list({ artisanId, limit: 6 }).then((r) => r.data),
  })

  if (isLoading || !artisan) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover photos */}
        <View style={styles.cover}>
          <Image
            source={{ uri: artisan.photosAtelier?.[0] ?? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80' }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(26,26,46,0.85)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverOverlay}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: artisan.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' }}
                style={styles.avatar}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{artisan.nomAtelier}</Text>
                {artisan.estValide && (
                  <ShieldCheck size={16} color={colors.success} strokeWidth={2} />
                )}
              </View>
              <Badge label={artisan.metier.nom} variant="primary" />
              {artisan.localisation && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.locationText}>{artisan.localisation}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Stats */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{artisan.notemoyenne.toFixed(1)}</Text>
              <StarRating value={artisan.notemoyenne} size={13} />
              <Text style={styles.statLabel}>{artisan.nombreAvis} avis</Text>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push(`/(client)/order-form?artisanId=${artisanId}`)}
            >
              <Text style={styles.btnPrimaryText}>Commander</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnIcon}
              onPress={() => router.push(`/(client)/appointments/new?artisanId=${artisanId}`)}
            >
              <Calendar size={20} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Description */}
          {artisan.description && (
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description}>{artisan.description}</Text>
            </Animated.View>
          )}

          {/* Catalogue */}
          {modelsData && modelsData.models.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Catalogue</Text>
              <View style={styles.modelsGrid}>
                {modelsData.models.map((m) => (
                  <View key={m.id} style={{ width: (width - spacing.xl * 2 - spacing.md) / 2 }}>
                    <ModelCard model={m} />
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Avis */}
          {reviewsData && reviewsData.length > 0 && (
            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Avis clients</Text>
              {reviewsData.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>
                      {review.client.user.prenom} {review.client.user.nom[0]}.
                    </Text>
                    <Text style={styles.reviewDate}>{formatRelative(review.createdAt)}</Text>
                  </View>
                  <StarRating value={review.noteGlobale} size={12} />
                  {review.commentaire && (
                    <Text style={styles.reviewText}>{review.commentaire}</Text>
                  )}
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Back button — glass */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.backBtnBorder} />
        <ArrowLeft size={20} color={colors.white} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cover: { height: 280, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  avatarWrapper: { ...shadow.lg },
  avatar: {
    width: 64, height: 64, borderRadius: radius.full,
    borderWidth: 2, borderColor: colors.white,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.5, flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  body: { padding: spacing.xl, gap: spacing.xl },
  statsRow: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs, ...shadow.sm,
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  statLabel: { fontSize: fontSize.sm, color: colors.textSub },
  ctaRow: { flexDirection: 'row', gap: spacing.sm },
  btnPrimary: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center',
  },
  btnPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  btnIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3,
  },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },
  modelsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  reviewCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm, ...shadow.sm,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  reviewDate: { fontSize: fontSize.xs, color: colors.textMuted },
  reviewText: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },
  backBtn: {
    position: 'absolute', top: 52, left: spacing.xl,
    width: 40, height: 40, borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
})
