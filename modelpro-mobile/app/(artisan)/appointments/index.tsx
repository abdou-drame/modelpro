import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useState } from 'react'
import {
  Calendar, MapPin, Clock, Check, X, RefreshCw, CalendarX, User,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { Badge } from '@/components/ui/Badge'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import { AppointmentStatus } from '@/constants/enums'
import type { ArtisanAppointment } from '@/lib/api/artisan'

const STATUS_VARIANT: Partial<Record<AppointmentStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'>> = {
  demande: 'warning',
  pending: 'warning',
  accepte: 'success',
  confirme: 'success',
  refuse: 'error',
  annule: 'error',
  reporte: 'neutral',
  termine: 'success',
}

const STATUS_LABELS: Partial<Record<AppointmentStatus, string>> = {
  demande: 'En attente',
  pending: 'En attente',
  accepte: 'Accepté',
  confirme: 'Confirmé',
  refuse: 'Refusé',
  annule: 'Annulé',
  reporte: 'Reporté',
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

const FILTERS: { label: string; value: AppointmentStatus | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'demande' },
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
  const isPending = appt.statut === 'demande' || appt.statut === 'pending'

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={[styles.card, isPending && styles.cardPending]}>
        {isPending && (
          <>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.cardPendingBorder} />
          </>
        )}

        {/* Date spotlight bar */}
        {appt.date ? (
          <View style={[styles.dateBar, isPending && styles.dateBarPending]}>
            <View style={styles.dateBlock}>
              <Text style={[styles.dateDay, isPending && styles.dateDayPending]}>
                {new Date(appt.date).getDate().toString().padStart(2, '0')}
              </Text>
              <Text style={styles.dateMonth}>
                {new Date(appt.date).toLocaleDateString('fr-SN', { month: 'short' }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.dateBarMeta}>
              <View style={styles.timeRow}>
                <Clock size={12} color={isPending ? colors.warning : colors.textMuted} strokeWidth={2} />
                <Text style={[styles.timeText, isPending && styles.timeTextPending]}>
                  {new Date(appt.date).toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {appt.lieu ? (
                <View style={styles.locationRow}>
                  <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.locationText} numberOfLines={1}>{appt.lieu}</Text>
                </View>
              ) : null}
            </View>
            <Badge label={STATUS_LABELS[appt.statut] ?? appt.statut} variant={STATUS_VARIANT[appt.statut] ?? 'neutral'} />
          </View>
        ) : (
          <View style={styles.noDateBar}>
            <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.noDateText}>Date à définir</Text>
            <Badge label={STATUS_LABELS[appt.statut] ?? appt.statut} variant={STATUS_VARIANT[appt.statut] ?? 'neutral'} />
          </View>
        )}

        <View style={styles.cardDivider} />

        {/* Card body */}
        <View style={styles.cardBody}>
          <View style={styles.typeRow}>
            <View style={[styles.typeDot, { backgroundColor: isPending ? colors.warning : colors.primary }]} />
            <Text style={styles.typeLabel}>{TYPE_LABELS[appt.type] ?? appt.type}</Text>
          </View>

          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <User size={14} color={colors.textSub} strokeWidth={2} />
            </View>
            <Text style={styles.clientName}>{appt.client.prenom} {appt.client.nom}</Text>
          </View>

          {appt.notes ? (
            <Text style={styles.notes} numberOfLines={2}>{appt.notes}</Text>
          ) : null}

          {isPending && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnConfirm}
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel="Confirmer ce rendez-vous"
              >
                <Check size={15} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.btnConfirmText}>Confirmer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnReschedule}
                onPress={onReschedule}
                accessibilityRole="button"
                accessibilityLabel="Reporter ce rendez-vous"
              >
                <RefreshCw size={14} color={colors.primary} strokeWidth={2} />
                <Text style={styles.btnRescheduleText}>Reporter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnRefuse}
                onPress={onRefuse}
                accessibilityRole="button"
                accessibilityLabel="Refuser ce rendez-vous"
              >
                <X size={14} color={colors.error} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
      `RDV avec ${appt.client.prenom} ${appt.client.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => statusMutation.mutate({ id: appt.id, statut: 'accepte' }) },
      ]
    )
  }

  const handleRefuse = (appt: ArtisanAppointment) => {
    Alert.alert('Annuler le rendez-vous', 'Cette action est irréversible.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler le RDV', style: 'destructive',
        onPress: () => statusMutation.mutate({ id: appt.id, statut: 'annule' }),
      },
    ])
  }

  const handleReschedule = (appt: ArtisanAppointment) => {
    statusMutation.mutate({ id: appt.id, statut: 'reporte' as AppointmentStatus })
  }

  const filtered = filter === 'all'
    ? (appointments ?? [])
    : (appointments ?? []).filter((a) => a.statut === filter)

  const pendingCount = (appointments ?? []).filter(
    (a) => a.statut === 'demande' || a.statut === 'pending'
  ).length

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rendez-vous</Text>
          {pendingCount > 0 ? (
            <Text style={styles.pendingCount}>{pendingCount} en attente de confirmation</Text>
          ) : (
            <Text style={styles.count}>{filtered.length} RDV</Text>
          )}
        </View>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filters */}
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
                accessibilityRole="button"
                accessibilityLabel={`Filtrer: ${item.label}`}
                accessibilityState={{ selected: active }}
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
        estimatedItemSize={220}
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
              <View style={styles.emptyIconWrap}>
                <CalendarX size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  pendingCount: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600', marginTop: 2 },
  pendingBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center',
  },
  pendingBadgeText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.white },

  filtersBar: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, marginRight: spacing.xs, backgroundColor: colors.bgMuted,
    minHeight: 36,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  chipTextActive: { color: colors.white, fontWeight: '700' },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    overflow: 'hidden', ...shadow.sm,
  },
  cardPending: { backgroundColor: 'rgba(255,255,255,0.5)' },
  cardPendingBorder: {
    ...StyleSheet.absoluteFill, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: `${colors.warning}50`,
  },

  dateBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.bgMuted,
  },
  dateBarPending: { backgroundColor: `${colors.warning}12` },
  dateBlock: {
    width: 44, alignItems: 'center', gap: 1,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: spacing.xs, ...shadow.sm,
  },
  dateDay: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, lineHeight: 24 },
  dateDayPending: { color: colors.warning },
  dateMonth: { fontSize: 9, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  dateBarMeta: { flex: 1, gap: 3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  timeTextPending: { color: colors.warning },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  noDateBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  noDateText: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },

  cardDivider: { height: 1, backgroundColor: colors.borderLight },

  cardBody: { padding: spacing.lg, gap: spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clientAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center',
  },
  clientName: { fontSize: fontSize.base, fontWeight: '600', color: colors.textSub },
  notes: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic', lineHeight: 20 },

  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  btnConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.success,
    borderRadius: radius.md, paddingVertical: spacing.sm, minHeight: 40,
  },
  btnConfirmText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  btnReschedule: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.sm, minHeight: 40,
  },
  btnRescheduleText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  btnRefuse: {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.error,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
})
