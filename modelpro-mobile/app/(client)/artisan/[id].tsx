import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, MapPin, ShieldCheck, Calendar } from 'lucide-react-native'
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
const HERO_HEIGHT = Math.round(width * 0.95)

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

  const atelierPhotos = artisan.photosAtelier?.slice(0, 5) ?? []

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero block ── */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image
            source={{ uri: artisan.photosAtelier?.[0] ?? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80' }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Top vignette for back-button legibility */}
          <LinearGradient
            colors={['rgba(26,16,5,0.60)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
          />
          {/* Bottom identity fade */}
          <LinearGradient
            colors={['transparent', 'rgba(26,16,5,0.96)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Identity overlay */}
          <View style={styles.heroIdentity}>
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: artisan.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.heroText}>
              <View style={styles.nameRow}>
                <Text style={styles.heroName} numberOfLines={1}>{artisan.atelier}</Text>
                {artisan.statutValidation === 'valide' && (
                  <ShieldCheck size={18} color="#4ADE80" strokeWidth={2} />
                )}
              </View>
              <View style={styles.heroMeta}>
                <Badge label={artisan.métier} variant="primary" size="sm" />
                {artisan.localisation && (
                  <View style={styles.locationRow}>
                    <MapPin size={11} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                    <Text style={styles.locationText}>{artisan.localisation}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Floating stats card (overlaps hero bottom) ── */}
        <View style={styles.statsCardWrap}>
          <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{(artisan.noteMoyenne ?? 0).toFixed(1)}</Text>
              <StarRating value={artisan.noteMoyenne ?? 0} size={12} />
              <Text style={styles.statLabel}>Note</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{artisan.nombreAvis}</Text>
              <Text style={styles.statSpacer} />
              <Text style={styles.statLabel}>Avis</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>
                {modelsData?.total ?? modelsData?.models.length ?? '—'}
              </Text>
              <Text style={styles.statSpacer} />
              <Text style={styles.statLabel}>Modèles</Text>
            </View>
          </Animated.View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* CTA row */}
          <Animated.View entering={FadeInUp.delay(140).springify()} style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push(`/(client)/order-form?artisanId=${artisanId}`)}
              accessibilityRole="button"
              accessibilityLabel={`Commander à ${artisan.atelier}`}
            >
              <Text style={styles.btnPrimaryText}>Commander</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => router.push(`/(client)/appointments/new?artisanId=${artisanId}`)}
              accessibilityRole="button"
              accessibilityLabel="Prendre un rendez-vous"
            >
              <Calendar size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.btnOutlineText}>RDV</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Atelier photo strip */}
          {atelierPhotos.length > 1 && (
            <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Atelier</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm }}
              >
                {atelierPhotos.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={styles.atelierPhoto}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Description */}
          {artisan.description && (
            <Animated.View entering={FadeInUp.delay(210).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description}>{artisan.description}</Text>
            </Animated.View>
          )}

          {/* Catalogue — horizontal scroll */}
          {modelsData && modelsData.models.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Catalogue</Text>
                {modelsData.total > 0 && (
                  <Text style={styles.sectionCount}>{modelsData.total} créations</Text>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xs }}
              >
                {modelsData.models.map((m) => (
                  <View key={m.id} style={styles.modelCardSlot}>
                    <ModelCard model={m} />
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Avis clients */}
          {reviewsData && reviewsData.length > 0 && (
            <Animated.View entering={FadeInUp.delay(290).springify()} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Avis clients</Text>
                <Text style={styles.sectionCount}>{reviewsData.length}</Text>
              </View>
              {reviewsData.slice(0, 4).map((review) => {
                const initials = (
                  (review.client?.prenom?.[0] ?? '') +
                  (review.client?.nom?.[0] ?? '')
                ).toUpperCase()
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        {review.client?.photoUrl ? (
                          <Image
                            source={{ uri: review.client.photoUrl }}
                            style={styles.reviewAvatarImg}
                          />
                        ) : (
                          <Text style={styles.reviewAvatarText}>{initials || 'C'}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.reviewName}>
                          {review.client?.prenom ?? 'Client'}
                          {review.client?.nom ? ` ${review.client.nom[0]}.` : ''}
                        </Text>
                        <View style={styles.reviewMeta}>
                          <StarRating value={review.note ?? 0} size={11} />
                          <Text style={styles.reviewDate}>{formatRelative(review.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                    {review.commentaire && (
                      <Text style={styles.reviewText}>{review.commentaire}</Text>
                    )}
                  </View>
                )
              })}
            </Animated.View>
          )}

          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>

      {/* Floating back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.floatBtnBorder} />
        <ArrowLeft size={20} color={colors.white} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Hero ──
  hero: { position: 'relative', overflow: 'hidden' },
  heroIdentity: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  avatarRing: {
    borderRadius: radius.full,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.8)',
    ...shadow.lg,
  },
  avatar: { width: 76, height: 76, borderRadius: radius.full },
  heroText: { flex: 1, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroName: {
    fontSize: fontSize.xl, fontWeight: '800', color: colors.white,
    letterSpacing: -0.4, flex: 1,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.62)' },

  // ── Stats card ──
  statsCardWrap: {
    marginTop: -36,
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  statsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadow.lg,
  },
  statCol: { alignItems: 'center', gap: 4, flex: 1 },
  statDivider: { width: 1, height: 38, backgroundColor: colors.border },
  statValue: {
    fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -1,
  },
  // Invisible spacer that aligns the label row with star rows in other columns
  statSpacer: { fontSize: 12, lineHeight: 16 },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '500' },

  // ── Body ──
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xl },

  ctaRow: { flexDirection: 'row', gap: spacing.sm },
  btnPrimary: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: radius.xl, paddingVertical: 15,
    alignItems: 'center', minHeight: 52,
    ...shadow.md,
  },
  btnPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700', letterSpacing: 0.2 },
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.xl, paddingVertical: 15, paddingHorizontal: spacing.lg,
    borderWidth: 1.5, borderColor: colors.primary,
    minHeight: 52,
  },
  btnOutlineText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },

  // ── Sections ──
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  sectionCount: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },

  // Atelier strip
  atelierPhoto: {
    width: 118, height: 88,
    borderRadius: radius.lg, backgroundColor: colors.bgMuted,
  },

  // Catalogue slot
  modelCardSlot: { width: 164 },

  // ── Reviews ──
  reviewCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
    marginBottom: spacing.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reviewAvatar: {
    width: 42, height: 42, borderRadius: radius.full,
    backgroundColor: '#F5E6D8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    flexShrink: 0,
  },
  reviewAvatarImg: { width: 42, height: 42, borderRadius: radius.full },
  reviewAvatarText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.primary },
  reviewName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewDate: { fontSize: fontSize.xs, color: colors.textMuted },
  reviewText: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },

  // ── Back button ──
  backBtn: {
    position: 'absolute', top: 52, left: spacing.xl,
    width: 44, height: 44, borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  floatBtnBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
})
