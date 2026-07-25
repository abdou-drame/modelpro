import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRef, useState, useCallback } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { Search, SlidersHorizontal } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { modelsApi } from '@/lib/api/models'
import { metiersApi } from '@/lib/api/metiers'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { Model } from '@/lib/api/models'

const HEADER_MAX = 160
const HEADER_MIN = 60
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<Model>)

export default function CatalogueScreen() {
  const [search, setSearch] = useState('')
  const [selectedMetier, setSelectedMetier] = useState<number | null>(null)
  const scrollY = useSharedValue(0)

  const { data: metiersData } = useQuery({
    queryKey: ['metiers'],
    queryFn: () => metiersApi.list().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['models', search, selectedMetier],
    queryFn: () =>
      modelsApi.list({ search: search || undefined, metierId: selectedMetier ?? undefined, limit: 20 })
        .then((r) => r.data),
    staleTime: 1000 * 60,
  })

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 80], [HEADER_MAX, HEADER_MIN], Extrapolation.CLAMP),
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 60], [0, -10], Extrapolation.CLAMP) },
    ],
  }))

  const models = data?.models ?? []

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={[colors.accent, colors.accentSoft]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={titleStyle}>
          <Text style={styles.headerTitle}>Catalogue</Text>
          <Text style={styles.headerSub}>Découvrez les artisans et leurs créations</Text>
        </Animated.View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un modèle..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
        </View>
      </Animated.View>

      {/* Filtre métiers */}
      {metiersData && metiersData.length > 0 && (
        <View style={styles.filtersWrapper}>
          <FlashList
            data={[{ id: null, nom: 'Tous' }, ...metiersData.filter((m) => m.actif)] as any[]}
            horizontal
            keyExtractor={(item) => String(item.id ?? 'all')}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            estimatedItemSize={80}
            renderItem={({ item }) => {
              const active = selectedMetier === (item.id ?? null)
              return (
                <TouchableOpacity
                  onPress={() => setSelectedMetier(item.id ?? null)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item.nom}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      )}

      <AnimatedFlashList
        data={models}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        estimatedItemSize={280}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            <ModelCard model={item} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun modèle trouvé</Text>
              <Text style={styles.emptySub}>Essayez d'autres filtres</Text>
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.white,
  },
  filtersWrapper: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: spacing.xs,
    backgroundColor: colors.bgMuted,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSub,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: fontSize.md,
    color: colors.textSub,
  },
})
