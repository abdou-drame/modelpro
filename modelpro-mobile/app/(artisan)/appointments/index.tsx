import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useState } from 'react'
import {
  Calendar, MapPin, Check, X, RefreshCw, CalendarX,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { AppointmentStatus } from '@/constants/enums'
import type { ArtisanAppointment } from '@/lib/api/artisan'

const STATUS_VARIANT: Partial<Record<AppointmentStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'>> = {
  en_attente: 'warning',
  confirme: 'success',
  annule_artisan: 'error',
  annule_client: 'error',
  refuse: 'error',
  reporte: 'neutral',
  termine: 'success',
  no_show: 'neutral',
}

const STATUS_LABELS: Partial<Record<AppointmentStatus, string>> = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  annule_artisan: 'Annulé',
  annule_client: 'Annulé client',
  refuse: 'Refusé',
  reporte: 'Reporté',
  termine: 'Terminé',
  no_show: 'Absent',
}

const TYPE_LABELS: Record<string, string> = {
  prise_mesures: 'Prise de mesures',
  essayage: 'Essayage',
  livraison: 'Livraison',
  consultation: 'Consultation',
}

const FILTERS: { label: string; value: AppointmentStatus | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'Confirmés', value: 'confirme' },
  { label: 'Reportés', value: 'reporte' },
]

function AppointmentCard({ appt, onConfirm, onRefuse, onReschedule, index }: {
  appt: ArtisanAppointment
  onConfirm: () => void
  onRefuse: () => void
  onReschedule: () => void
  index: number
}) {
  const isPending = appt.statut === 'en_attente'

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={[styles.card, isPending && styles.cardPending]}>
        {isPending && (
          <>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.cardPendingBorder} />
          </>
        )}

        <View style={styles.cardHead}>
          <View style={styles.typeRow}>
            <View style={[styles.typeDot, { backgroundColor: isPending ? colors.warning : colors.primary }]} />
            <Text style={styles.typeLabel}>{TYPE_LABELS[appt.type] ?? appt.type}</Text>
          </View>
          <Badge label={STATUS_LABELS[appt.statut] ?? appt.statut} variant={STATUS_VARIANT[appt.statut] ?? 'neutral'} />
        </View>

        <Text style={styles.clientName}>
          {appt.client.user.prenom} {appt.client.user.nom}
        </Text>

        <View style={styles.detailsCol}>
          <View style={styles.detailItem}>
            <Calendar size={13} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.detailText}>{formatDateTime(appt.dateHeure)}</Text>
          </View>
          {appt.lieu && (
            <View style={styles.detailItem}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.detailText} numberOfLines={1}>{appt.lieu}</Text>
            </View>
          )}
        </View>

        {appt.notes && (
          <Text style={styles.notes} numberOfLines={2}>{appt.notes}</Text>
        )}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnConfirm} onPress={onConfirm}>
              <Check size={15} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.btnConfirmText}>Confirmer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnReschedule} onPress={onReschedule}>
              <RefreshCw size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.btnRescheduleText}>Reporter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnRefuse} onPress={onRefuse}>
              <X size={14} color={colors.error} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

export default function ArtisanAppointmentsScreen() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['artisan-appointments'],
    queryFn: () => artisanApi.appointments().then((r) => r.data),
    refetchInterval: 30000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: AppointmentStatus }) =>
      artisanApi.updateAppointmentStatus(id, statut),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-appointments'] }),
  })

  const handleConfirm = (appt: ArtisanAppointment) => {
    Alert.alert(
      'Confirmer le rendez-vous',
      `RDV avec ${appt.client.user.prenom} ${appt.client.user.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => statusMutation.mutate({ id: appt.id, statut: 'confirme' }) },
      ]
    )
  }

  const handleRefuse = (appt: ArtisanAppointment) => {
    Alert.alert('Annuler le rendez-vous', 'Cette action est irréversible.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler le RDV', style: 'destructive',
        onPress: () => statusMutation.mutate({ id: appt.id, statut: 'annule_artisan' }),
      },
    ])
  }

  const handleReschedule = (appt: ArtisanAppointment) => {
    statusMutation.mutate({ id: appt.id, statut: 'reporte' as AppointmentStatus })
  }

  const filtered = filter === 'all'
    ? (appointments ?? [])
    : (appointments ?? []).filter((a) => a.statut === filter)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rendez-vous</Text>
        <Text style={styles.count}>{filtered.length} RDV</Text>
      </View>

      <View style={styles.filtersBar}>
        <FlashList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item.value}
          estimatedItemSize={90}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = filter === item.value
            return (
              <TouchableOpacity
                onPress={() => setFilter(item.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={160}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <AppointmentCard
            appt={item}
            index={index}
            onConfirm={() => handleConfirm(item)}
            onRefuse={() => handleRefuse(item)}
            onReschedule={() => handleReschedule(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <CalendarX size={48} color={colors.border} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
              <Text style={styles.emptySub}>Les demandes de RDV de vos clients apparaîtront ici</Text>
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
  filtersBar: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, marginRight: spacing.xs, backgroundColor: colors.bgMuted,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, overflow: 'hidden', ...shadow.sm,
  },
  cardPending: { backgroundColor: 'rgba(255,255,255,0.4)' },
  cardPendingBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: `${colors.warning}40`,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  clientName: { fontSize: fontSize.base, fontWeight: '600', color: colors.textSub },
  detailsCol: { gap: spacing.xs },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  notes: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  btnConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.success,
    borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  btnConfirmText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  btnReschedule: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  btnRescheduleText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  btnRefuse: {
    width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.error,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
})
