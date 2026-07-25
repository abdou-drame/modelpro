import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ruler } from 'lucide-react-native'
import { ordersApi } from '@/lib/api/orders'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const MESURES = ['Poitrine', 'Taille', 'Hanches', 'Longueur', 'Epaules', 'Manche']

const schema = z.object({
  description: z.string().min(10, 'Décrivez votre commande (min. 10 caractères)'),
  mesures: z.record(z.string()).optional(),
})
type FormData = z.infer<typeof schema>

export default function OrderFormScreen() {
  const { artisanId, modelId } = useLocalSearchParams<{ artisanId: string; modelId?: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
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

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nouvelle commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Décrivez votre commande</Text>
          <Text style={styles.sectionSub}>
            Tissu, couleurs, style, occasion — plus vous êtes précis, mieux l'artisan pourra vous servir.
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Ex : Je voudrais un boubou en bazin blanc brodé pour une cérémonie..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[styles.textArea, errors.description && styles.inputError]}
              />
            )}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description.message}</Text>
          )}
        </View>

        {/* Mesures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Mesures (optionnel)</Text>
          </View>
          <View style={styles.mesuresGrid}>
            {MESURES.map((m) => (
              <View key={m} style={styles.mesureField}>
                <Text style={styles.mesureLabel}>{m}</Text>
                <TextInput
                  value={mesures[m] ?? ''}
                  onChangeText={(v) => setValue('mesures', { ...mesures, [m]: v })}
                  placeholder="ex : 92 cm"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.mesureInput}
                />
              </View>
            ))}
          </View>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit((d) => mutation.mutate(d))}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Envoyer la commande</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          L'artisan recevra votre demande et vous contactera pour confirmer les détails.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  sectionSub: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20, marginTop: -spacing.sm },
  textArea: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, fontSize: fontSize.md, color: colors.text,
    borderWidth: 1, borderColor: colors.border, minHeight: 120,
    ...shadow.sm,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  mesuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  mesureField: { width: '47%' },
  mesureLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text, marginBottom: 4 },
  mesureInput: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.sm, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
  },
  submitText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  hint: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
})
