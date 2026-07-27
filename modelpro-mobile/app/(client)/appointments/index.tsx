import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Calendar, MapPin, Clock, Plus, CalendarX } from 'lucide-react-native'
import { appointmentsApi } from '@/lib/api/appointments'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const STATUS_VARIANT: Record<string, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'warning',
  confirme: 'success',
  reporte: 'neutral',
  annule_artisan: 'error',
  annule_client: 'error',
  refuse: 'error',
  termine: 'primary',
  no_show: 'neutral',
}

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  reporte: 'Reporté',
  annule_artisan: 'Annulé',
  annule_client: 'Annulé',
  refuse: 'Refusé',
  termine: 'Terminé',
  no_show: 'Absent',
}

const TYPE_LABELS: Record<string, string> = {
  prise_mesures: 'Prise de mesures',
  mesures: 'Prise de mesures',
  essayage: 'Essayage',
  livraison: 'Livraison',
  consultation: 'Consultation',
  retouche: 'Retouche',
  depot_tissu: 'Dépôt tissu',
  autre: 'Autre',
}

interface Appointment {
  id: number
  type: string
  statut: string
  dateHeure: string
  lieu: string | null
  notes: string | null
  artisan: {
    nomAtelier: string
    user: { nom: string; prenom: string }
  }
}

function AppointmentCard({ appt, onCancel, index }: {
  appt: Appointment; onCancel: () => void; index: number
}) {
  const canCancel = ['en_attente', 'confirme'].includes(appt.statut)

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View>
            <Text style={styles.typeLabel}>{TYPE_LABELS[appt.type] ?? appt.type}</Text>
            <Text style={styles.atelierName}>{appt.artisan.atelier}</Text>
          </View>
          <Badge
            label={STATUS_LABELS[appt.statut] ?? appt.statut}
            variant={STATUS_VARIANT[appt.statut] ?? 'neutral'}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Calendar size={13} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.detailText}>{formatDateTime(appt.dateHeure)}</Text>
          </View>
          {appt.lieu && (
            <View style={styles.detailRow}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.detailText} numberOfLines={1}>{appt.lieu}</Text>
            </View>
          )}
          {appt.notes && (
            <Text style={styles.notes} numberOfLines={2}>{appt.notes}</Text>
          )}
        </View>

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Annuler ce rendez-vous</Text>
          </TouchableOpacity>
        )}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes rendez-vous</Text>
        <Text style={styles.count}>{appointments?.length ?? 0} RDV</Text>
      </View>

      <FlashList
        data={appointments ?? []}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={160}
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
              <CalendarX size={48} color={colors.border} strokeWidth={1.5} />
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
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  atelierName: { fontSize: fontSize.sm, color: colors.textSub, marginTop: 2 },
  details: { gap: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  notes: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic', lineHeight: 20 },
  cancelBtn: {
    alignItems: 'center', paddingVertical: spacing.sm,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: radius.md,
  },
  cancelBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.error },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
})
