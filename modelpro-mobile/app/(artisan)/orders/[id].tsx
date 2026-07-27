import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, MessageCircle, ChevronRight, Phone, Package } from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { OrderTimeline } from '@/components/shared/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { ORDER_STATUSES, OrderStatus } from '@/constants/enums'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'warning', acceptee: 'primary', en_cours: 'primary',
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

const NEXT_DESCRIPTION: Partial<Record<OrderStatus, string>> = {
  en_attente: 'Le client sera informé que vous avez accepté sa commande.',
  acceptee: 'La fabrication commence. Le client verra la progression.',
  en_cours: 'Marquez la commande en phase de finition.',
  en_finition: 'La commande est prête à être retirée ou livrée.',
  prete: 'Confirmez que la commande a bien été livrée au client.',
}

function getInitials(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>
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
      NEXT_DESCRIPTION[order.statut] ?? `Passer à "${ORDER_STATUS_LABELS[next]}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => statusMutation.mutate(next) },
      ]
    )
  }

  const handleRefuse = () => {
    Alert.alert('Refuser la commande', 'Cette action est irréversible. Le client sera notifié.', [
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
  const isTerminal = order.statut === 'livree' || order.statut === 'annulee'

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(artisan)/orders')}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour aux commandes"
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Commande #{order.id}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Primary action — surfaced at top if actionable */}
        {canAdvance && (
          <Animated.View entering={FadeInUp.delay(40).springify()}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, statusMutation.isPending && styles.primaryActionBtnDisabled]}
              onPress={handleNextStatus}
              disabled={statusMutation.isPending}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={NEXT_LABEL[order.statut]}
            >
              {statusMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>{NEXT_LABEL[order.statut]}</Text>
                  <ChevronRight size={18} color={colors.white} strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Client card */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {getInitials(order.client.prenom, order.client.nom)}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {order.client.prenom} {order.client.nom}
              </Text>
              {order.client.telephone && (
                <View style={styles.phoneRow}>
                  <Phone size={12} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.clientPhone}>{order.client.telephone}</Text>
                </View>
              )}
            </View>
            <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} size="md" />
          </View>

          {order.creation && (
            <View style={styles.modelRow}>
              <Package size={13} color={colors.textSub} strokeWidth={2} />
              <Text style={styles.modelLabel}>{order.creation.titre}</Text>
            </View>
          )}

          <Text style={styles.orderDate}>Reçue le {formatDate(order.createdAt)}</Text>
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <SectionHeader title="Avancement" />
          <View style={styles.timelineCard}>
            <OrderTimeline statut={order.statut} dateLivraisonEstimee={order.dateLivraisonEstimee} />
          </View>
        </Animated.View>

        {/* Description */}
        {order.description && (
          <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.section}>
            <SectionHeader title="Demande client" />
            <View style={styles.descCard}>
              <Text style={styles.description}>{order.description}</Text>
            </View>
          </Animated.View>
        )}

        {/* Mesures */}
        {order.mesures && Object.keys(order.mesures).length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
            <SectionHeader title="Mesures" />
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
        <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
          <SectionHeader title="Paiement" />
          <View style={styles.payCard}>
            {order.prixTotal != null && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Total commande</Text>
                <Text style={styles.payValPrimary}>{formatPrice(order.prixTotal)}</Text>
              </View>
            )}
            {order.acompte != null && (
              <>
                {order.prixTotal != null && <View style={styles.payDivider} />}
                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>Acompte reçu</Text>
                  <Text style={styles.payVal}>{formatPrice(order.acompte)}</Text>
                </View>
                {order.prixTotal != null && (
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Restant dû</Text>
                    <Text style={[styles.payVal, { color: order.prixTotal - order.acompte > 0 ? colors.warning : colors.success }]}>
                      {formatPrice(order.prixTotal - order.acompte)}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Animated.View>

        {/* Secondary actions */}
        <Animated.View entering={FadeInUp.delay(280).springify()} style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.btnMessage}
            onPress={() => router.push(`/(artisan)/messages/${orderId}`)}
            accessibilityRole="button"
            accessibilityLabel="Envoyer un message au client"
          >
            <MessageCircle size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.btnMessageText}>Messagerie client</Text>
          </TouchableOpacity>

          {canRefuse && (
            <TouchableOpacity
              style={styles.btnRefuse}
              onPress={handleRefuse}
              accessibilityRole="button"
              accessibilityLabel="Refuser cette commande"
            >
              <Text style={styles.btnRefuseText}>Refuser la commande</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 80 },

  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    ...shadow.md,
  },
  primaryActionBtnDisabled: { opacity: 0.6 },
  primaryActionText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700', flex: 1, textAlign: 'center' },

  clientCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.sm,
  },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: { fontSize: fontSize.base, fontWeight: '800', color: colors.primary },
  clientInfo: { flex: 1 },
  clientName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  clientPhone: { fontSize: fontSize.xs, color: colors.textMuted },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  modelLabel: { fontSize: fontSize.sm, color: colors.textSub },
  orderDate: { fontSize: fontSize.xs, color: colors.textMuted },

  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },

  timelineCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    ...shadow.sm,
  },

  descCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 22 },

  mesuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mesureItem: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mesureKey: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'capitalize' },
  mesureVal: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginTop: 2 },

  payCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  payDivider: { height: 1, backgroundColor: colors.borderLight },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payLabel: { fontSize: fontSize.sm, color: colors.textSub },
  payVal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  payValPrimary: { fontSize: fontSize.base, fontWeight: '800', color: colors.primary },

  secondaryActions: { gap: spacing.sm },
  btnMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  btnMessageText: { fontSize: fontSize.base, fontWeight: '600', color: colors.primary },
  btnRefuse: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  btnRefuseText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error, textDecorationLine: 'underline' },
})
