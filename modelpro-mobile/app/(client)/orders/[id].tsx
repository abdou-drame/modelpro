import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, MessageCircle, XCircle, CreditCard, Star, ShieldAlert } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { OrderTimeline } from '@/components/shared/OrderTimeline'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/utils/format'
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
  })
  const order = orders?.find((o) => o.id === orderId)

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      router.back()
    },
  })

  const handleCancel = () => {
    Alert.alert(
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
        {/* Artisan info */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.artisanCard}>
          <View style={styles.artisanRow}>
            <View style={styles.artisanInfo}>
              <Text style={styles.artisanName}>{order.artisan.nomAtelier}</Text>
              <Text style={styles.metier}>{order.artisan.metier.nom}</Text>
            </View>
            <Badge
              label={ORDER_STATUS_LABELS[order.statut]}
              variant={STATUS_VARIANT[order.statut]}
              size="md"
            />
          </View>
          {order.creation && (
            <View style={styles.modelRow}>
              {order.creation.photoUrl && (
                <Image source={{ uri: order.creation.photoUrl }} style={styles.modelThumb} />
              )}
              <Text style={styles.modelTitle}>{order.creation.titre}</Text>
            </View>
          )}
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Avancement</Text>
          <OrderTimeline
            statut={order.statut}
            dateLivraisonEstimee={order.dateLivraisonEstimee}
          />
        </Animated.View>

        {/* Paiement */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Statut</Text>
              <Badge label={PAYMENT_STATUS_LABELS[order.statutPaiement]} variant="neutral" />
            </View>
            {order.prixTotal != null && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Total</Text>
                <Text style={styles.paymentValue}>{formatPrice(order.prixTotal)}</Text>
              </View>
            )}
            {order.acompte != null && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Acompte</Text>
                <Text style={styles.paymentValue}>{formatPrice(order.acompte)}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Description */}
        {order.description && (
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{order.description}</Text>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actions}>
          <TouchableOpacity
            style={styles.btnMessage}
            onPress={() => router.push(`/(client)/messages/${orderId}`)}
          >
            <MessageCircle size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.btnMessageText}>Contacter l'artisan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPay}
            onPress={() => router.push({ pathname: '/(client)/payment', params: { orderId: String(orderId) } })}
          >
            <CreditCard size={18} color={colors.white} strokeWidth={2} />
            <Text style={styles.btnPayText}>Paiement</Text>
          </TouchableOpacity>

          {order.statut === 'livree' && (
            <TouchableOpacity
              style={styles.btnReview}
              onPress={() => router.push({
                pathname: '/(client)/review',
                params: {
                  artisanId: String(order.artisan.id ?? ''),
                  artisanName: order.artisan.nomAtelier,
                  orderId: String(orderId),
                },
              })}
            >
              <Star size={16} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.btnReviewText}>Donner un avis</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={styles.btnCancel} onPress={handleCancel}>
              <XCircle size={16} color={colors.error} strokeWidth={2} />
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnClaim}
            onPress={() => router.push({ pathname: '/(client)/claim', params: { orderId: String(orderId) } })}
          >
            <ShieldAlert size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.btnClaimText}>Signaler un problème</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.date}>Commande passée le {formatDate(order.createdAt)}</Text>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 },
  artisanCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  artisanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  artisanInfo: { gap: 2 },
  artisanName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  metier: { fontSize: fontSize.xs, color: colors.textMuted },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modelThumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bgMuted },
  modelTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  paymentCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentLabel: { fontSize: fontSize.sm, color: colors.textSub, fontWeight: '500' },
  paymentValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  description: { fontSize: fontSize.md, color: colors.textSub, lineHeight: 24 },
  actions: { gap: spacing.sm },
  btnMessage: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
  },
  btnMessageText: { fontSize: fontSize.base, fontWeight: '600', color: colors.primary },
  btnPay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
  },
  btnPayText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  btnReview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1.5, borderColor: '#F59E0B',
  },
  btnReviewText: { fontSize: fontSize.sm, fontWeight: '600', color: '#F59E0B' },
  btnCancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.lg, padding: spacing.md,
  },
  btnCancelText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },
  btnClaim: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    padding: spacing.sm,
  },
  btnClaimText: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textMuted },
  date: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
})
