import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Search, Bell, ChevronLeft, ChevronRight, SlidersHorizontal, MapPin, X, Sparkles, Crown } from 'lucide-react-native'
import { router } from 'expo-router'
import { modelsApi } from '@/lib/api/models'
import { metiersApi } from '@/lib/api/metiers'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { useAuthStore } from '@/lib/store/authStore'
import type { Model } from '@/lib/api/models'

const PAGE_SIZE = 10

export default function CatalogueScreen() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedMetier, setSelectedMetier] = useState<number | null>(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [localisation, setLocalisation] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const { data: metiersData } = useQuery({
    queryKey: ['metiers'],
    queryFn: () => metiersApi.list().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['models', search, selectedMetier, minPrice, maxPrice, localisation, page],
    queryFn: () =>
      modelsApi.list({
        search: search || undefined,
        metierId: selectedMetier ?? undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        localisation: localisation || undefined,
        limit: PAGE_SIZE,
        page,
      }).then((r) => r.data),
    refetchInterval: 10000,
  })

  const models = data?.models ?? []
  const totalPages = data?.totalPages ?? 1
  const prenom = user?.prenom ?? 'Client'
  const metierChips = [{ id: null, nom: 'Tous' }, ...(metiersData?.filter((m) => m.actif) ?? [])]

  const handleMetierChange = (id: number | null) => {
    setSelectedMetier(id)
    setPage(1)
  }

  const handleSearchChange = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const hasActiveFilters = Boolean(minPrice || maxPrice || localisation || selectedMetier !== null)

  const resetFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setLocalisation('')
    setSelectedMetier(null)
    setPage(1)
  }

  return (
    <View style={styles.container}>
      <FlashList<Model>
        data={models}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        estimatedItemSize={280}
        contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: 95 }}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            {/* Header Top Bar */}
            <View style={styles.heroHeader}>
              <View style={styles.heroRow}>
                <View>
                  <View style={styles.welcomePill}>
                    <Sparkles size={12} color={colors.primary} />
                    <Text style={styles.welcomePillText}>Haute Couture Sénégal</Text>
                  </View>
                  <Text style={styles.greeting}>Bonjour, {prenom}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bellBtn}
                  onPress={() => router.push('/(client)/notifications')}
                  activeOpacity={0.8}
                >
                  <Bell size={20} color={colors.text} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </View>

            {/* WOW Luxury Gradient Banner */}
            <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginHorizontal: spacing.sm }}>
              <LinearGradient
                colors={['#1A1005', '#4A230F', '#8B3A0F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerCard}
              >
                <View style={styles.bannerBadge}>
                  <Crown size={12} color="#FBBF24" />
                  <Text style={styles.bannerBadgeText}>Artisans Certifiés & Modèles Exclusifs</Text>
                </View>
                <Text style={styles.bannerTitle}>L'Élégance Sur-Mesure</Text>
                <Text style={styles.bannerSub}>
                  Découvrez les créations des maîtres tailleurs du Sénégal et commandez avec vos propres mesures.
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* Search Box */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={18} color={colors.primary} strokeWidth={2} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Rechercher création, artisan, style..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.8}
              >
                <SlidersHorizontal size={18} color={hasActiveFilters ? colors.white : colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Advanced Filters */}
            {showFilters && (
              <View style={styles.filterPanel}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filtres sur-mesure</Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={resetFilters}>
                      <Text style={styles.resetText}>Réinitialiser</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Price range */}
                <Text style={styles.filterLabel}>Budget (FCFA)</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    value={minPrice}
                    onChangeText={(v) => { setMinPrice(v); setPage(1) }}
                    placeholder="Prix min"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.priceInput}
                  />
                  <Text style={styles.priceDash}>-</Text>
                  <TextInput
                    value={maxPrice}
                    onChangeText={(v) => { setMaxPrice(v); setPage(1) }}
                    placeholder="Prix max"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.priceInput}
                  />
                </View>

                {/* Location */}
                <Text style={styles.filterLabel}>Localisation / Ville</Text>
                <View style={styles.inputBoxWithIcon}>
                  <MapPin size={16} color={colors.primary} strokeWidth={2} />
                  <TextInput
                    value={localisation}
                    onChangeText={(v) => { setLocalisation(v); setPage(1) }}
                    placeholder="Dakar, Thiès, Saint-Louis..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.filterInput}
                  />
                  {Boolean(localisation) && (
                    <TouchableOpacity onPress={() => { setLocalisation(''); setPage(1) }}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Métier Chips */}
            {metierChips.length > 1 && (
              <View style={styles.chipsWrapper}>
                <FlashList
                  data={metierChips as any[]}
                  horizontal
                  keyExtractor={(item) => String(item.nom)}
                  showsHorizontalScrollIndicator={false}
                  estimatedItemSize={90}
                  renderItem={({ item }) => {
                    const active = selectedMetier === item.id
                    return (
                      <TouchableOpacity
                        onPress={() => handleMetierChange(item.id)}
                        style={[styles.chip, active && styles.chipActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.nom}</Text>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Catalogue d'Artisans</Text>
              {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: spacing.xs }}>
            <ModelCard model={item} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucune création disponible</Text>
              <Text style={styles.emptySub}>Essayez de modifier votre recherche</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                activeOpacity={0.7}
              >
                <ChevronLeft size={18} color={page <= 1 ? colors.textMuted : colors.primary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.pageLabel}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                activeOpacity={0.7}
              >
                <ChevronRight size={18} color={page >= totalPages ? colors.textMuted : colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  welcomePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  bannerCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: 6,
    ...shadow.md,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  bannerBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  bannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPanel: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  filterTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  resetText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  filterLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSub, marginTop: spacing.xs, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priceInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceDash: { fontSize: fontSize.md, color: colors.textMuted },
  inputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  chipsWrapper: { marginVertical: spacing.xs, paddingHorizontal: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginRight: spacing.xs,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.xs },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.sm, color: colors.textSub },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, minWidth: 48, textAlign: 'center' },
})
