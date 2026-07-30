import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { ChevronRight, ShoppingBag } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
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
    <Animated.View entering={FadeInUp.delay(Math.min(index * 40, 200)).duration(400)}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(client)/orders/${order.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.atelier} numberOfLines={1}>{order.artisan.atelier}</Text>
            <Text style={styles.metier}>{order.artisan.métier}</Text>
          </View>
          <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
        </View>

        {order.creation && (
          <Text style={styles.model} numberOfLines={1}>{order.creation.titre}</Text>
        )}

        <View style={styles.cardBottom}>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          {order.prixTotal != null && (
            <Text style={styles.price}>{formatPrice(order.prixTotal)}</Text>
          )}
          <ChevronRight size={16} color={colors.textLight} strokeWidth={2} />
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
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Mes commandes</Text>
        <Text style={styles.subtitle}>{orders?.length ?? 0} commande{(orders?.length ?? 0) > 1 ? 's' : ''}</Text>
      </View>

      <FlashList
        data={orders ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => <OrderItem order={item} index={index} />}
        ListHeaderComponent={isLoading ? <SkeletonList count={3} type="order" /> : null}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<ShoppingBag size={40} color={colors.textLight} strokeWidth={1.5} />}
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
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  atelier: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  metier: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  model: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  date: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.accent },
})
