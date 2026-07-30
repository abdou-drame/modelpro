import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { Search, Bell, SlidersHorizontal, MapPin, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native'
import { router } from 'expo-router'
import { modelsApi } from '@/lib/api/models'
import { metiersApi } from '@/lib/api/metiers'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
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

  const hasActiveFilters = Boolean(minPrice || maxPrice || localisation || selectedMetier !== null)

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <FlashList<Model>
        data={models}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>Bonjour {prenom}</Text>
                <Text style={styles.tagline}>Trouvez votre artisan</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 6,
                    borderRadius: radius.full,
                  }}
                  onPress={() => router.push('/(client)/appointments/new')}
                >
                  <Calendar size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: colors.primary }}>RDV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bellBtn}
                  onPress={() => router.push('/(client)/notifications')}
                >
                  <Bell size={22} color={colors.text} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={18} color={colors.textMuted} strokeWidth={1.5} />
                <TextInput
                  value={search}
                  onChangeText={(v) => { setSearch(v); setPage(1) }}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.textLight}
                  style={styles.searchInput}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={18} color={hasActiveFilters ? colors.white : colors.text} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Filters */}
            {showFilters && (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.filterPanel}>
                <Text style={styles.filterLabel}>Budget (FCFA)</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    value={minPrice}
                    onChangeText={(v) => { setMinPrice(v); setPage(1) }}
                    placeholder="Min"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    style={styles.priceInput}
                  />
                  <Text style={styles.priceDash}>—</Text>
                  <TextInput
                    value={maxPrice}
                    onChangeText={(v) => { setMaxPrice(v); setPage(1) }}
                    placeholder="Max"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    style={styles.priceInput}
                  />
                </View>

                <Text style={styles.filterLabel}>Localisation</Text>
                <View style={styles.locationRow}>
                  <MapPin size={16} color={colors.textMuted} strokeWidth={1.5} />
                  <TextInput
                    value={localisation}
                    onChangeText={(v) => { setLocalisation(v); setPage(1) }}
                    placeholder="Dakar, Thiès..."
                    placeholderTextColor={colors.textLight}
                    style={styles.locationInput}
                  />
                  {localisation ? (
                    <TouchableOpacity onPress={() => { setLocalisation(''); setPage(1) }}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Animated.View>
            )}

            {/* Chips */}
            {metierChips.length > 1 && (
              <View style={styles.chipsRow}>
                <FlashList
                  data={metierChips as any[]}
                  horizontal
                  keyExtractor={(item) => String(item.nom)}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const active = selectedMetier === item.id
                    return (
                      <TouchableOpacity
                        onPress={() => { setSelectedMetier(item.id); setPage(1) }}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.nom}</Text>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
            )}

            {/* Section title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Catalogue</Text>
              {isLoading && <ActivityIndicator size="small" color={colors.accent} />}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            <ModelCard model={item} index={index} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>Modifiez vos filtres</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={20} color={page <= 1 ? colors.textLight : colors.text} />
              </TouchableOpacity>
              <Text style={styles.pageText}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={20} color={page >= totalPages ? colors.textLight : colors.text} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingTop: 56, marginBottom: spacing.md },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  greeting: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

  searchRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  filterBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  filterPanel: { marginHorizontal: spacing.md, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  filterLabel: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: { flex: 1, height: 44, backgroundColor: colors.bgMuted, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: fontSize.sm, color: colors.text },
  priceDash: { color: colors.textLight },
  locationRow: { flexDirection: 'row', alignItems: 'center', height: 44, backgroundColor: colors.bgMuted, borderRadius: radius.sm, paddingHorizontal: spacing.md, gap: spacing.sm },
  locationInput: { flex: 1, fontSize: fontSize.sm, color: colors.text },

  chipsRow: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.white },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  pageBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
})
