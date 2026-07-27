import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ruler, FileText, ChevronRight } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const MESURES: { key: string; label: string; hint: string }[] = [
  { key: 'Poitrine',  label: 'Poitrine',  hint: 'ex : 92 cm' },
  { key: 'Taille',    label: 'Taille',    hint: 'ex : 74 cm' },
  { key: 'Hanches',   label: 'Hanches',   hint: 'ex : 98 cm' },
  { key: 'Longueur',  label: 'Longueur',  hint: 'ex : 110 cm' },
  { key: 'Epaules',   label: 'Épaules',   hint: 'ex : 40 cm' },
  { key: 'Manche',    label: 'Manche',    hint: 'ex : 58 cm' },
]

const STEPS = ['Description', 'Mesures']

const schema = z.object({
  description: z.string().min(10, 'Décrivez votre commande (min. 10 caractères)'),
  mesures: z.record(z.string()).optional(),
})
type FormData = z.infer<typeof schema>

export default function OrderFormScreen() {
  const { artisanId, modelId } = useLocalSearchParams<{ artisanId: string; modelId?: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)

  const { control, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mesures: {} },
  })

  const mesures = watch('mesures') ?? {}

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      ordersApi.create({
        artisanId: Number(artisanId),
        creationId: modelId ? Number(modelId) : undefined,
        description: data.description,
        mesures: data.mesures,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      router.replace('/(client)/orders')
    },
    onError: (e: any) => {
      setError(e.response?.data?.error || 'Erreur lors de la commande')
    },
  })

  const goNext = async () => {
    const valid = await trigger('description')
    if (valid) setStep(1)
  }

  return (
    <View style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => (step === 0 ? router.back() : setStep(0))}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Retour' : 'Étape précédente'}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nouvelle commande</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, step >= i && styles.stepDotActive]}>
              {step > i ? (
                <ChevronRight size={12} color={colors.white} strokeWidth={3} />
              ) : (
                <Text style={[styles.stepNum, step === i && styles.stepNumActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, step === i && styles.stepLabelActive]}>
              {label}
            </Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, step > i && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          /* ── Step 1: Description ── */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <FileText size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Décrivez votre commande</Text>
                <Text style={styles.sectionSub}>
                  Tissu, couleurs, style, occasion — plus vous êtes précis, mieux l'artisan pourra vous servir.
                </Text>
              </View>
            </View>

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ex : Je voudrais un boubou en bazin blanc brodé pour une cérémonie de mariage, avec des broderies dorées sur le col et les manches..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={[styles.textArea, errors.description && styles.inputError]}
                  accessibilityLabel="Description de la commande"
                />
              )}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description.message}</Text>
            )}

            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                Mentionnez le tissu souhaité, l'occasion, les couleurs et tout détail de style.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel="Passer aux mesures"
            >
              <Text style={styles.nextBtnText}>Ajouter les mesures</Text>
              <ChevronRight size={18} color={colors.white} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSubmit((d) => mutation.mutate(d))}
              disabled={mutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Envoyer la commande sans mesures"
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.skipBtnText}>Envoyer sans mesures</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Step 2: Mesures ── */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Ruler size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Vos mesures</Text>
                <Text style={styles.sectionSub}>
                  Toutes les mesures sont optionnelles. L'artisan peut prendre vos mesures en atelier.
                </Text>
              </View>
            </View>

            <View style={styles.mesuresGrid}>
              {MESURES.map((m) => (
                <View key={m.key} style={styles.mesureField}>
                  <Text style={styles.mesureLabel}>{m.label}</Text>
                  <TextInput
                    value={mesures[m.key] ?? ''}
                    onChangeText={(v) => setValue('mesures', { ...mesures, [m.key]: v })}
                    placeholder={m.hint}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.mesureInput}
                    accessibilityLabel={`Mesure ${m.label}`}
                  />
                </View>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit((d) => mutation.mutate(d))}
              disabled={mutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Envoyer la commande"
            >
              {mutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Envoyer la commande</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              L'artisan recevra votre demande et vous contactera pour confirmer les détails.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  /* Step indicator */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bg,
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNum: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textMuted },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: { backgroundColor: colors.primary },

  scroll: { padding: spacing.xl, paddingBottom: 60 },

  section: { gap: spacing.lg },
  sectionHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  sectionSub: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },

  textArea: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 140,
    lineHeight: 24,
    ...shadow.sm,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.sm, color: colors.error },

  tipBox: {
    backgroundColor: `${colors.primary}0D`,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: `${colors.primary}60`,
  },
  tipText: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadow.md,
  },
  nextBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textDecorationLine: 'underline',
  },

  mesuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mesureField: { width: '47%' },
  mesureLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  mesureInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
    ...shadow.sm,
  },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadow.md,
  },
  submitBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },

  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
