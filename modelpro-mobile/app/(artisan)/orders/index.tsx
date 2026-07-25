import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useState } from 'react'
import { BlurView } from 'expo-blur'
import { ShoppingBag } from 'lucide-react-native'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { artisanApi } from '@/lib/api/artisan'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { ORDER_STATUSES, OrderStatus } from '@/constants/enums'
import type { ArtisanOrder } from '@/lib/api/artisan'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
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
  return (
    <Animated.View entering={FadeInUp.delay(index * 45).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.clientName}>
              {order.client.user.prenom} {order.client.user.nom}
            </Text>
            {order.creation && (
              <Text style={styles.modelName} numberOfLines={1}>{order.creation.titre}</Text>
            )}
          </View>
          <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          {order.dateLivraisonEstimee && (
            <Text style={styles.delivery}>
              Livraison : {formatDate(order.dateLivraisonEstimee)}
            </Text>
          )}
          {order.prixTotal && (
            <Text style={styles.price}>{formatPrice(order.prixTotal)}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ArtisanOrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['artisan-orders'],
    queryFn: () => artisanApi.orders().then((r) => r.data),
  })

  const filtered = filter === 'all'
    ? (orders ?? [])
    : (orders ?? []).filter((o) => o.statut === filter)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commandes reçues</Text>
        <Text style={styles.count}>{filtered.length} commande{filtered.length > 1 ? 's' : ''}</Text>
      </View>

      {/* Filtres */}
      <View style={styles.filtersBar}>
        <FlashList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item.value}
          estimatedItemSize={90}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = filter === item.value
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {active && <BlurView intensity={0} tint="light" style={StyleSheet.absoluteFill} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={120}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => <OrderRow order={item} index={index} />}
        ListHeaderComponent={isLoading ? <SkeletonList count={3} type="order" /> : null}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<ShoppingBag size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="Aucune commande"
              subtitle={filter === 'all' ? 'Les commandes de vos clients apparaîtront ici' : `Aucune commande avec le statut sélectionné`}
            />
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  filtersBar: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, marginRight: spacing.xs,
    backgroundColor: colors.bgMuted, overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.sm, ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  modelName: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic', marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  delivery: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginLeft: 'auto' as any },
})
