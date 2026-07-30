import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native'
import { showAlert } from '@/lib/utils/alert'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, Calendar, Clock, MapPin, FileText, Search, Check, X } from 'lucide-react-native'
import { appointmentsApi } from '@/lib/api/appointments'
import { artisansApi } from '@/lib/api/artisans'
import type { ArtisanPublic } from '@/lib/api/artisans'
import { APPOINTMENT_TYPES } from '@/constants/enums'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { AppointmentType } from '@/constants/enums'

const TYPE_LABELS: Record<AppointmentType, string> = {
  prise_mesures: 'Prise de mesures',
  consultation: 'Consultation',
  depot_article: 'Dépôt article',
  essayage: 'Essayage',
  retrait: 'Retrait',
  domicile: 'À domicile',
}

const schema = z.object({
  type: z.enum(APPOINTMENT_TYPES),
  date: z.string().min(1, 'Date requise'),
  heure: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  lieu: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Artisan picker ────────────────────────────────────────────────────────────

function ArtisanPicker({
  selected,
  onSelect,
}: {
  selected: ArtisanPublic | null
  onSelect: (a: ArtisanPublic) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['artisans-search', debouncedSearch],
    queryFn: () =>
      artisansApi.search({ atelier: debouncedSearch || undefined, limit: 10 }).then((r) => r.data ?? []),
    enabled: open,
    staleTime: 30000,
  })

  const results = (data ?? []).slice(0, 5)
  const showDropdown = open

  const handleSelect = (a: ArtisanPublic) => {
    onSelect(a)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => {
    onSelect(null as any)
    setSearch('')
    setOpen(false)
  }

  // ── Selected state — compact chip ──
  if (selected && !open) {
    return (
      <View style={picker.chip}>
        <Image
          source={{ uri: selected.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=60' }}
          style={picker.chipAvatar}
        />
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Changer d'artisan. Actuellement : ${selected.atelier}`}
        >
          <Text style={picker.chipAtelier} numberOfLines={1}>{selected.atelier}</Text>
          <Text style={picker.chipMeta} numberOfLines={1}>
            {selected.métier}{selected.localisation ? ` · ${selected.localisation}` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleClear}
          style={picker.chipClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Supprimer la sélection"
        >
          <X size={14} color={colors.textMuted} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    )
  }

  // ── Search + dropdown ──
  return (
    <View style={picker.wrapper}>
      <View style={[picker.searchRow, open && picker.searchRowFocused]}>
        <Search size={15} color={open ? colors.primary : colors.textMuted} strokeWidth={2} />
        <TextInput
          style={picker.searchInput}
          value={search}
          onChangeText={(v) => { setSearch(v); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher ou sélectionner un artisan..."
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Rechercher un artisan"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Effacer"
          >
            <X size={14} color={colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={picker.dropdown}>
          {isLoading && (
            <View style={picker.dropdownState}>
              <Text style={picker.dropdownStateText}>Recherche...</Text>
            </View>
          )}
          {!isLoading && results.length === 0 && (
            <View style={picker.dropdownState}>
              <Text style={picker.dropdownStateText}>
                {debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Aucun artisan disponible'}
              </Text>
            </View>
          )}
          {results.map((a, i) => (
            <TouchableOpacity
              key={a.id}
              style={[picker.dropdownRow, i < results.length - 1 && picker.dropdownRowBorder]}
              onPress={() => handleSelect(a)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Sélectionner ${a.atelier}`}
            >
              <Image
                source={{ uri: a.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=60' }}
                style={picker.dropdownAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={picker.dropdownAtelier} numberOfLines={1}>{a.atelier}</Text>
                <Text style={picker.dropdownMeta} numberOfLines={1}>
                  {a.métier}{a.localisation ? ` · ${a.localisation}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const picker = StyleSheet.create({
  // Selected chip
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: `${colors.primary}0C`,
    borderRadius: radius.xl, padding: spacing.md,
    borderWidth: 1.5, borderColor: `${colors.primary}35`,
  },
  chipAvatar: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  chipAtelier: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  chipMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  chipClear: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center',
  },

  // Search input
  wrapper: { gap: 0 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    borderWidth: 1.5, borderColor: colors.border,
    minHeight: 48, ...shadow.sm,
  },
  searchRowFocused: { borderColor: colors.primary },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.text },

  hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs, paddingHorizontal: spacing.xs },

  // Dropdown
  dropdown: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.xs,
    overflow: 'hidden',
    ...shadow.md,
  },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    minHeight: 56,
  },
  dropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownAvatar: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  dropdownAtelier: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  dropdownMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  dropdownState: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, alignItems: 'center' },
  dropdownStateText: { fontSize: fontSize.sm, color: colors.textMuted },
})

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NewAppointmentScreen() {
  const { artisanId } = useLocalSearchParams<{ artisanId: string }>()
  const queryClient = useQueryClient()

  // Pre-fetch the artisan if artisanId provided in route
  const preloadedArtisanId = artisanId ? Number(artisanId) : null
  const { data: preloadedArtisan } = useQuery({
    queryKey: ['artisan-public', preloadedArtisanId],
    queryFn: () => artisansApi.getById(preloadedArtisanId!).then((r) => r.data),
    enabled: !!preloadedArtisanId,
  })

  const [selectedArtisan, setSelectedArtisan] = useState<ArtisanPublic | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Use preloaded artisan if available, otherwise use manually selected one
  const artisan = preloadedArtisan ?? selectedArtisan
  const artisanReady = !!artisan

  const todayIso = new Date().toISOString().split('T')[0]

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'prise_mesures', heure: '10:00', date: todayIso, lieu: '', notes: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      appointmentsApi.create({
        artisanId: artisan!.id,
        type: data.type,
        dateHeure: `${data.date}T${data.heure}:00`,
        lieu: data.lieu || undefined,
        notes: data.notes || undefined,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['artisan-appointments'] })
      showAlert(
        'Demande envoyée !',
        "Votre demande de rendez-vous a été transmise à l'artisan. Son statut est actuellement : En attente de confirmation.",
        [{ text: 'Voir mes rendez-vous', onPress: () => router.replace('/(client)/appointments') }]
      )
    },
    onError: (e: any) => {
      showAlert('Erreur', e.response?.data?.error ?? "Impossible d'envoyer la demande.")
    },
  })

  const onSubmit = (data: FormValues) => {
    if (!artisanReady) {
      showAlert('Artisan requis', 'Veuillez sélectionner un artisan.')
      return
    }
    mutation.mutate(data)
  }

  const onFormError = (formErrors: any) => {
    if (formErrors.date) {
      Alert.alert('Date requise', formErrors.date.message ?? 'Veuillez sélectionner une date.')
    } else if (formErrors.type) {
      Alert.alert('Type de RDV requis', formErrors.type.message ?? 'Veuillez choisir le type de rendez-vous.')
    } else if (formErrors.heure) {
      Alert.alert('Heure requise', formErrors.heure.message ?? 'Veuillez indiquer une heure valide.')
    } else {
      Alert.alert('Champs incomplets', 'Veuillez vérifier les données saisies.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Prendre rendez-vous</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Artisan selector — only shown when no artisanId in route ── */}
          {!preloadedArtisanId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Artisan</Text>
              <Text style={styles.sectionHint}>Choisissez l'artisan avec qui prendre rendez-vous</Text>
              <ArtisanPicker
                selected={selectedArtisan}
                onSelect={setSelectedArtisan}
              />
              {!artisanReady && (
                <Text style={styles.errorText}>Sélectionnez un artisan pour continuer</Text>
              )}
            </View>
          )}

          {/* ── Artisan context — shown when preloaded ── */}
          {preloadedArtisan && (
            <View style={styles.artisanContext}>
              <Image
                source={{ uri: preloadedArtisan.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=60' }}
                style={styles.contextAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.contextAtelier}>{preloadedArtisan.atelier}</Text>
                <Text style={styles.contextMeta}>
                  {preloadedArtisan.métier}{preloadedArtisan.localisation ? ` · ${preloadedArtisan.localisation}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* ── Type selector ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type de rendez-vous</Text>
            <Text style={styles.sectionHint}>Choisissez la nature de votre visite</Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { value, onChange } }) => (
                <View style={styles.typeGrid}>
                  {APPOINTMENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, value === t && styles.typeChipActive]}
                      onPress={() => onChange(t)}
                      accessibilityRole="button"
                      accessibilityLabel={TYPE_LABELS[t]}
                      accessibilityState={{ selected: value === t }}
                    >
                      <Text style={[styles.typeChipText, value === t && styles.typeChipTextActive]}>
                        {TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.type && <Text style={styles.errorText}>{errors.type.message}</Text>}
          </View>

          {/* ── Date and time ── */}
          <View style={styles.dateTimeRow}>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.sectionTitle}>Date</Text>
              <Controller
                control={control}
                name="date"
                render={({ field: { value, onChange } }) => (
                  <>
                    {Platform.OS === 'web' ? (
                      <View style={styles.inputRow}>
                        <Calendar size={15} color={colors.primary} strokeWidth={2} />
                        {/* @ts-ignore — web-only input type=date */}
                        <input
                          type="date"
                          value={value ?? ''}
                          onChange={(e: any) => onChange(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{
                            flex: 1, border: 'none', outline: 'none',
                            background: 'transparent', fontSize: 15,
                            color: colors.text, fontFamily: 'inherit',
                            cursor: 'pointer', minHeight: 36,
                          }}
                        />
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.inputRow}
                          onPress={() => setShowDatePicker(true)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel="Choisir la date"
                        >
                          <Calendar size={15} color={colors.primary} strokeWidth={2} />
                          <Text style={[styles.input, !value && { color: colors.textMuted }]}>
                            {value || 'Choisir une date'}
                          </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                          <DateTimePicker
                            value={value ? new Date(value) : new Date()}
                            mode="date"
                            minimumDate={new Date()}
                            display="default"
                            onChange={(_: any, selected?: Date) => {
                              setShowDatePicker(false)
                              if (selected) {
                                const iso = selected.toISOString().split('T')[0]
                                onChange(iso)
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              />
              {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
            </View>

            <View style={[styles.section, { width: 110 }]}>
              <Text style={styles.sectionTitle}>Heure</Text>
              <Controller
                control={control}
                name="heure"
                render={({ field: { value, onChange } }) => (
                  <>
                    {Platform.OS === 'web' ? (
                      <View style={styles.inputRow}>
                        <Clock size={15} color={colors.primary} strokeWidth={2} />
                        {/* @ts-ignore — web-only input type=time */}
                        <input
                          type="time"
                          value={value ?? ''}
                          onChange={(e: any) => onChange(e.target.value)}
                          style={{
                            flex: 1, border: 'none', outline: 'none',
                            background: 'transparent', fontSize: 15,
                            color: colors.text, fontFamily: 'inherit',
                            cursor: 'pointer', minHeight: 36,
                          }}
                        />
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.inputRow}
                          onPress={() => setShowTimePicker(true)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel="Choisir l'heure"
                        >
                          <Clock size={15} color={colors.primary} strokeWidth={2} />
                          <Text style={[styles.input, !value && { color: colors.textMuted }]}>
                            {value || '--:--'}
                          </Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                          <DateTimePicker
                            value={(() => {
                              if (value && /^\d{2}:\d{2}$/.test(value)) {
                                const [h, m] = value.split(':').map(Number)
                                const d = new Date(); d.setHours(h, m, 0, 0); return d
                              }
                              return new Date()
                            })()}
                            mode="time"
                            is24Hour
                            display="default"
                            onChange={(_: any, selected?: Date) => {
                              setShowTimePicker(false)
                              if (selected) {
                                const h = String(selected.getHours()).padStart(2, '0')
                                const m = String(selected.getMinutes()).padStart(2, '0')
                                onChange(`${h}:${m}`)
                              }
                            }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              />
              {errors.heure && <Text style={styles.errorText}>{errors.heure.message}</Text>}
            </View>
          </View>

          {/* ── Location ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Lieu <Text style={styles.optionalTag}>(optionnel)</Text>
            </Text>
            <Controller
              control={control}
              name="lieu"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputRow}>
                  <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Adresse ou lieu de RDV"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Lieu du rendez-vous"
                  />
                </View>
              )}
            />
          </View>

          {/* ── Notes ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Notes <Text style={styles.optionalTag}>(optionnel)</Text>
            </Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.inputRow, styles.inputMultiRow]}>
                  <FileText size={15} color={colors.textMuted} strokeWidth={2} style={{ marginTop: 2 }} />
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Précisions, tissu à apporter, taille..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    accessibilityLabel="Notes pour le rendez-vous"
                  />
                </View>
              )}
            />
          </View>

          {/* ── Submit ── */}
          <View>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (isSubmitting || mutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit(onSubmit, onFormError)}
              disabled={isSubmitting || mutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Envoyer la demande de rendez-vous"
            >
              <Text style={styles.submitBtnText}>
                {mutation.isPending ? 'Envoi en cours...' : 'Envoyer la demande'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footnote}>
            L'artisan recevra votre demande et la confirmera sous 24h.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.xl },

  // Artisan context (preloaded)
  artisanContext: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  contextAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  contextAtelier: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  contextMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, letterSpacing: 0.1 },
  sectionHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: -4 },
  optionalTag: { fontSize: fontSize.xs, fontWeight: '400', color: colors.textMuted },

  dateTimeRow: { flexDirection: 'row', gap: spacing.md },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.full, backgroundColor: colors.bgMuted,
    borderWidth: 1.5, borderColor: colors.border, minHeight: 40,
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
  typeChipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  typeChipTextActive: { color: colors.primary, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    borderWidth: 1.5, borderColor: colors.border, ...shadow.sm,
    minHeight: 48,
  },
  inputMultiRow: { alignItems: 'flex-start', paddingVertical: spacing.md },
  input: { flex: 1, fontSize: fontSize.base, color: colors.text },
  inputMulti: { minHeight: 72 },

  errorText: { fontSize: fontSize.xs, color: colors.error },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: spacing.lg, alignItems: 'center',
    minHeight: 52, ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },

  footnote: {
    fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18,
  },
})
