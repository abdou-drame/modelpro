import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const schema = z.object({
  titre: z.string().min(2, 'Au moins 2 caractères').max(80),
  description: z.string().optional(),
  prixEstimatif: z.string().optional(),
  disponible: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View style={fieldStyles.labelRow}>
      <Text style={fieldStyles.label}>{label}</Text>
      {required && <Text style={fieldStyles.required}>requis</Text>}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  required: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
})

export default function NewModelScreen() {
  const queryClient = useQueryClient()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', prixEstimatif: '', disponible: true },
  })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      artisanApi.createModel({
        titre: values.titre,
        description: values.description ?? undefined,
        prixEstimatif: values.prixEstimatif ? Number(values.prixEstimatif) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-models'] })
      router.back()
    },
  })

  const onSubmit = (values: FormValues) => createMutation.mutate(values)

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
            accessibilityLabel="Annuler"
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Nouveau modèle</Text>
          <TouchableOpacity
            style={[styles.saveBtn, createMutation.isPending && styles.saveBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le modèle"
          >
            {createMutation.isPending
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.saveBtnText}>Enregistrer</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.card}>
            <Text style={styles.cardSection}>Informations</Text>

            <View style={styles.field}>
              <FieldLabel label="Titre du modèle" required />
              <Controller
                control={control}
                name="titre"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, errors.titre && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ex: Ensemble bazin brodé"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="next"
                    autoCapitalize="sentences"
                  />
                )}
              />
              {errors.titre && <Text style={styles.errorText}>{errors.titre.message}</Text>}
            </View>

            <View style={styles.field}>
              <FieldLabel label="Description" />
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Décrivez les matières, les finitions, les délais..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                  />
                )}
              />
            </View>

            <View style={styles.field}>
              <FieldLabel label="Prix estimatif (FCFA)" />
              <Controller
                control={control}
                name="prixEstimatif"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.priceInputWrapper}>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex: 45000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.priceSuffix}>FCFA</Text>
                  </View>
                )}
              />
              <Text style={styles.hint}>Affiché à titre indicatif sur votre catalogue</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(110).springify()} style={styles.card}>
            <Text style={styles.cardSection}>Visibilité</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Disponible à la commande</Text>
                <Text style={styles.switchSub}>Visible dans votre catalogue public</Text>
              </View>
              <Controller
                control={control}
                name="disponible"
                render={({ field: { value, onChange } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: colors.primary, false: colors.borderLight }}
                    thumbColor={colors.white}
                    accessibilityRole="switch"
                    accessibilityLabel="Rendre le modèle disponible"
                  />
                )}
              />
            </View>
          </Animated.View>

          {createMutation.isError && (
            <Animated.View entering={FadeInUp.springify()} style={styles.errorCard}>
              <Text style={styles.errorCardText}>La création a échoué. Vérifiez votre connexion et réessayez.</Text>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },

  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 80 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow.sm,
  },
  cardSection: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.bgMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputMulti: { minHeight: 108, paddingTop: spacing.md },
  inputError: { borderColor: colors.error, backgroundColor: `${colors.error}08` },
  errorText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '500' },
  hint: { fontSize: fontSize.xs, color: colors.textMuted },

  priceInputWrapper: { position: 'relative' },
  priceInput: { paddingRight: 56 },
  priceSuffix: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: 52,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchInfo: { flex: 1, gap: 2 },
  switchLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  switchSub: { fontSize: fontSize.xs, color: colors.textMuted },

  errorCard: {
    backgroundColor: `${colors.error}10`,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}35`,
  },
  errorCardText: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center', lineHeight: 20 },
})
