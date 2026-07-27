import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Share,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, Share2, ChevronRight } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { modelsApi } from '@/lib/api/models'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const { width } = Dimensions.get('window')
const HERO_HEIGHT = Math.round(width * 1.1)

export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const modelId = Number(id)

  const { data: model, isLoading } = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => modelsApi.getById(modelId).then((r) => r.data),
  })

  if (isLoading || !model) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  const allPhotos = [model.photoUrl, ...(model.photos ?? [])].filter(Boolean) as string[]

  const handleShare = async () => {
    try {
      await Share.share({ message: `${model.titre} — ${model.artisan.atelier}` })
    } catch {}
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Full-width image hero ── */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image
            source={{ uri: model.photoUrl ?? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80' }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Top vignette — floating controls */}
          <LinearGradient
            colors={['rgba(26,16,5,0.55)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130 }}
          />

          {/* Bottom gradient — price badge anchor */}
          <LinearGradient
            colors={['transparent', 'rgba(26,16,5,0.80)']}
            locations={[0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Price badge — bottom-right corner */}
          {model.prixEstimatif != null && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.priceBadge}>
              <Text style={styles.priceBadgeLabel}>À partir de</Text>
              <Text style={styles.priceBadgeValue}>{formatPrice(model.prixEstimatif)}</Text>
            </Animated.View>
          )}

          {/* Photo strip — bottom */}
          {allPhotos.length > 1 && (
            <View style={styles.photoStripWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
              >
                {allPhotos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo ${i + 1} de ${model.titre}`}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.thumbPhoto}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* Title + category */}
          <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.titleBlock}>
            <Badge label={model.artisan.métier} variant="primary" size="sm" />
            <Text style={styles.title}>{model.titre}</Text>
          </Animated.View>

          {/* Artisan mini-profile row */}
          <Animated.View entering={FadeInUp.delay(130).springify()}>
            <TouchableOpacity
              style={styles.artisanCard}
              onPress={() => router.push(`/(client)/artisan/${model.artisan.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Voir le profil de ${model.artisan.atelier}`}
            >
              {/* Avatar placeholder ring */}
              <View style={styles.artisanAvatar}>
                <Text style={styles.artisanAvatarText}>
                  {model.artisan.atelier?.[0]?.toUpperCase() ?? 'A'}
                </Text>
              </View>
              <View style={styles.artisanInfo}>
                <Text style={styles.artisanName}>{model.artisan.atelier}</Text>
                <View style={styles.artisanMeta}>
                  <StarRating value={model.artisan.noteMoyenne ?? 0} size={12} />
                  {model.artisan.noteMoyenne != null && (
                    <Text style={styles.artisanRating}>
                      {model.artisan.noteMoyenne.toFixed(1)}
                    </Text>
                  )}
                  <Text style={styles.artisanMetier}>{model.artisan.métier}</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Description */}
          {model.description && (
            <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{model.description}</Text>
            </Animated.View>
          )}

          {/* Options — horizontal chips */}
          {model.options?.length > 0 && (
            <Animated.View entering={FadeInUp.delay(230).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Options disponibles</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm }}
              >
                {model.options.map((opt, i) => (
                  <View key={i} style={styles.optionChip}>
                    <Text style={styles.optionText}>{opt}</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Space for sticky bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Floating back button ── */}
      <TouchableOpacity
        style={[styles.floatBtn, styles.backBtn]}
        onPress={() => router.replace('/(client)')}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <ArrowLeft size={20} color={colors.white} strokeWidth={2} />
      </TouchableOpacity>

      {/* ── Floating share button ── */}
      <TouchableOpacity
        style={[styles.floatBtn, styles.shareBtn]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Partager ce modèle"
      >
        <Share2 size={18} color={colors.white} strokeWidth={2} />
      </TouchableOpacity>

      {/* ── Sticky bottom CTA bar ── */}
      <Animated.View entering={FadeIn.delay(300)} style={styles.ctaBar}>
        <LinearGradient
          colors={[`${colors.bg}00`, colors.bg]}
          locations={[0, 0.35]}
          style={StyleSheet.absoluteFill}
        />
        {model.prixEstimatif != null && (
          <View style={styles.ctaPriceRow}>
            <Text style={styles.ctaPriceLabel}>À partir de</Text>
            <Text style={styles.ctaPrice}>{formatPrice(model.prixEstimatif)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push(`/(client)/order-form?artisanId=${model.artisan.id}&modelId=${model.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Commander ${model.titre}`}
        >
          <Text style={styles.ctaBtnText}>Commander ce modèle</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Hero ──
  hero: { position: 'relative', overflow: 'hidden' },
  priceBadge: {
    position: 'absolute',
    bottom: 80, // above the photo strip
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
    ...shadow.md,
  },
  priceBadgeLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  priceBadgeValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  photoStripWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(26,16,5,0.45)',
  },
  thumbPhoto: {
    width: 60, height: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // ── Body ──
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xl },

  titleBlock: { gap: spacing.sm },
  title: {
    fontSize: fontSize.xxl, fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, lineHeight: 34,
  },

  // Artisan card
  artisanCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, ...shadow.sm,
  },
  artisanAvatar: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: '#F5E6D8',
    alignItems: 'center', justifyContent: 'center',
  },
  artisanAvatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  artisanInfo: { flex: 1, gap: 4 },
  artisanName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  artisanMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  artisanRating: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text },
  artisanMetier: { fontSize: fontSize.xs, color: colors.textMuted },

  // Sections
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },

  // Options
  optionChip: {
    backgroundColor: '#F5E6D8',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border,
  },
  optionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },

  // ── Floating buttons ──
  floatBtn: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: 'rgba(26,16,5,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: { top: 52, left: spacing.xl },
  shareBtn: { top: 52, right: spacing.xl },

  // ── Sticky CTA bar ──
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 36,
    gap: spacing.sm,
  },
  ctaPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  ctaPriceLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '500' },
  ctaPrice: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  ctaBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 16, alignItems: 'center', minHeight: 52,
    ...shadow.lg,
  },
  ctaBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700', letterSpacing: 0.2 },
})
