import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, MessageCircle, XCircle, CreditCard, Star, ShieldAlert, Clock } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { OrderTimeline } from '@/components/shared/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
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
      showAlert('Commande annulée', 'Votre commande a été annulée.')
      router.replace('/(client)/orders')
    },
    onError: () => showAlert('Erreur', 'Impossible d\'annuler.'),
  })

  const handleCancel = () => {
    showAlert('Annuler', 'Confirmer l\'annulation ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ])
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.bg }} />

  const canCancel = !['livree', 'annulee'].includes(order.statut)

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(client)/orders')}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{order.id}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.card}>
          {order.creation?.photoUrl && (
            <View style={styles.imageWrap}>
              <Image source={{ uri: order.creation.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(26,17,12,0.7)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.imageTitle} numberOfLines={2}>{order.creation.titre}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.atelier}>{order.artisan.atelier}</Text>
                <Text style={styles.metier}>{order.artisan.métier}</Text>
              </View>
              <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
            </View>
          </View>
        </Animated.View>

        {/* Delivery */}
        {order.dateLivraisonEstimee && !['livree', 'annulee'].includes(order.statut) && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.deliveryBanner}>
            <Clock size={16} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.deliveryText}>
              Livraison estimée <Text style={styles.deliveryDate}>{new Date(order.dateLivraisonEstimee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </Text>
          </Animated.View>
        )}

        {/* Timeline */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi</Text>
          <View style={styles.timelineCard}>
            <OrderTimeline statut={order.statut} dateLivraisonEstimee={order.dateLivraisonEstimee} />
          </View>
        </Animated.View>

        {/* Payment */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.payCard}>
            {order.prixTotal != null && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Total</Text>
                <Text style={styles.payValue}>{formatPrice(order.prixTotal)}</Text>
              </View>
            )}
            {order.acompte != null && (
              <>
                <View style={styles.divider} />
                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>Acompte versé</Text>
                  <Text style={styles.payValueSm}>{formatPrice(order.acompte)}</Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        {order.description && (
          <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{order.description}</Text>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.actions}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => router.push(`/(client)/messages/${orderId}`)}>
              <MessageCircle size={18} color={colors.primary} strokeWidth={1.5} />
              <Text style={styles.btnOutlineText}>Contacter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push({ pathname: '/(client)/payment', params: { orderId: String(orderId) } })}>
              <CreditCard size={18} color={colors.white} strokeWidth={1.5} />
              <Text style={styles.btnPrimaryText}>Paiement</Text>
            </TouchableOpacity>
          </View>

          {order.statut === 'livree' && (
            <TouchableOpacity style={styles.btnReview} onPress={() => router.push({ pathname: '/(client)/review', params: { artisanId: String(order.artisan.id ?? ''), artisanName: order.artisan.atelier, orderId: String(orderId) } })}>
              <Star size={16} color={colors.warning} strokeWidth={1.5} />
              <Text style={styles.btnReviewText}>Donner un avis</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
              <XCircle size={16} color={colors.error} strokeWidth={1.5} />
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnGhost} onPress={() => router.push({ pathname: '/(client)/claim', params: { orderId: String(orderId) } })}>
            <ShieldAlert size={14} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.btnGhostText}>Signaler un problème</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.orderDate}>Commandé le {formatDate(order.createdAt)}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.lg },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  imageWrap: { height: 160, justifyContent: 'flex-end', padding: spacing.md },
  imageTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.white },
  cardBody: { padding: spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  atelier: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  metier: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  deliveryBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.accent}15`, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.accent}30` },
  deliveryText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  deliveryDate: { fontWeight: '600', color: colors.accent },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },

  timelineCard: { backgroundColor: colors.bgMuted, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },

  payCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  payValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  payValueSm: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },

  description: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  actions: { gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  btnOutlineText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
  btnPrimaryText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white },
  btnReview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.warning },
  btnReviewText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.warning },
  btnCancel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.error, borderRadius: radius.md, padding: spacing.sm },
  btnCancelText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.error },
  btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm },
  btnGhostText: { fontSize: fontSize.xs, color: colors.textMuted },

  orderDate: { fontSize: fontSize.xs, color: colors.textLight, textAlign: 'center', marginTop: spacing.md },
})
