import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { Order } from '@/lib/api/orders'
import type { OrderStatus } from '@/constants/enums'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral',
  acceptee: 'primary',
  en_cours: 'primary',
  en_finition: 'warning',
  prete: 'success',
  livree: 'success',
  annulee: 'error',
}

function OrderItem({ order, index }: { order: Order; index: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(client)/orders/${order.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.artisanName}>{order.artisan.atelier}</Text>
            <Text style={styles.metier}>{order.artisan.métier}</Text>
          </View>
          <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
        </View>

        {order.creation && (
          <Text style={styles.modelName} numberOfLines={1}>
            {order.creation.titre}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          {order.prixTotal != null && (
            <Text style={styles.price}>{formatPrice(order.prixTotal)}</Text>
          )}
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ClientOrdersScreen() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.myOrders().then((r) => r.data),
    refetchInterval: 10000,
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.replace('/(client)')}
          accessibilityRole="button"
          accessibilityLabel="Retour au catalogue"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          <Text style={styles.backText}>Catalogue</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes commandes</Text>
      </View>

      <FlashList
        data={orders ?? []}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={130}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => <OrderItem order={item} index={index} />}
        ListHeaderComponent={isLoading ? <SkeletonList count={3} type="order" /> : null}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<ShoppingBag size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="Aucune commande"
              subtitle="Parcourez le catalogue pour passer votre première commande"
              action={{ label: 'Voir le catalogue', onPress: () => router.replace('/(client)') }}
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
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.xs,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  backText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.sm, ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  artisanName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  metier: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  modelName: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  date: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
})
