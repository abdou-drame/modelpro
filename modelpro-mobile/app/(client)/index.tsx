import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { Search, Bell, ChevronLeft, ChevronRight, SlidersHorizontal, MapPin, X } from 'lucide-react-native'
import { router } from 'expo-router'
import { modelsApi } from '@/lib/api/models'
import { metiersApi } from '@/lib/api/metiers'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius } from '@/constants/theme'
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
  const prenom = user?.prenom ?? 'vous'
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
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 90 }}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>Bonjour, {prenom}</Text>
                <Text style={styles.greetingSub}>Trouvez votre style</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => router.push('/(client)/notifications')}
                activeOpacity={0.7}
              >
                <Bell size={20} color={colors.text} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            {/* Search row with filter toggle */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Rechercher un modèle ou artisan..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.75}
              >
                <SlidersHorizontal size={18} color={hasActiveFilters ? colors.white : colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Filter Panel */}
            {showFilters && (
              <View style={styles.filterPanel}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filtres avancés</Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={resetFilters}>
                      <Text style={styles.resetText}>Réinitialiser</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Price min / max */}
                <Text style={styles.filterLabel}>Fourchette de prix (FCFA)</Text>
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

                {/* Localisation */}
                <Text style={styles.filterLabel}>Localisation / Ville</Text>
                <View style={styles.inputBoxWithIcon}>
                  <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    value={localisation}
                    onChangeText={(v) => { setLocalisation(v); setPage(1) }}
                    placeholder="Ex: Dakar, Thiès, St-Louis..."
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

            {/* Metier chips */}
            {metierChips.length > 1 && (
              <View style={styles.chipsWrapper}>
                <FlashList
                  data={metierChips as any[]}
                  horizontal
                  keyExtractor={(item) => String(item.nom)}
                  showsHorizontalScrollIndicator={false}
                  estimatedItemSize={80}
                  renderItem={({ item }) => {
                    const active = selectedMetier === item.id
                    return (
                      <TouchableOpacity
                        onPress={() => handleMetierChange(item.id)}
                        style={[styles.chip, active && styles.chipActive]}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.nom}</Text>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Catalogue</Text>
              {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
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
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.lg,
  },
  greeting: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: fontSize.sm, color: colors.textSub, marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.xs,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgMuted,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, gap: spacing.sm,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  filterBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPanel: {
    marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  filterTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  resetText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  filterLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSub, marginTop: spacing.xs, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priceInput: {
    flex: 1, height: 38, backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  priceDash: { fontSize: fontSize.md, color: colors.textMuted },
  inputBoxWithIcon: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgMuted,
    borderRadius: radius.md, paddingHorizontal: spacing.sm, gap: spacing.xs,
    height: 38, borderWidth: 1, borderColor: colors.border,
  },
  filterInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  chipsWrapper: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
    marginRight: spacing.xs, backgroundColor: colors.bgMuted,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub },
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.lg, paddingVertical: spacing.xl, marginTop: spacing.md,
  },
  pageBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.text, minWidth: 48, textAlign: 'center' },
})
