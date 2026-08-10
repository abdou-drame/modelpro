import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { router } from 'expo-router'
import { ArrowLeft, Wallet, ArrowDownToLine, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react-native'
import { walletApi, type WalletTransaction } from '@/lib/api/wallet'
import { artisanApi } from '@/lib/api/artisan'
import { PaymentMethodLogo } from '@/components/shared/PaymentMethodLogo'
import { formatDate, formatPrice } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const METHODS: { key: 'wave' | 'orange_money'; label: string }[] = [
  { key: 'wave', label: 'Wave' },
  { key: 'orange_money', label: 'Orange Money' },
]

const STATUT_INFO: Record<WalletTransaction['statut'], { label: string; color: keyof typeof colors; Icon: typeof Clock }> = {
  en_attente: { label: 'En attente', color: 'warning', Icon: Clock },
  valide: { label: 'Validé', color: 'success', Icon: CheckCircle2 },
  rejete: { label: 'Rejeté', color: 'error', Icon: XCircle },
}

export default function ArtisanWalletScreen() {
  const queryClient = useQueryClient()
  const [montant, setMontant] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money'>('wave')

  const { data: wallet } = useQuery({
    queryKey: ['artisan-wallet'],
    queryFn: () => walletApi.getMyWallet().then((r) => r.data),
  })

  const { data: profile } = useQuery({
    queryKey: ['artisan-profile'],
    queryFn: () => artisanApi.getProfile().then((r) => r.data),
  })

  const withdrawMutation = useMutation({
    mutationFn: () =>
      walletApi.requestWithdrawal({ montant: Number(montant), moyenPaiement: selectedMethod }),
    onSuccess: () => {
      setMontant('')
      queryClient.invalidateQueries({ queryKey: ['artisan-wallet'] })
      showAlert('Demande envoyée', "Votre demande de retrait a été enregistrée. Elle sera traitée par l'équipe ModèlePro sous peu.")
    },
    onError: (err: any) => {
      showAlert('Erreur', err.response?.data?.error ?? 'Impossible de créer la demande de retrait.')
    },
  })

  const solde = wallet?.solde ?? 0
  const transactions = wallet?.transactions ?? []
  const numeroActuel = selectedMethod === 'wave' ? profile?.waveNumber : profile?.orangeMoneyNumber
  const montantNumber = Number(montant)
  const canWithdraw = montantNumber > 0 && montantNumber <= solde && !!numeroActuel

  const handleWithdraw = () => {
    if (!numeroActuel) {
      showAlert(
        'Numéro manquant',
        `Ajoutez d'abord votre numéro ${selectedMethod === 'wave' ? 'Wave' : 'Orange Money'} dans votre profil pour recevoir le retrait.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Aller au profil', onPress: () => router.push('/(artisan)/profile') },
        ]
      )
      return
    }
    showAlert(
      'Confirmer le retrait',
      `Demander le retrait de ${formatPrice(montantNumber)} vers votre compte ${selectedMethod === 'wave' ? 'Wave' : 'Orange Money'} (${numeroActuel}) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => withdrawMutation.mutate() },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Portefeuille</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Solde */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.balanceCard}>
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
          <Wallet size={24} color={colors.accent} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceValue}>{formatPrice(solde)}</Text>
          </View>
        </Animated.View>

        {/* Demande de retrait */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Demander un retrait</Text>

          <View style={styles.methodList}>
            {METHODS.map((m) => {
              const active = selectedMethod === m.key
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodItem, active && styles.methodItemActive]}
                  onPress={() => setSelectedMethod(m.key)}
                >
                  <PaymentMethodLogo method={m.key} size={28} />
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {numeroActuel ? (
            <Text style={styles.numeroHint}>Réception sur : {numeroActuel}</Text>
          ) : (
            <Text style={styles.numeroHintWarning}>
              Aucun numéro {selectedMethod === 'wave' ? 'Wave' : 'Orange Money'} enregistré — ajoutez-le dans votre profil.
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Montant (FCFA)"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            value={montant}
            onChangeText={setMontant}
          />

          <TouchableOpacity
            style={[styles.withdrawBtn, (!canWithdraw || withdrawMutation.isPending) && styles.withdrawBtnDisabled]}
            onPress={handleWithdraw}
            disabled={!canWithdraw || withdrawMutation.isPending}
          >
            <ArrowDownToLine size={18} color={colors.white} strokeWidth={2} />
            <Text style={styles.withdrawBtnText}>
              {withdrawMutation.isPending ? 'Envoi...' : 'Demander le retrait'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Historique */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Aucun mouvement pour le moment.</Text>
          ) : (
            <View style={styles.historyList}>
              {transactions.map((t) => {
                const isCredit = t.type === 'credit'
                const info = STATUT_INFO[t.statut]
                const Icon = info.Icon
                return (
                  <View key={t.id} style={styles.historyItem}>
                    <View style={[styles.historyIcon, { backgroundColor: `${colors[isCredit ? 'success' : 'primary']}15` }]}>
                      {isCredit ? (
                        <ArrowUpRight size={16} color={colors.success} strokeWidth={2} />
                      ) : (
                        <ArrowDownToLine size={16} color={colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyLabel}>
                        {isCredit ? 'Paiement de commande' : `Retrait — ${t.moyenPaiement === 'wave' ? 'Wave' : 'Orange Money'}`}
                      </Text>
                      <Text style={styles.historyDate}>{formatDate(t.createdAt)}</Text>
                      {t.type === 'retrait' && t.statut === 'rejete' && t.commentaireAdmin && (
                        <Text style={styles.historyComment}>{t.commentaireAdmin}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.historyAmount, { color: isCredit ? colors.success : colors.text }]}>
                        {isCredit ? '+' : '-'}{formatPrice(t.montant)}
                      </Text>
                      <View style={styles.statusRow}>
                        <Icon size={12} color={colors[info.color]} strokeWidth={2} />
                        <Text style={[styles.historyStatus, { color: colors[info.color] }]}>{info.label}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
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

  balanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xl, overflow: 'hidden', padding: spacing.lg,
    backgroundColor: colors.primary, ...shadow.sm,
  },
  balanceLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.75)' },
  balanceValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.white, marginTop: 2 },

  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },

  methodList: { flexDirection: 'row', gap: spacing.sm },
  methodItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgMuted,
    borderWidth: 1.5, borderColor: colors.border,
  },
  methodItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  methodLabelActive: { color: colors.white },

  numeroHint: { fontSize: fontSize.xs, color: colors.textMuted },
  numeroHintWarning: { fontSize: fontSize.xs, color: colors.warning },

  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text, backgroundColor: colors.bgCard,
  },

  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, ...shadow.md,
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  historyList: { gap: spacing.sm },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm,
  },
  historyIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  historyLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  historyDate: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
  historyComment: { fontSize: fontSize.xs, color: colors.error, marginTop: 2, fontStyle: 'italic' },
  historyAmount: { fontSize: fontSize.sm, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStatus: { fontSize: fontSize.xs, fontWeight: '600' },
})
