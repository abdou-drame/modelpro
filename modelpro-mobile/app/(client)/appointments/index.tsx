import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, Image,
} from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useState } from 'react'
import { Calendar, MapPin, Clock, CalendarX, X, FileText, User, ArrowLeft } from 'lucide-react-native'
import { appointmentsApi, type Appointment } from '@/lib/api/appointments'
import { Badge } from '@/components/ui/Badge'
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


function AppointmentCard({ appt, onPress, onCancel, index }: {
  appt: Appointment; onPress: () => void; onCancel: () => void; index: number
}) {
  const canCancel = ['demande', 'accepte', 'confirme', 'pending'].includes(appt.statut)
  const isPending = appt.statut === 'demande' || appt.statut === 'pending'

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={[styles.card, isPending && styles.cardPending]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Rendez-vous chez ${appt.artisan.atelier}, toucher pour voir les détails`}
        >
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
          </View>
        </TouchableOpacity>

        {canCancel && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Annuler ce rendez-vous"
            >
              <Text style={styles.cancelBtnText}>Annuler ce rendez-vous</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

export default function ClientAppointmentsScreen() {
  const queryClient = useQueryClient()
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentsApi.myAppointments().then((r: any) => r.data),
    refetchInterval: 10000,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => appointmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      setSelectedAppt(null)
      showAlert('Rendez-vous annulé', 'Votre rendez-vous a été annulé avec succès.')
    },
    onError: (e: any) => {
      showAlert('Erreur', e.response?.data?.error ?? "Impossible d'annuler le rendez-vous.")
    },
  })

  const handleCancel = (appt: Appointment) => {
    showAlert(
      'Annuler le rendez-vous',
      `Voulez-vous annuler le RDV chez ${appt.artisan.atelier} ?`,
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
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.replace('/(client)')}
          accessibilityRole="button"
          accessibilityLabel="Retour au catalogue"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          <Text style={styles.backText}>Catalogue</Text>
        </TouchableOpacity>
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
            onPress={() => setSelectedAppt(item)}
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

      {/* ── Modal Détails du RDV Client ── */}
      <Modal
        visible={!!selectedAppt}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedAppt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppt && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails du rendez-vous</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedAppt(null)}
                    style={styles.modalCloseBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Fermer"
                  >
                    <X size={20} color={colors.text} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Artisan Atelier card */}
                  <View style={styles.modalArtisanCard}>
                    <View style={styles.modalArtisanAvatar}>
                      {selectedAppt.artisan.photoProfil ? (
                        <Image source={{ uri: selectedAppt.artisan.photoProfil }} style={styles.modalAvatarImg} />
                      ) : (
                        <User size={22} color={colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalAtelierName}>{selectedAppt.artisan.atelier}</Text>
                      <Text style={styles.modalArtisanName}>
                        {selectedAppt.artisan.user.prenom} {selectedAppt.artisan.user.nom}
                      </Text>
                    </View>
                  </View>

                  {/* Status & Type */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalRowBetween}>
                      <Text style={styles.modalLabel}>Statut actuel</Text>
                      <Badge
                        label={STATUS_LABELS[selectedAppt.statut] ?? selectedAppt.statut}
                        variant={STATUS_VARIANT[selectedAppt.statut] ?? 'neutral'}
                      />
                    </View>
                    <View style={styles.modalRowBetween}>
                      <Text style={styles.modalLabel}>Type de rendez-vous</Text>
                      <Text style={styles.modalValueBold}>{TYPE_LABELS[selectedAppt.type] ?? selectedAppt.type}</Text>
                    </View>
                  </View>

                  {/* Date & Time */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalInfoRow}>
                      <Calendar size={18} color={colors.primary} strokeWidth={2} />
                      <View>
                        <Text style={styles.modalInfoTitle}>Date et Heure</Text>
                        <Text style={styles.modalInfoText}>
                          {selectedAppt.dateHeure
                            ? new Date(selectedAppt.dateHeure).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }) + ` à ${new Date(selectedAppt.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                            : 'À définir'}
                        </Text>
                      </View>
                    </View>

                    {/* Lieu */}
                    {selectedAppt.lieu ? (
                      <View style={styles.modalInfoRow}>
                        <MapPin size={18} color={colors.primary} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalInfoTitle}>Lieu du rendez-vous</Text>
                          <Text style={styles.modalInfoText}>{selectedAppt.lieu}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {/* Notes */}
                  {selectedAppt.notes ? (
                    <View style={styles.modalSection}>
                      <View style={styles.modalInfoRow}>
                        <FileText size={18} color={colors.primary} strokeWidth={2} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalInfoTitle}>Vos notes</Text>
                          <Text style={styles.modalNotesText}>{selectedAppt.notes}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Modal footer */}
                <View style={styles.modalFooter}>
                  {['demande', 'accepte', 'confirme', 'pending'].includes(selectedAppt.statut) && (
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => handleCancel(selectedAppt)}
                    >
                      <Text style={styles.modalCancelBtnText}>Annuler ce rendez-vous</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseFooterBtn}
                    onPress={() => setSelectedAppt(null)}
                  >
                    <Text style={styles.modalCloseFooterBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.xs,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  backText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
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

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xxl ?? 24, borderTopRightRadius: radius.xxl ?? 24,
    maxHeight: '85%', paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalCloseBtn: { padding: spacing.xs },
  modalScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  modalArtisanCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgMuted, padding: spacing.md,
    borderRadius: radius.lg, marginBottom: spacing.lg,
  },
  modalArtisanAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  modalAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  modalAtelierName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  modalArtisanName: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  modalSection: {
    backgroundColor: colors.bgMuted, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.md, marginBottom: spacing.md,
  },
  modalRowBetween: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  modalValueBold: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  modalInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  modalInfoTitle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  modalInfoText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  modalNotesText: { fontSize: fontSize.sm, color: colors.text, fontStyle: 'italic', lineHeight: 20 },
  modalFooter: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.md,
  },
  modalCancelBtn: {
    backgroundColor: `${colors.error}15`, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  modalCancelBtnText: { color: colors.error, fontWeight: '700', fontSize: fontSize.md },
  modalCloseFooterBtn: {
    backgroundColor: colors.bgMuted, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  modalCloseFooterBtnText: { color: colors.text, fontWeight: '600', fontSize: fontSize.md },
})
