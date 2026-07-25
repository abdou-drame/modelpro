import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, Check } from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const schema = z.object({
  titre: z.string().min(2, 'Au moins 2 caractères').max(80),
  description: z.string().optional(),
  prixEstimatif: z.string().optional(),
  disponible: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function EditModelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const modelId = Number(id)
  const queryClient = useQueryClient()

  const { data: model } = useQuery({
    queryKey: ['my-models'],
    queryFn: () => artisanApi.myModels().then((r) => r.data),
    select: (models) => models.find((m) => m.id === modelId),
  })

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: model
      ? {
          titre: model.titre,
          description: model.description ?? '',
          prixEstimatif: model.prixEstimatif != null ? String(model.prixEstimatif) : '',
          disponible: model.disponible,
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      artisanApi.updateModel(modelId, {
        titre: values.titre,
        description: values.description ?? undefined,
        prixEstimatif: values.prixEstimatif ? Number(values.prixEstimatif) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-models'] })
      router.back()
    },
  })

  const onSubmit = (values: FormValues) => updateMutation.mutate(values)

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
          <Text style={styles.navTitle}>Modifier le modèle</Text>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
          >
            <Check size={18} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Informations du modèle</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Titre *</Text>
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
                  />
                )}
              />
              {errors.titre && <Text style={styles.errorText}>{errors.titre.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Décrivez le modèle, les matières, les finitions..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Prix estimatif (FCFA)</Text>
              <Controller
                control={control}
                name="prixEstimatif"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Ex: 45000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.label}>Disponible à la commande</Text>
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
                  />
                )}
              />
            </View>
          </Animated.View>

          {updateMutation.isError && (
            <Animated.View entering={FadeInUp.springify()} style={styles.errorCard}>
              <Text style={styles.errorCardText}>Erreur lors de la modification. Réessayez.</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  saveBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.lg, ...shadow.sm,
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.base, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border,
  },
  inputMulti: { minHeight: 100, paddingTop: spacing.md },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.xs, color: colors.error },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: spacing.md,
  },
  switchSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  errorCard: {
    backgroundColor: `${colors.error}18`, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: `${colors.error}40`,
  },
  errorCardText: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center' },
})
