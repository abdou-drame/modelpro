import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { Search, Bell } from 'lucide-react-native'
import { router } from 'expo-router'
import { modelsApi } from '@/lib/api/models'
import { metiersApi } from '@/lib/api/metiers'
import { ModelCard } from '@/components/shared/ModelCard'
import { colors, spacing, fontSize, radius } from '@/constants/theme'
import { useAuthStore } from '@/lib/store/authStore'
import type { Model } from '@/lib/api/models'

export default function CatalogueScreen() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedMetier, setSelectedMetier] = useState<string | null>(null)

  const { data: metiersData } = useQuery({
    queryKey: ['metiers'],
    queryFn: () => metiersApi.list().then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['models', search, selectedMetier],
    queryFn: () =>
      modelsApi.list({ search: search || undefined, metier: selectedMetier ?? undefined, limit: 20 })
        .then((r) => r.data),
    staleTime: 1000 * 60,
  })

  const models = data?.models ?? []
  const prenom = user?.prenom ?? 'vous'
  const metierChips = [{ id: null, nom: 'Tous' }, ...(metiersData?.filter((m) => m.actif) ?? [])]

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
                <Text style={styles.greeting}>Bonjour, {prenom} 👋</Text>
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

            <View style={styles.searchBox}>
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un modèle ou artisan..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>

            {metierChips.length > 1 && (
              <View style={styles.chipsWrapper}>
                <FlashList
                  data={metierChips as any[]}
                  horizontal
                  keyExtractor={(item) => String(item.nom)}
                  showsHorizontalScrollIndicator={false}
                  estimatedItemSize={80}
                  renderItem={({ item }) => {
                    const active = selectedMetier === (item.id != null ? item.nom : null)
                    return (
                      <TouchableOpacity
                        onPress={() => setSelectedMetier(item.id != null ? item.nom : null)}
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
              <Text style={styles.sectionTitle}>Nouveautés</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.sectionLink}>VOIR TOUT →</Text>
              </TouchableOpacity>
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgMuted,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, gap: spacing.sm,
    height: 44, marginHorizontal: spacing.md, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
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
  sectionLink: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub },
})
