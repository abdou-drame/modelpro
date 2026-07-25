import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { ArrowLeft, MessageCircle, Truck, Check } from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { OrderTimeline } from '@/components/shared/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { ORDER_STATUSES, OrderStatus } from '@/constants/enums'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  en_attente: 'acceptee',
  acceptee: 'en_cours',
  en_cours: 'en_finition',
  en_finition: 'prete',
  prete: 'livree',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  en_attente: 'Accepter la commande',
  acceptee: 'Démarrer la fabrication',
  en_cours: 'Passer en finition',
  en_finition: 'Marquer prête',
  prete: 'Confirmer la livraison',
}

export default function ArtisanOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const orderId = Number(id)
  const queryClient = useQueryClient()

  const { data: order } = useQuery({
    queryKey: ['artisan-order', orderId],
    queryFn: () => artisanApi.orderById(orderId).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: (statut: OrderStatus) => artisanApi.updateOrderStatus(orderId, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['artisan-orders'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-stats'] })
    },
  })

  const handleNextStatus = () => {
    if (!order) return
    const next = NEXT_STATUS[order.statut]
    if (!next) return
    Alert.alert(
      NEXT_LABEL[order.statut] ?? 'Avancer',
      `Passer la commande à "${ORDER_STATUS_LABELS[next]}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => statusMutation.mutate(next) },
      ]
    )
  }

  const handleRefuse = () => {
    Alert.alert('Refuser la commande', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive',
        onPress: () => statusMutation.mutate('annulee'),
      },
    ])
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.bg }} />

  const nextStatus = NEXT_STATUS[order.statut]
  const canAdvance = !!nextStatus
  const canRefuse = order.statut === 'en_attente'

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Commande #{order.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Client info */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View>
              <Text style={styles.clientName}>
                {order.client.user.prenom} {order.client.user.nom}
              </Text>
              <Text style={styles.clientPhone}>{order.client.user.telephone}</Text>
            </View>
            <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} size="md" />
          </View>
          {order.creation && (
            <View style={styles.modelBadge}>
              <Text style={styles.modelLabel}>Modèle : {order.creation.titre}</Text>
            </View>
          )}
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Avancement</Text>
          <OrderTimeline statut={order.statut} dateLivraisonEstimee={order.dateLivraisonEstimee} />
        </Animated.View>

        {/* Description */}
        {order.description && (
          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Demande client</Text>
            <Text style={styles.description}>{order.description}</Text>
          </Animated.View>
        )}

        {/* Mesures */}
        {order.mesures && Object.keys(order.mesures).length > 0 && (
          <Animated.View entering={FadeInUp.delay(220).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Mesures</Text>
            <View style={styles.mesuresGrid}>
              {Object.entries(order.mesures).map(([key, val]) => (
                <View key={key} style={styles.mesureItem}>
                  <Text style={styles.mesureKey}>{key}</Text>
                  <Text style={styles.mesureVal}>{val}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Paiement */}
        <Animated.View entering={FadeInUp.delay(260).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.payCard}>
            {order.prixTotal != null && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Total</Text>
                <Text style={styles.payVal}>{formatPrice(order.prixTotal)}</Text>
              </View>
            )}
            {order.acompte != null && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Acompte</Text>
                <Text style={styles.payVal}>{formatPrice(order.acompte)}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actions}>
          {canAdvance && (
            <TouchableOpacity
              style={styles.btnAdvance}
              onPress={handleNextStatus}
              disabled={statusMutation.isPending}
            >
              <Check size={18} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.btnAdvanceText}>{NEXT_LABEL[order.statut]}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnMessage}
            onPress={() => router.push(`/(artisan)/messages/${orderId}`)}
          >
            <MessageCircle size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.btnMessageText}>Envoyer un message</Text>
          </TouchableOpacity>

          {canRefuse && (
            <TouchableOpacity style={styles.btnRefuse} onPress={handleRefuse}>
              <Text style={styles.btnRefuseText}>Refuser la commande</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Text style={styles.date}>Reçue le {formatDate(order.createdAt)}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 },
  clientCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  clientPhone: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  modelBadge: {
    backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  modelLabel: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },
  mesuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mesureItem: {
    backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignItems: 'center', minWidth: 90,
  },
  mesureKey: { fontSize: fontSize.xs, color: colors.textMuted },
  mesureVal: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  payCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payLabel: { fontSize: fontSize.sm, color: colors.textSub },
  payVal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  actions: { gap: spacing.sm },
  btnAdvance: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  btnAdvanceText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  btnMessage: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
  },
  btnMessageText: { fontSize: fontSize.base, fontWeight: '600', color: colors.primary },
  btnRefuse: {
    alignItems: 'center', padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.error,
  },
  btnRefuseText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },
  date: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
})
