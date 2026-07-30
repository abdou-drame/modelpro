import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, MessageCircle, XCircle, CreditCard, Star, ShieldAlert, Clock } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { OrderTimeline } from '@/components/shared/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, getMontantPaye, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { OrderStatus } from '@/constants/enums'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const orderId = Number(id)
  const queryClient = useQueryClient()

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.myOrders().then((r) => r.data),
    refetchInterval: 5000,
  })
  const order = orders?.find((o) => o.id === orderId)

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      showAlert('Commande annulée', 'Votre commande a été annulée avec succès.')
      router.replace('/(client)/orders')
    },
    onError: () => {
      showAlert('Erreur', 'Impossible d’annuler la commande.')
    },
  })

  const handleCancel = () => {
    showAlert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, annuler', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    )
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.bg }} />

  const canCancel = !['livree', 'annulee'].includes(order.statut)
  const montantPaye = getMontantPaye(order)

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(client)/orders')}
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

        {/* Garment + artisan card */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.orderCard}>
          {order.creation?.photoUrl ? (
            <View style={styles.garmentHero}>
              <Image
                source={{ uri: order.creation.photoUrl }}
                style={StyleSheet.absoluteFill as any}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(26,16,5,0.72)']}
                style={StyleSheet.absoluteFill}
              />
              {order.creation.titre ? (
                <Text style={styles.garmentHeroTitle} numberOfLines={2}>
                  {order.creation.titre}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.orderCardBody}>
            <View style={styles.artisanRow}>
              <View style={styles.artisanInfo}>
                <Text style={styles.artisanName}>{order.artisan.atelier}</Text>
                {order.artisan.métier ? (
                  <Text style={styles.artisanMetier}>{order.artisan.métier}</Text>
                ) : null}
              </View>
              <Badge
                label={ORDER_STATUS_LABELS[order.statut]}
                variant={STATUS_VARIANT[order.statut]}
                size="md"
              />
            </View>

            {!order.creation?.photoUrl && order.creation?.titre ? (
              <Text style={styles.modelTitle}>{order.creation.titre}</Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Delivery callout */}
        {order.dateLivraisonEstimee && !['livree', 'annulee'].includes(order.statut) && (
          <Animated.View entering={FadeInUp.delay(90).springify()} style={styles.deliveryBanner}>
            <Clock size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.deliveryText}>
              Livraison estimée{' '}
              <Text style={styles.deliveryDate}>
                {new Date(order.dateLivraisonEstimee).toLocaleDateString('fr-SN', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            </Text>
          </Animated.View>
        )}

        {/* Timeline — visual centerpiece */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.timelineCard}>
          <Text style={styles.timelineHeading}>Suivi de fabrication</Text>
          <OrderTimeline
            statut={order.statut}
            dateLivraisonEstimee={order.dateLivraisonEstimee}
          />
        </Animated.View>

        {/* Payment */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Statut</Text>
              <Badge label={PAYMENT_STATUS_LABELS[order.statutPaiement]} variant="neutral" />
            </View>
            {order.prixTotal != null && (
              <>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Montant total</Text>
                  <Text style={styles.paymentTotal}>{formatPrice(order.prixTotal)}</Text>
                </View>
              </>
            )}
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Montant payé</Text>
              <Text style={styles.paymentValue}>{formatPrice(montantPaye)}</Text>
            </View>
            {order.prixTotal != null && (
              <>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Solde restant</Text>
                  <Text style={styles.paymentValue}>
                    {formatPrice(Math.max(0, (order.prixTotal ?? 0) - montantPaye))}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        {order.description && (
          <Animated.View entering={FadeInUp.delay(220).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{order.description}</Text>
            </View>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(280).springify()} style={styles.actionsSection}>

          {/* Primary: message + payment side by side */}
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={styles.btnMessage}
              onPress={() => router.push(`/(client)/messages/${orderId}`)}
              accessibilityRole="button"
              accessibilityLabel="Contacter l'artisan"
            >
              <MessageCircle size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.btnMessageText}>Contacter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPay}
              onPress={() => router.push({ pathname: '/(client)/payment', params: { orderId: String(orderId) } })}
              accessibilityRole="button"
              accessibilityLabel="Effectuer un paiement"
            >
              <CreditCard size={18} color={colors.white} strokeWidth={2} />
              <Text style={styles.btnPayText}>Paiement</Text>
            </TouchableOpacity>
          </View>

          {/* Review — shown only after delivery */}
          {order.statut === 'livree' && (
            <TouchableOpacity
              style={styles.btnReview}
              onPress={() => router.push({
                pathname: '/(client)/review',
                params: {
                  artisanId: String(order.artisan.id ?? ''),
                  artisanName: order.artisan.atelier,
                  orderId: String(orderId),
                },
              })}
              accessibilityRole="button"
              accessibilityLabel="Donner un avis sur l'artisan"
            >
              <Star size={16} color="#B45309" strokeWidth={2} />
              <Text style={styles.btnReviewText}>Donner un avis</Text>
            </TouchableOpacity>
          )}

          {/* Cancel — only when applicable */}
          {canCancel && (
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Annuler la commande"
            >
              <XCircle size={16} color={colors.error} strokeWidth={2} />
              <Text style={styles.btnCancelText}>Annuler la commande</Text>
            </TouchableOpacity>
          )}

          {/* Claim — ghost link */}
          <TouchableOpacity
            style={styles.btnClaim}
            onPress={() => router.push({ pathname: '/(client)/claim', params: { orderId: String(orderId) } })}
            accessibilityRole="button"
            accessibilityLabel="Signaler un problème"
          >
            <ShieldAlert size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.btnClaimText}>Signaler un problème</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.orderDate}>Commande passée le {formatDate(order.createdAt)}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  scroll: { paddingBottom: 60 },

  orderCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    margin: spacing.xl,
    marginBottom: 0,
    overflow: 'hidden',
    ...shadow.sm,
  },
  garmentHero: {
    height: 170,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  garmentHeroTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  orderCardBody: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  artisanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  artisanInfo: { gap: 3, flex: 1, marginRight: spacing.sm },
  artisanName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  artisanMetier: { fontSize: fontSize.xs, color: colors.textMuted },
  modelTitle: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub, marginTop: spacing.xs },

  deliveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginTop: spacing.md,
    backgroundColor: `${colors.primary}12`,
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: `${colors.primary}28`,
  },
  deliveryText: { fontSize: fontSize.sm, color: colors.textSub, flex: 1 },
  deliveryDate: { fontWeight: '700', color: colors.primary },

  timelineCard: {
    backgroundColor: colors.bgMuted,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHeading: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },

  section: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base, fontWeight: '700', color: colors.text, letterSpacing: -0.2,
  },

  paymentCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, ...shadow.sm,
  },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2,
  },
  paymentDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
  paymentLabel: { fontSize: fontSize.sm, color: colors.textSub, fontWeight: '500' },
  paymentTotal: { fontSize: fontSize.base, fontWeight: '800', color: colors.text },
  paymentValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },

  descriptionCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, ...shadow.sm,
  },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },

  actionsSection: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryActions: { flexDirection: 'row', gap: spacing.sm },
  btnMessage: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, minHeight: 48,
  },
  btnMessageText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  btnPay: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, minHeight: 48,
    ...shadow.sm,
  },
  btnPayText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  btnReview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.warningLight, borderRadius: radius.lg, paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: '#D97706', minHeight: 48,
  },
  btnReviewText: { fontSize: fontSize.sm, fontWeight: '700', color: '#B45309' },
  btnCancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.lg,
    paddingVertical: spacing.sm, minHeight: 44,
  },
  btnCancelText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },
  btnClaim: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  btnClaimText: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textMuted },

  orderDate: {
    fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
})
