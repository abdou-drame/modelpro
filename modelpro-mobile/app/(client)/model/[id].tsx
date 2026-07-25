import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { modelsApi } from '@/lib/api/models'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const { width } = Dimensions.get('window')

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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image principale */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: model.photoUrl ?? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80' }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(26,26,46,0.5)', 'transparent', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          {/* Photos secondaires */}
          {model.photos?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoStrip}
              contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
            >
              {[model.photoUrl, ...model.photos].filter(Boolean).map((uri, i) => (
                <TouchableOpacity key={i} activeOpacity={0.85}>
                  <Image
                    source={{ uri: uri! }}
                    style={styles.thumbPhoto}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.body}>
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(80).springify()}>
            <Badge label={model.artisan.metier.nom} variant="primary" />
            <Text style={styles.title}>{model.titre}</Text>
            {model.prixEstimatif != null && (
              <Text style={styles.price}>{formatPrice(model.prixEstimatif)}</Text>
            )}
          </Animated.View>

          {/* Artisan */}
          <Animated.View entering={FadeInUp.delay(140).springify()}>
            <TouchableOpacity
              style={styles.artisanRow}
              onPress={() => router.push(`/(client)/artisan/${model.artisan.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.artisanInfo}>
                <Text style={styles.artisanName}>{model.artisan.nomAtelier}</Text>
                <View style={styles.artisanMeta}>
                  <StarRating value={model.artisan.notemoyenne} size={12} />
                  <Text style={styles.artisanMetaText}>
                    {model.artisan.notemoyenne.toFixed(1)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Description */}
          {model.description && (
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{model.description}</Text>
            </Animated.View>
          )}

          {/* Options */}
          {model.options?.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Options disponibles</Text>
              <View style={styles.optionsWrap}>
                {model.options.map((opt, i) => (
                  <View key={i} style={styles.optionChip}>
                    <Text style={styles.optionText}>{opt}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Back — glass */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.backBtnBorder} />
        <ArrowLeft size={20} color={colors.white} strokeWidth={2} />
      </TouchableOpacity>

      {/* CTA fixe */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push(`/(client)/order-form?artisanId=${model.artisan.id}&modelId=${model.id}`)}
        >
          <Text style={styles.ctaBtnText}>Commander ce modèle</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imageContainer: { position: 'relative' },
  mainImage: { width: '100%', height: width * 1.1, backgroundColor: colors.bgMuted },
  photoStrip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(26,26,46,0.4)',
  },
  thumbPhoto: { width: 56, height: 56, borderRadius: radius.md },
  body: { padding: spacing.xl, gap: spacing.xl },
  title: {
    fontSize: fontSize.xxl, fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginTop: spacing.sm,
  },
  price: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginTop: 4 },
  artisanRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, ...shadow.sm,
  },
  artisanInfo: { flex: 1, gap: 4 },
  artisanName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  artisanMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  artisanMetaText: { fontSize: fontSize.xs, color: colors.textSub },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    backgroundColor: colors.bgMuted, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  optionText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  backBtn: {
    position: 'absolute', top: 52, left: spacing.xl,
    width: 40, height: 40, borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg, padding: spacing.xl,
    paddingBottom: 36, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  ctaBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
  },
  ctaBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
})
