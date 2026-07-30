import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { useState } from 'react'
import { ShoppingBag, AlertCircle } from 'lucide-react-native'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { artisanApi } from '@/lib/api/artisan'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
import { OrderStatus } from '@/constants/enums'
import type { ArtisanOrder } from '@/lib/api/artisan'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'warning', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Prêtes', value: 'prete' },
  { label: 'Livrées', value: 'livree' },
]

function OrderRow({ order, index }: { order: ArtisanOrder; index: number }) {
  const initials = `${order.client.prenom[0]}${order.client.nom[0]}`.toUpperCase()

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 40, 200)).duration(400)}>
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(artisan)/orders/${order.id}`)} activeOpacity={0.9}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{order.client.prenom} {order.client.nom}</Text>
            {order.creation && <Text style={styles.modelName} numberOfLines={1}>{order.creation.titre}</Text>}
          </View>
          <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          {order.prixTotal != null && <Text style={styles.price}>{formatPrice(order.prixTotal)}</Text>}
        </View>

        {order.statut === 'en_attente' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => router.push(`/(artisan)/orders/${order.id}`)}>
              <Text style={styles.acceptBtnText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refuseBtn} onPress={() => router.push(`/(artisan)/orders/${order.id}`)}>
              <Text style={styles.refuseBtnText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ArtisanOrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['artisan-orders'],
    queryFn: () => artisanApi.orders().then((r) => r.data),
    refetchInterval: 10000,
  })

  const filtered = filter === 'all' ? (orders ?? []) : (orders ?? []).filter((o) => o.statut === filter)
  const pendingCount = (orders ?? []).filter((o) => o.statut === 'en_attente').length

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Commandes</Text>
        <Text style={styles.subtitle}>{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {pendingCount > 0 && filter !== 'en_attente' && (
        <TouchableOpacity style={styles.alertBanner} onPress={() => setFilter('en_attente')} activeOpacity={0.85}>
          <AlertCircle size={16} color={colors.warning} strokeWidth={2} />
          <Text style={styles.alertText}>{pendingCount} en attente de réponse</Text>
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value
          const count = f.value === 'all' ? (orders ?? []).length : (orders ?? []).filter((o) => o.statut === f.value).length
          return (
            <TouchableOpacity key={f.value} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(f.value)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              {count > 0 && <View style={[styles.chipBadge, active && styles.chipBadgeActive]}><Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>{count}</Text></View>}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => <OrderRow order={item} index={index} />}
        ListHeaderComponent={isLoading ? <SkeletonList count={3} type="order" /> : null}
        ListEmptyComponent={isLoading ? null : (
          <EmptyState icon={<ShoppingBag size={40} color={colors.textLight} strokeWidth={1.5} />} title="Aucune commande" subtitle="Les commandes apparaîtront ici" />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, backgroundColor: colors.warningBg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning },
  alertText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.warning, flex: 1 },

  filtersRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  chipBadgeTextActive: { color: colors.white },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  clientName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  modelName: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  acceptBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  acceptBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  refuseBtn: { flex: 1, backgroundColor: colors.bgMuted, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  refuseBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
})
