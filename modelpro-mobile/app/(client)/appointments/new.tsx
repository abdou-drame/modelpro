import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, Calendar, MapPin, FileText } from 'lucide-react-native'
import { appointmentsApi } from '@/lib/api/appointments'
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
  type: z.enum(APPOINTMENT_TYPES, { required_error: 'Choisissez un type' }),
  date: z.string().min(1, 'Date requise'),
  heure: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  lieu: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewAppointmentScreen() {
  const { artisanId } = useLocalSearchParams<{ artisanId: string }>()
  const artId = Number(artisanId)
  const queryClient = useQueryClient()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { heure: '10:00' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      appointmentsApi.create({
        artisanId: artId,
        type: data.type,
        dateHeure: `${data.date}T${data.heure}:00`,
        lieu: data.lieu || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] })
      Alert.alert(
        'Demande envoyée',
        'L\'artisan sera notifié et confirmera votre rendez-vous.',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    },
    onError: (e: any) => {
      Alert.alert('Erreur', e.response?.data?.error ?? 'Impossible d\'envoyer la demande.')
    },
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Prendre rendez-vous</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Type de RDV */}
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Type de rendez-vous *</Text>
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
          </Animated.View>

          {/* Date */}
          <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Date *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputRow}>
                  <Calendar size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="AAAA-MM-JJ (ex: 2026-08-15)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              )}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
          </Animated.View>

          {/* Heure */}
          <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Heure *</Text>
            <Controller
              control={control}
              name="heure"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputRow}>
                  <Calendar size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="HH:MM (ex: 10:30)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              )}
            />
            {errors.heure && <Text style={styles.errorText}>{errors.heure.message}</Text>}
          </Animated.View>

          {/* Lieu */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Lieu (optionnel)</Text>
            <Controller
              control={control}
              name="lieu"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputRow}>
                  <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Adresse ou lieu de RDV"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}
            />
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.inputRow, styles.inputMultiRow]}>
                  <FileText size={16} color={colors.textMuted} strokeWidth={2} style={{ marginTop: 2 }} />
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Précisions, tissu à apporter..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              )}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || mutation.isPending}
            >
              <Text style={styles.submitBtnText}>
                {mutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

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
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgMuted,
    borderWidth: 1.5, borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  typeChipText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  typeChipTextActive: { color: colors.primary, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, ...shadow.sm,
  },
  inputMultiRow: { alignItems: 'flex-start', paddingVertical: spacing.md },
  input: { flex: 1, fontSize: fontSize.base, color: colors.text },
  inputMulti: { minHeight: 72 },
  errorText: { fontSize: fontSize.xs, color: colors.error },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.lg, alignItems: 'center', ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
})
