import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useState } from 'react'
import { router } from 'expo-router'
import { ArrowLeft, CheckCircle2, Zap, Crown, Calendar, Smartphone, Banknote } from 'lucide-react-native'
import { paymentsApi } from '@/lib/api/payments'
import { formatDate, formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { PaymentMethod } from '@/constants/enums'

const PLANS = [
  {
    key: 'monthly',
    label: 'Mensuel',
    price: 5000,
    desc: 'Accès complet pendant 30 jours',
    icon: Zap,
    highlight: false,
  },
  {
    key: 'yearly',
    label: 'Annuel',
    price: 45000,
    desc: 'Économisez 2 mois — meilleur tarif',
    icon: Crown,
    highlight: true,
  },
]

const METHODS: { key: PaymentMethod; label: string; icon: any }[] = [
  { key: 'wave', label: 'Wave', icon: Smartphone },
  { key: 'orange_money', label: 'Orange Money', icon: Smartphone },
  { key: 'free_money', label: 'Free Money', icon: Smartphone },
  { key: 'especes', label: 'Espèces', icon: Banknote },
]

export default function ArtisanSubscriptionScreen() {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wave')

  const { data: subData } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => paymentsApi.mySubscription().then((r) => r.data),
  })

  const subscribeMutation = useMutation({
    mutationFn: () => {
      const plan = PLANS.find((p) => p.key === selectedPlan)!
      return paymentsApi.create({
        montant: plan.price,
        type: 'abonnement',
        moyen: selectedMethod,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      Alert.alert('Abonnement activé', 'Votre abonnement ModèlePro a bien été enregistré.')
    },
  })

  const handleSubscribe = () => {
    const plan = PLANS.find((p) => p.key === selectedPlan)!
    Alert.alert(
      `Souscrire — ${plan.label}`,
      `${formatPrice(plan.price)} via ${METHODS.find((m) => m.key === selectedMethod)?.label}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => subscribeMutation.mutate() },
      ]
    )
  }

  const isActive = subData?.actif

  const PERKS = [
    'Profil visible dans les recherches',
    'Réception illimitée de commandes',
    'Messagerie avec les clients',
    'Notifications push en temps réel',
    'Statistiques de performance',
    'Badge artisan vérifié',
  ]

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Abonnement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Statut actuel */}
        {isActive && subData?.subscriptions?.length > 0 && (
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.activeCard}>
            <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.activeBorder} />
            <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
            <View>
              <Text style={styles.activeTitle}>Abonnement actif</Text>
              <Text style={styles.activeSub}>
                Expire le {formatDate(subData.subscriptions[0].dateFin ?? '')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Avantages */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.perksCard}>
          <Text style={styles.perksTitle}>Ce que comprend votre abonnement</Text>
          <View style={styles.perksList}>
            {PERKS.map((p) => (
              <View key={p} style={styles.perkItem}>
                <CheckCircle2 size={16} color={colors.success} strokeWidth={2} />
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Plans */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Choisir un plan</Text>
          <View style={styles.planRow}>
            {PLANS.map((plan) => {
              const active = selectedPlan === plan.key
              const Icon = plan.icon
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[styles.planCard, active && styles.planCardActive, plan.highlight && styles.planCardHighlight]}
                  onPress={() => setSelectedPlan(plan.key as any)}
                >
                  {plan.highlight && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>Recommandé</Text>
                    </View>
                  )}
                  <Icon size={22} color={active ? colors.white : plan.highlight ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.planLabel, active && styles.planLabelActive, plan.highlight && !active && styles.planLabelHighlight]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                    {formatPrice(plan.price)}
                  </Text>
                  <Text style={[styles.planDesc, active && styles.planDescActive]}>{plan.desc}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Méthode */}
        <Animated.View entering={FadeInUp.delay(220).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Moyen de paiement</Text>
          <View style={styles.methodList}>
            {METHODS.map((m) => {
              const active = selectedMethod === m.key
              const Icon = m.icon
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodItem, active && styles.methodItemActive]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <Icon size={18} color={active ? colors.white : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Historique */}
        {subData?.subscriptions && subData.subscriptions.length > 0 && (
          <Animated.View entering={FadeInUp.delay(280).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            <View style={styles.historyList}>
              {subData.subscriptions.map((s) => (
                <View key={s.id} style={styles.historyItem}>
                  <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>
                      {formatDate(s.dateDebut)} — {s.dateFin ? formatDate(s.dateFin) : 'En cours'}
                    </Text>
                    <Text style={styles.historyAmount}>{formatPrice(s.montant)}</Text>
                  </View>
                  <Text style={[
                    styles.historyStatus,
                    { color: s.statut === 'confirme' ? colors.success : colors.warning },
                  ]}>{s.statut}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(320).springify()}>
          <TouchableOpacity
            style={styles.subscribeBtn}
            onPress={handleSubscribe}
            disabled={subscribeMutation.isPending}
          >
            <Crown size={18} color={colors.white} strokeWidth={2} />
            <Text style={styles.subscribeBtnText}>
              {subscribeMutation.isPending ? 'Traitement...' : isActive ? 'Renouveler' : 'Activer mon abonnement'}
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
  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xl, overflow: 'hidden', padding: spacing.lg, ...shadow.sm,
  },
  activeBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: `${colors.success}40`,
  },
  activeTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  activeSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  perksCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  perksTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  perksList: { gap: spacing.sm },
  perkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perkText: { fontSize: fontSize.sm, color: colors.textSub, flex: 1 },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  planRow: { flexDirection: 'row', gap: spacing.md },
  planCard: {
    flex: 1, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm,
    backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', overflow: 'hidden', ...shadow.sm,
  },
  planCardActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  planCardHighlight: { borderColor: colors.primary },
  planBadge: {
    position: 'absolute', top: 8,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  planBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  planLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  planLabelActive: { color: colors.white },
  planLabelHighlight: { color: colors.primary },
  planPrice: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  planPriceActive: { color: 'rgba(255,255,255,0.9)' },
  planDesc: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
  planDescActive: { color: 'rgba(255,255,255,0.6)' },
  methodList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  methodItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgMuted,
    borderWidth: 1.5, borderColor: colors.border,
  },
  methodItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  methodLabelActive: { color: colors.white },
  historyList: { gap: spacing.sm },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm,
  },
  historyDate: { fontSize: fontSize.sm, color: colors.text },
  historyAmount: { fontSize: fontSize.xs, color: colors.textMuted },
  historyStatus: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, ...shadow.md,
  },
  subscribeBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
})
