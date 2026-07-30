import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Share } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft, Share2, ChevronRight, Star } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { modelsApi } from '@/lib/api/models'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'

const { width } = Dimensions.get('window')
const HERO_HEIGHT = Math.min(Math.round(width * 1.1), 450)

export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const modelId = Number(id)

  const { data: model, isLoading } = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => modelsApi.getById(modelId).then((r) => r.data),
  })

  if (isLoading || !model) return <View style={{ flex: 1, backgroundColor: colors.bg }} />

  const allPhotos = [model.photoUrl, ...(model.photos ?? [])].filter(Boolean) as string[]
  const atelier = model.artisan?.atelier ?? 'Atelier'
  const metier = model.artisan?.métier ?? 'Création'
  const rating = model.artisan?.noteMoyenne ?? 0

  const handleShare = async () => {
    try { await Share.share({ message: `${model.titre} — ${atelier}` }) } catch {}
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image source={{ uri: model.photoUrl ?? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80' }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(26,17,12,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
          <LinearGradient colors={['transparent', 'rgba(26,17,12,0.8)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />

          {model.prixEstimatif != null && (
            <Animated.View entering={FadeIn.delay(200)} style={styles.priceBadge}>
              <Text style={styles.priceLabel}>À partir de</Text>
              <Text style={styles.priceValue}>{formatPrice(model.prixEstimatif)}</Text>
            </Animated.View>
          )}

          {allPhotos.length > 1 && (
            <View style={styles.thumbStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {allPhotos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Animated.View entering={FadeInUp.delay(80).duration(400)} style={styles.titleBlock}>
            <Badge label={metier} variant="primary" />
            <Text style={styles.title}>{model.titre}</Text>
          </Animated.View>

          {model.artisan && (
            <Animated.View entering={FadeInUp.delay(130).duration(400)}>
              <TouchableOpacity style={styles.artisanCard} onPress={() => model.artisan && router.push(`/(client)/artisan/${model.artisan.id}`)} activeOpacity={0.85}>
                <View style={styles.artisanAvatar}>
                  <Text style={styles.artisanAvatarText}>{atelier[0]?.toUpperCase() ?? 'A'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.artisanName}>{atelier}</Text>
                  <View style={styles.artisanMeta}>
                    <Star size={12} color={colors.accent} fill={colors.accent} />
                    <Text style={styles.artisanRating}>{rating.toFixed(1)}</Text>
                    <Text style={styles.artisanMetier}>{metier}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textLight} strokeWidth={1.5} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {model.description && (
            <Animated.View entering={FadeInUp.delay(180).duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{model.description}</Text>
            </Animated.View>
          )}

          {model.options?.length > 0 && (
            <Animated.View entering={FadeInUp.delay(230).duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Options</Text>
              <View style={styles.optionsRow}>
                {model.options.map((opt, i) => (
                  <View key={i} style={styles.optionChip}>
                    <Text style={styles.optionText}>{opt}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Float buttons */}
      <TouchableOpacity style={[styles.floatBtn, { top: 52, left: spacing.xl }]} onPress={() => router.back()}>
        <ArrowLeft size={20} color={colors.white} strokeWidth={1.5} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.floatBtn, { top: 52, right: spacing.xl }]} onPress={handleShare}>
        <Share2 size={18} color={colors.white} strokeWidth={1.5} />
      </TouchableOpacity>

      {/* CTA Bar */}
      <Animated.View entering={FadeIn.delay(300)} style={styles.ctaBar}>
        <LinearGradient colors={[`${colors.bg}00`, colors.bg]} locations={[0, 0.3]} style={StyleSheet.absoluteFill} />
        {model.prixEstimatif != null && (
          <View style={styles.ctaPriceRow}>
            <Text style={styles.ctaPriceLabel}>À partir de</Text>
            <Text style={styles.ctaPrice}>{formatPrice(model.prixEstimatif)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push(`/(client)/order-form?artisanId=${model.artisan?.id}&modelId=${model.id}`)}>
          <Text style={styles.ctaBtnText}>Commander ce modèle</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  hero: { position: 'relative', overflow: 'hidden' },
  priceBadge: { position: 'absolute', bottom: 70, right: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'flex-end', ...shadow.md },
  priceLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  priceValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.white },
  thumbStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(26,17,12,0.4)', paddingVertical: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },

  body: { padding: spacing.xl, gap: spacing.xl },

  titleBlock: { gap: spacing.sm },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif, lineHeight: 32 },

  artisanCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  artisanAvatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  artisanAvatarText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.accent },
  artisanName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  artisanMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  artisanRating: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  artisanMetier: { fontSize: fontSize.xs, color: colors.textMuted, marginLeft: spacing.xs },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: { backgroundColor: colors.bgCard, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  optionText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.accent },

  floatBtn: { position: 'absolute', width: 44, height: 44, borderRadius: radius.full, backgroundColor: 'rgba(26,17,12,0.5)', alignItems: 'center', justifyContent: 'center' },

  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: 36, gap: spacing.sm },
  ctaPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  ctaPriceLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  ctaPrice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  ctaBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', ...shadow.md },
  ctaBtnText: { fontSize: fontSize.md, fontWeight: '600', color: colors.white },
})
