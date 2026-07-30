import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useState } from 'react'
import { ArrowLeft, Check, Banknote, Smartphone, CreditCard } from 'lucide-react-native'
import { paymentsApi } from '@/lib/api/payments'
import { formatPrice, formatDateTime } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { PaymentType, PaymentMethod } from '@/constants/enums'
import { PaymentMethodLogo } from '@/components/shared/PaymentMethodLogo'

const METHODS: { key: PaymentMethod; label: string; sub: string }[] = [
  { key: 'wave', label: 'Wave', sub: 'Paiement mobile instantané Wave' },
  { key: 'orange_money', label: 'Orange Money', sub: 'Paiement mobile Orange Money' },
  { key: 'free_money', label: 'Free Money', sub: 'Paiement mobile Free Money' },
  { key: 'especes', label: 'Espèces', sub: 'Paiement en main propre' },
]

const TYPES: { key: PaymentType; label: string; desc: string }[] = [
  { key: 'acompte', label: 'Acompte', desc: 'Paiement partiel au démarrage (50%)' },
  { key: 'solde', label: 'Solde', desc: 'Paiement du reste à payer' },
  { key: 'integral', label: 'Intégral', desc: 'Paiement total en une fois' },
]

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const id = Number(orderId)
  const queryClient = useQueryClient()

  const [selectedType, setSelectedType] = useState<PaymentType>('acompte')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wave')

  const { data: summary } = useQuery({
    queryKey: ['payment-summary', id],
    queryFn: () => paymentsApi.summary(id).then((r) => r.data),
  })

  const { data: payments } = useQuery({
    queryKey: ['order-payments', id],
    queryFn: () => paymentsApi.orderPayments(id).then((r) => r.data),
  })

  const totalPrice = summary?.totalPrice ?? 0
  const acompteAmount = (summary?.depositAmount && summary.depositAmount > 0)
    ? summary.depositAmount
    : Math.round(totalPrice * 0.5)
  const remainingBalance = summary?.remainingBalance ?? 0
  const integralAmount = (summary?.totalAcomptePaid ?? 0) > 0 ? remainingBalance : totalPrice

  const getAmountForType = (type: PaymentType) => {
    if (type === 'acompte') return acompteAmount
    if (type === 'solde') return remainingBalance
    return integralAmount
  }

  const currentMontant = getAmountForType(selectedType)

  const createMutation = useMutation({
    mutationFn: () => {
      return paymentsApi.create({ orderId: id, montant: currentMontant, type: selectedType, moyen: selectedMethod })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-payments', id] })
      queryClient.invalidateQueries({ queryKey: ['payment-summary', id] })
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-orders'] })
      showAlert('Paiement enregistré', 'Votre paiement a bien été confirmé.')
    },
    onError: () => {
      showAlert('Erreur', 'Impossible d’enregistrer le paiement.')
    },
  })

  const handlePay = () => {
    const typeLabel = TYPES.find((t) => t.key === selectedType)?.label
    const methodLabel = METHODS.find((m) => m.key === selectedMethod)?.label
    showAlert(
      'Confirmer le paiement',
      `Type : ${typeLabel}\nMontant : ${formatPrice(currentMontant)}\nMoyen : ${methodLabel}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => createMutation.mutate() },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Résumé */}
        {summary && (
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.summaryCard}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.summaryBorder} />
            <Text style={styles.summaryTitle}>Résumé financier</Text>
            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total commande</Text>
                <Text style={styles.summaryVal}>{formatPrice(summary.totalPrice)}</Text>
              </View>
              {summary.totalAcomptePaid > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Acompte versé</Text>
                  <Text style={[styles.summaryVal, { color: colors.success }]}>
                    -{formatPrice(summary.totalAcomptePaid)}
                  </Text>
                </View>
              )}
              {summary.totalFraisServicePaid > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Frais de service</Text>
                  <Text style={styles.summaryVal}>{formatPrice(summary.totalFraisServicePaid)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Reste à payer</Text>
                <Text style={styles.summaryTotalVal}>{formatPrice(summary.remainingBalance)}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Type de paiement */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Type de paiement</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => {
              const active = selectedType === t.key
              const amount = getAmountForType(t.key)
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => setSelectedType(t.key)}
                >
                  {active && <View style={styles.typeCheck}><Check size={12} color={colors.white} strokeWidth={3} /></View>}
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: active ? colors.primary : colors.text }}>
                    {formatPrice(amount)}
                  </Text>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Méthode */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Moyen de paiement</Text>
          <View style={styles.methodList}>
            {METHODS.map((m) => {
              const active = selectedMethod === m.key
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodItem, active && styles.methodItemActive]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <PaymentMethodLogo method={m.key} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{m.label}</Text>
                    <Text style={styles.methodSub}>{m.sub}</Text>
                  </View>
                  {active && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Historique */}
        {payments && payments.length > 0 && (
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            <View style={styles.historyList}>
              {payments.map((p) => (
                <View key={p.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyType}>{p.type}</Text>
                    <Text style={styles.historyDate}>{formatDateTime(p.createdAt)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>{formatPrice(p.montant)}</Text>
                    <Text style={[
                      styles.historyStatus,
                      { color: p.statut === 'confirme' ? colors.success : colors.warning },
                    ]}>{p.statut}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(280).springify()}>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePay}
            disabled={createMutation.isPending}
          >
            <CreditCard size={18} color={colors.white} strokeWidth={2} />
            <Text style={styles.payBtnText}>
              {createMutation.isPending ? 'Traitement...' : `Payer ${formatPrice(currentMontant)}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
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
  summaryCard: {
    borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm,
  },
  summaryBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  summaryTitle: {
    fontSize: fontSize.base, fontWeight: '700', color: colors.text,
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  summaryRows: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSub },
  summaryVal: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  summaryTotal: {
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  summaryTotalLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  summaryTotalVal: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  typeGrid: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, gap: 4, borderWidth: 1.5, borderColor: colors.border,
    position: 'relative', overflow: 'hidden', ...shadow.sm,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  typeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  typeLabelActive: { color: colors.primary },
  typeDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  methodList: { gap: spacing.sm },
  methodItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.border, ...shadow.sm,
  },
  methodItemActive: { borderColor: colors.primary },
  methodIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: colors.primary },
  methodLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  methodLabelActive: { color: colors.primary },
  methodSub: { fontSize: fontSize.xs, color: colors.textMuted },
  historyList: { gap: spacing.sm },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm,
  },
  historyType: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  historyDate: { fontSize: fontSize.xs, color: colors.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  historyStatus: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg,
    ...shadow.md,
  },
  payBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
})
