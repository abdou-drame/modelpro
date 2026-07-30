import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useState } from 'react'
import { ShoppingBag, AlertCircle, ArrowLeft } from 'lucide-react-native'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { artisanApi } from '@/lib/api/artisan'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, getMontantPaye, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { OrderStatus } from '@/constants/enums'
import type { ArtisanOrder } from '@/lib/api/artisan'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'warning', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

const STATUS_ACCENT: Record<OrderStatus, string> = {
  en_attente: colors.warning,
  acceptee: colors.primary,
  en_cours: colors.primary,
  en_finition: colors.warning,
  prete: colors.success,
  livree: colors.success,
  annulee: colors.error,
}

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Prêtes', value: 'prete' },
  { label: 'Livrées', value: 'livree' },
]

function getInitials(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

function OrderRow({ order, index }: { order: ArtisanOrder; index: number }) {
  const accentColor = STATUS_ACCENT[order.statut]
  const montantPaye = getMontantPaye(order)

  return (
    <Animated.View entering={FadeInUp.delay(index * 45).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Commande de ${order.client.prenom} ${order.client.nom}, statut ${ORDER_STATUS_LABELS[order.statut]}`}
      >
        <View style={[styles.cardAccentBar, { backgroundColor: accentColor }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.avatarText, { color: accentColor }]}>
                {getInitials(order.client.prenom, order.client.nom)}
              </Text>
            </View>

            <View style={styles.cardMeta}>
              <Text style={styles.clientName}>
                {order.client.prenom} {order.client.nom}
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
              <View style={styles.deliveryRow}>
                <View style={[styles.deliveryDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.delivery, { color: accentColor }]}>
                  {formatDate(order.dateLivraisonEstimee)}
                </Text>
              </View>
            )}
            {order.prixTotal != null && (
              <View style={{ alignItems: 'flex-end', marginLeft: 'auto' }}>
                <Text style={styles.price}>{formatPrice(order.prixTotal)}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>
                  Payé: {formatPrice(montantPaye)}
                </Text>
              </View>
            )}
          </View>

          {/* Boutons d'action rapides pour demandes en attente */}
          {order.statut === 'en_attente' && (
            <View style={styles.actionRowPending}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
                activeOpacity={0.88}
              >
                <Text style={styles.acceptBtnText}>Accepter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refuseBtn}
                onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.refuseBtnText}>Refuser</Text>
              </TouchableOpacity>
            </View>
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
    refetchInterval: 10000,
  })

  const filtered = filter === 'all'
    ? (orders ?? [])
    : (orders ?? []).filter((o) => o.statut === filter)

  const pendingCount = (orders ?? []).filter((o) => o.statut === 'en_attente').length

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back()
      } else {
        router.push('/(artisan)/dashboard')
      }
    } catch (_e) {
      router.push('/(artisan)/dashboard')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Retour au tableau de bord"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          <Text style={styles.backText}>Tableau de bord</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Commandes</Text>
          <Text style={styles.count}>{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {pendingCount > 0 && filter !== 'en_attente' && (
        <TouchableOpacity
          style={styles.urgentBanner}
          onPress={() => setFilter('en_attente')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${pendingCount} commande${pendingCount !== 1 ? 's' : ''} en attente de réponse. Appuyez pour voir.`}
        >
          <AlertCircle size={15} color={colors.warning} strokeWidth={2} />
          <Text style={styles.urgentText}>
            {pendingCount} commande{pendingCount !== 1 ? 's' : ''} en attente de réponse
          </Text>
          <Text style={styles.urgentCta}>Voir</Text>
        </TouchableOpacity>
      )}

      <View style={styles.filtersBar}>
        <FlashList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = filter === item.value
            const count = item.value === 'all'
              ? (orders ?? []).length
              : (orders ?? []).filter((o) => o.statut === item.value).length
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.value)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${count} commandes`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                {count > 0 && (
                  <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item, index }) => <OrderRow order={item} index={index} />}
        ListHeaderComponent={isLoading ? <SkeletonList count={3} type="order" /> : null}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<ShoppingBag size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="Aucune commande"
              subtitle={filter === 'all' ? 'Les commandes de vos clients apparaîtront ici' : 'Aucune commande avec ce statut'}
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
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  backText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  actionRowPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
  },
  acceptBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#C05A2B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refuseBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refuseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1005',
  },

  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  urgentText: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.warning },
  urgentCta: { fontSize: fontSize.sm, fontWeight: '700', color: colors.warning, textDecorationLine: 'underline' },

  filtersBar: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginRight: spacing.xs,
    backgroundColor: colors.bgMuted,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  chipTextActive: { color: colors.white },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.bgWarm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSub },
  chipBadgeTextActive: { color: colors.white },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardAccentBar: { width: 4 },
  cardInner: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '800' },
  cardMeta: { flex: 1 },
  clientName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  modelName: { fontSize: fontSize.xs, color: colors.textSub, marginTop: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  date: { fontSize: fontSize.xs, color: colors.textMuted },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deliveryDot: { width: 5, height: 5, borderRadius: radius.full },
  delivery: { fontSize: fontSize.xs, fontWeight: '600' },
  price: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginLeft: 'auto' as any },
})
