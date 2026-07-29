import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, ShieldAlert, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react-native'
import { claimsApi, Claim } from '@/lib/api/claims'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  en_attente: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: Clock,
  },
  en_cours: {
    label: 'En cours de traitement',
    color: '#0284C7',
    bg: '#E0F2FE',
    icon: AlertCircle,
  },
  resolu: {
    label: 'Résolue',
    color: '#16A34A',
    bg: '#DCFCE7',
    icon: CheckCircle2,
  },
  rejete: {
    label: 'Rejetée',
    color: '#DC2626',
    bg: '#FEE2E2',
    icon: XCircle,
  },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function ClientClaimsScreen() {
  const { data: claimsResponse, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['client-claims'],
    queryFn: () => claimsApi.myClaims().then((r) => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  })

  const claims: Claim[] = Array.isArray(claimsResponse)
    ? claimsResponse
    : (claimsResponse as any)?.data ?? []

  return (
    <View style={styles.container}>
      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mes réclamations</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des réclamations...</Text>
          </View>
        ) : claims.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <ShieldAlert size={36} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Aucune réclamation</Text>
            <Text style={styles.emptyDesc}>
              Vous n'avez soumis aucune réclamation pour le moment.
            </Text>
          </View>
        ) : (
          claims.map((claim, index) => {
            const config = STATUS_CONFIG[claim.statut] ?? {
              label: claim.statut,
              color: colors.textMuted,
              bg: colors.bgMuted,
              icon: FileText,
            }
            const StatusIcon = config.icon

            return (
              <Animated.View
                key={claim.id}
                entering={FadeInUp.delay(index * 60).springify()}
                style={styles.claimCard}
              >
                {/* Header card */}
                <View style={styles.cardHeader}>
                  <View style={styles.idBlock}>
                    <Text style={styles.claimId}>Réclamation #{claim.id}</Text>
                    {claim.order?.id && (
                      <Text style={styles.orderRef}>Commande #{claim.order.id}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <StatusIcon size={12} color={config.color} strokeWidth={2.5} />
                    <Text style={[styles.statusText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                </View>

                {/* Subject & Description */}
                <View style={styles.cardBody}>
                  <Text style={styles.subjectText}>{claim.sujet}</Text>
                  <Text style={styles.descText}>{claim.description}</Text>
                </View>

                {/* Footer date */}
                <View style={styles.cardFooter}>
                  <Clock size={12} color={colors.textMuted} strokeWidth={1.8} />
                  <Text style={styles.dateText}>{formatDate(claim.createdAt)}</Text>
                </View>
              </Animated.View>
            )
          })
        )}
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

  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 100 },

  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: spacing.sm },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyDesc: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },

  claimCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  idBlock: { gap: 2 },
  claimId: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  orderRef: { fontSize: fontSize.xs, color: colors.textMuted },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },

  cardBody: { gap: 4 },
  subjectText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  descText: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dateText: { fontSize: fontSize.xs, color: colors.textMuted },
})
