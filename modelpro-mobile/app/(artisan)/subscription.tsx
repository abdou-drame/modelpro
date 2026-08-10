import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking,
} from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useEffect, useRef, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, CheckCircle2, Hourglass, Crown, Calendar, AlertTriangle, Repeat } from 'lucide-react-native'
import { paymentsApi, packsApi } from '@/lib/api/payments'
import { artisanApi } from '@/lib/api/artisan'
import { formatDate, formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { PaymentMethod } from '@/constants/enums'
import { PaymentMethodLogo } from '@/components/shared/PaymentMethodLogo'

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'wave', label: 'Wave' },
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'free_money', label: 'Free Money' },
]

const CYCLES: { key: 'mensuel' | 'annuel'; label: string }[] = [
  { key: 'mensuel', label: 'Mensuel' },
  { key: 'annuel', label: 'Annuel' },
]

const STATUT_INFO: Record<string, { label: string; color: keyof typeof colors }> = {
  essai: { label: 'Essai gratuit', color: 'primary' },
  actif: { label: 'Abonnement actif', color: 'success' },
  expire: { label: 'Abonnement expiré', color: 'error' },
  inactif: { label: 'Pas encore abonné', color: 'textMuted' },
}

export default function ArtisanSubscriptionScreen() {
  const queryClient = useQueryClient()
  const { payment: paymentReturnParam } = useLocalSearchParams<{ payment?: string }>()
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<'mensuel' | 'annuel'>('mensuel')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wave')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const handledReturnRef = useRef<string | null>(null)

  const { data: subData } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => paymentsApi.mySubscription().then((r) => r.data),
    // Après un retour PayTech, on repolle en attendant que l'IPN (asynchrone) confirme le paiement.
    refetchInterval: awaitingConfirmation ? 3000 : false,
  })

  // Retour depuis la page de paiement PayTech (deep link modelpro://(artisan)/subscription?payment=success|cancel).
  useEffect(() => {
    if (!paymentReturnParam || handledReturnRef.current === paymentReturnParam) return
    handledReturnRef.current = paymentReturnParam

    if (paymentReturnParam === 'success') {
      setAwaitingConfirmation(true)
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      showAlert('Paiement en cours de confirmation', 'Nous attendons la confirmation de PayTech, ça ne prend que quelques secondes.')
      setTimeout(() => setAwaitingConfirmation(false), 30000)
    } else if (paymentReturnParam === 'cancel') {
      showAlert('Paiement annulé', "Vous n'avez pas terminé le paiement sur PayTech.")
    }
    router.setParams({ payment: undefined })
  }, [paymentReturnParam])

  const latestSubscriptionStatut = subData?.subscriptions?.[0]?.statut
  useEffect(() => {
    if (awaitingConfirmation && latestSubscriptionStatut === 'confirme') {
      setAwaitingConfirmation(false)
      queryClient.invalidateQueries({ queryKey: ['artisan-profile'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-stats'] })
      showAlert('Abonnement activé !', 'Votre paiement a été confirmé et votre abonnement ModèlePro est actif.')
    }
  }, [awaitingConfirmation, latestSubscriptionStatut])

  const { data: packs = [] } = useQuery({
    queryKey: ['packs'],
    queryFn: () => packsApi.list().then((r) => r.data),
  })

  useEffect(() => {
    if (selectedPackId === null && packs.length > 0) {
      setSelectedPackId(subData?.pack?.id ?? packs[0].id)
    }
  }, [packs, subData])

  const subscribeMutation = useMutation({
    mutationFn: () => {
      if (!selectedPackId) throw new Error('Aucun pack sélectionné.')
      return paymentsApi.create({
        packId: selectedPackId,
        cycle: selectedCycle,
        type: 'abonnement',
        moyen: selectedMethod,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })

      // Le paiement reste 'en_attente' tant que PayTech n'a pas confirmé via IPN.
      // On ouvre la page de paiement et on attend le retour deep-link.
      setAwaitingConfirmation(true)
      Linking.openURL(res.data.redirectUrl)
    },
    onError: (err: any) => {
      showAlert('Erreur', err.response?.data?.error ?? "Impossible d'activer l'abonnement.")
    },
  })

  const changePackMutation = useMutation({
    mutationFn: (packId: number) => artisanApi.changePack(packId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-profile'] })
      showAlert('Pack changé', "Votre pack a été mis à jour. La date d'expiration en cours n'est pas affectée.")
    },
    onError: (err: any) => {
      showAlert('Erreur', err.response?.data?.error ?? 'Impossible de changer de pack.')
    },
  })

  const selectedPack = packs.find((p) => p.id === selectedPackId) ?? null
  const currentPack = subData?.pack ?? null
  const statutAbonnement = subData?.statutAbonnement ?? 'inactif'
  const statutInfo = STATUT_INFO[statutAbonnement] ?? STATUT_INFO.inactif
  const isPackChange = currentPack && selectedPack && currentPack.id !== selectedPack.id

  const handleSubscribe = () => {
    if (!selectedPack) return
    const prix = selectedCycle === 'annuel' ? selectedPack.prixAnnuel : selectedPack.prixMensuel
    showAlert(
      `Souscrire — ${selectedPack.nom}`,
      `Confirmer le paiement de ${formatPrice(prix)} via ${METHODS.find((m) => m.key === selectedMethod)?.label} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => subscribeMutation.mutate() },
      ]
    )
  }

  const handleChangePackOnly = () => {
    if (!selectedPack) return
    showAlert(
      `Changer pour ${selectedPack.nom}`,
      "Le changement est immédiat mais n'affecte pas votre date d'expiration en cours. Le nouveau tarif s'appliquera à votre prochain paiement.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Changer', onPress: () => changePackMutation.mutate(selectedPack.id) },
      ]
    )
  }

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
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.statusCard}>
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[styles.statusBorder, { borderColor: `${colors[statutInfo.color] ?? colors.textMuted}40` }]} />
          {statutAbonnement === 'expire' ? (
            <AlertTriangle size={24} color={colors.error} strokeWidth={2} />
          ) : statutAbonnement === 'essai' ? (
            <Hourglass size={24} color={colors.primary} strokeWidth={2} />
          ) : (
            <CheckCircle2 size={24} color={statutAbonnement === 'actif' ? colors.success : colors.textMuted} strokeWidth={2} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {statutInfo.label}{currentPack ? ` — ${currentPack.nom}` : ''}
            </Text>
            <Text style={styles.statusSub}>
              {subData?.dateFinAbonnement
                ? `${statutAbonnement === 'expire' ? 'Expiré le' : "Jusqu'au"} ${formatDate(subData.dateFinAbonnement)}`
                : 'Choisissez un pack pour démarrer'}
            </Text>
          </View>
        </Animated.View>

        {/* Choix du pack */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Choisir un pack</Text>
          <View style={styles.planRow}>
            {packs.map((pack) => {
              const active = selectedPackId === pack.id
              const isCurrent = currentPack?.id === pack.id
              const prix = selectedCycle === 'annuel' ? pack.prixAnnuel : pack.prixMensuel
              return (
                <TouchableOpacity
                  key={pack.id}
                  style={[styles.planCard, active && styles.planCardActive, pack.code === 'pro' && styles.planCardHighlight]}
                  onPress={() => setSelectedPackId(pack.id)}
                >
                  {pack.code === 'pro' && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>Recommandé</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={[styles.planBadge, { left: 8, right: undefined, backgroundColor: colors.success }]}>
                      <Text style={styles.planBadgeText}>Actuel</Text>
                    </View>
                  )}
                  <Crown size={20} color={active ? colors.white : pack.code === 'pro' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  <Text style={[styles.planLabel, active && styles.planLabelActive]}>{pack.nom}</Text>
                  <Text style={[styles.planPrice, active && styles.planPriceActive]}>{formatPrice(prix)}</Text>
                  <Text style={[styles.planDesc, active && styles.planDescActive]}>
                    {pack.limiteModelesActifs === null ? 'Modèles illimités' : `${pack.limiteModelesActifs} modèles actifs`}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Cycle */}
          <View style={styles.cycleRow}>
            {CYCLES.map((c) => {
              const active = selectedCycle === c.key
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.cycleBtn, active && styles.cycleBtnActive]}
                  onPress={() => setSelectedCycle(c.key)}
                >
                  <Text style={[styles.cycleLabel, active && styles.cycleLabelActive]}>{c.label}</Text>
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
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodItem, active && styles.methodItemActive]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <PaymentMethodLogo method={m.key} size={36} />
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
                      {s.dateDebut ? formatDate(s.dateDebut) : '—'} — {s.dateFin ? formatDate(s.dateFin) : 'En cours'}
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

        <Animated.View entering={FadeInUp.delay(320).springify()} style={{ gap: spacing.sm }}>
          <TouchableOpacity
            style={styles.subscribeBtn}
            onPress={handleSubscribe}
            disabled={subscribeMutation.isPending || !selectedPack}
          >
            <Crown size={18} color={colors.white} strokeWidth={2} />
            <Text style={styles.subscribeBtnText}>
              {subscribeMutation.isPending ? 'Traitement...' : statutAbonnement === 'actif' ? 'Renouveler' : 'Payer et activer'}
            </Text>
          </TouchableOpacity>

          {isPackChange && (
            <TouchableOpacity
              style={styles.changePackBtn}
              onPress={handleChangePackOnly}
              disabled={changePackMutation.isPending}
            >
              <Repeat size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.changePackBtnText}>
                {changePackMutation.isPending ? 'Changement...' : `Changer pour ${selectedPack?.nom} sans payer maintenant`}
              </Text>
            </TouchableOpacity>
          )}
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
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xl, overflow: 'hidden', padding: spacing.lg, ...shadow.sm,
  },
  statusBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  statusTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  statusSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  planRow: { flexDirection: 'row', gap: spacing.sm },
  planCard: {
    flex: 1, borderRadius: radius.xl, padding: spacing.md, gap: 4,
    backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', overflow: 'hidden', ...shadow.sm,
  },
  planCardActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  planCardHighlight: { borderColor: colors.primary },
  planBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  planBadgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
  planLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  planLabelActive: { color: colors.white },
  planPrice: { fontSize: fontSize.base, fontWeight: '800', color: colors.primary, letterSpacing: -0.3 },
  planPriceActive: { color: 'rgba(255,255,255,0.9)' },
  planDesc: { fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14 },
  planDescActive: { color: 'rgba(255,255,255,0.6)' },
  cycleRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'center', backgroundColor: colors.bgMuted, borderRadius: radius.full, padding: 4 },
  cycleBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.full },
  cycleBtnActive: { backgroundColor: colors.primary },
  cycleLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  cycleLabelActive: { color: colors.white },
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
  changePackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.md,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  changePackBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
})
