import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Calendar, MapPin, Clock, CalendarX, ChevronRight } from 'lucide-react-native'
import { appointmentsApi } from '@/lib/api/appointments'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const STATUS_VARIANT: Record<string, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  demande: 'warning',
  pending: 'warning',
  accepte: 'success',
  confirme: 'success',
  reporte: 'neutral',
  annule: 'error',
  refuse: 'error',
  termine: 'primary',
}

const STATUS_LABELS: Record<string, string> = {
  demande: 'En attente',
  pending: 'En attente',
  accepte: 'Accepté',
  confirme: 'Confirmé',
  reporte: 'Reporté',
  annule: 'Annulé',
  refuse: 'Refusé',
  termine: 'Terminé',
}

const TYPE_LABELS: Record<string, string> = {
  prise_mesures: 'Prise de mesures',
  consultation: 'Consultation',
  depot_article: 'Dépôt article',
  essayage: 'Essayage',
  retrait: 'Retrait',
  domicile: 'À domicile',
}

interface Appointment {
  id: number
  type: string
  statut: string
  date: string | null
  lieu: string | null
  notes: string | null
  artisan: {
    atelier: string
    user: { nom: string; prenom: string }
  }
}

function AppointmentCard({ appt, onCancel, index }: {
  appt: Appointment; onCancel: () => void; index: number
}) {
  const canCancel = ['demande', 'accepte', 'confirme', 'pending'].includes(appt.statut)
  const isPending = appt.statut === 'demande' || appt.statut === 'pending'

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={[styles.card, isPending && styles.cardPending]}>
        {/* Date spotlight */}
        {appt.dateHeure ? (
          <View style={styles.dateSpotlight}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateDay}>
                {new Date(appt.dateHeure).getDate().toString().padStart(2, '0')}
              </Text>
              <Text style={styles.dateMonth}>
                {new Date(appt.dateHeure).toLocaleDateString('fr-SN', { month: 'short' }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.dateMeta}>
              <View style={styles.timeRow}>
                <Clock size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.timeText}>
                  {new Date(appt.dateHeure).toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {appt.lieu ? (
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.locationText} numberOfLines={1}>{appt.lieu}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.noDateRow}>
            <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.noDateText}>Date à confirmer</Text>
          </View>
        )}

        <View style={styles.cardDivider} />

        {/* Card body */}
        <View style={styles.cardBody}>
          <View style={styles.cardHead}>
            <View style={styles.cardHeadText}>
              <Text style={styles.typeLabel}>{TYPE_LABELS[appt.type] ?? appt.type}</Text>
              <Text style={styles.atelierName}>{appt.artisan.atelier}</Text>
            </View>
            <Badge
              label={STATUS_LABELS[appt.statut] ?? appt.statut}
              variant={STATUS_VARIANT[appt.statut] ?? 'neutral'}
            />
          </View>

          {appt.notes ? (
            <Text style={styles.notes} numberOfLines={2}>{appt.notes}</Text>
          ) : null}

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Annuler ce rendez-vous"
            >
              <Text style={styles.cancelBtnText}>Annuler ce rendez-vous</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

export default function ClientAppointmentsScreen() {
  const queryClient = useQueryClient()

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentsApi.myAppointments().then((r) => r.data as Appointment[]),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => appointmentsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-appointments'] }),
  })

  const handleCancel = (appt: Appointment) => {
    Alert.alert(
      'Annuler le rendez-vous',
      `Annuler le RDV chez ${appt.artisan.atelier} ?`,
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, annuler', style: 'destructive', onPress: () => cancelMutation.mutate(appt.id) },
      ]
    )
  }

  const upcomingCount = (appointments ?? []).filter(
    (a) => ['demande', 'accepte', 'confirme', 'pending'].includes(a.statut)
  ).length

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rendez-vous</Text>
          {upcomingCount > 0 ? (
            <Text style={styles.count}>{upcomingCount} à venir</Text>
          ) : (
            <Text style={styles.count}>{appointments?.length ?? 0} au total</Text>
          )}
        </View>
      </View>

      <FlashList
        data={appointments ?? []}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={200}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <AppointmentCard
            appt={item}
            index={index}
            onCancel={() => handleCancel(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <CalendarX size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
              <Text style={styles.emptySub}>
                Prenez rendez-vous depuis la fiche d'un artisan
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    overflow: 'hidden', ...shadow.sm,
  },
  cardPending: {
    borderWidth: 1.5, borderColor: `${colors.warning}40`,
  },

  dateSpotlight: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  dateBlock: {
    width: 48, alignItems: 'center', gap: 1,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: spacing.xs, ...shadow.sm,
  },
  dateDay: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, lineHeight: 26 },
  dateMonth: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  dateMeta: { flex: 1, gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  noDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  noDateText: { fontSize: fontSize.sm, color: colors.textMuted },

  cardDivider: { height: 1, backgroundColor: colors.borderLight },

  cardBody: { padding: spacing.lg, gap: spacing.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardHeadText: { flex: 1, gap: 2 },
  typeLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  atelierName: { fontSize: fontSize.sm, color: colors.textSub },
  notes: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic', lineHeight: 20 },

  cancelBtn: {
    alignItems: 'center', paddingVertical: spacing.sm,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.md,
    minHeight: 40,
  },
  cancelBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.bgMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
})
