import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { ArrowLeft, Camera, ShieldAlert, Info, X } from 'lucide-react-native'
import { claimsApi } from '@/lib/api/claims'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const SUBJECTS = [
  'Article non conforme',
  'Délai non respecté',
  'Qualité insatisfaisante',
  'Problème de communication',
  'Facturation incorrecte',
  'Autre',
]

export default function ClaimScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const id = Number(orderId)

  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => claimsApi.create({
      orderId: id,
      sujet,
      description,
      photoPreuve: photoUri ?? undefined,
    }),
    onSuccess: () => {
      Alert.alert(
        'Réclamation soumise',
        'Notre équipe examinera votre réclamation et vous contactera sous 48 h.',
        [{ text: 'OK', onPress: () => router.back() }],
      )
    },
  })

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const descTooShort = description.length > 0 && description.length < 20
  const canSubmit = sujet.length > 0 && description.length >= 20

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Réclamation</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.infoBanner}>
            <View style={styles.infoIconBox}>
              <Info size={16} color={colors.warning} strokeWidth={2.5} />
            </View>
            <Text style={styles.infoText}>
              Une réclamation doit être soumise dans les{' '}
              <Text style={styles.infoBold}>7 jours suivant la livraison</Text>.
              Notre équipe vous répondra sous 48 h.
            </Text>
          </Animated.View>

          {/* Sujet */}
          <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>
              Sujet <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.subjectGrid}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.subjectChip, sujet === s && styles.subjectChipActive]}
                  onPress={() => setSujet(s)}
                  accessibilityRole="radio"
                  accessibilityLabel={s}
                  accessibilityState={{ selected: sujet === s }}
                >
                  <Text style={[styles.subjectText, sujet === s && styles.subjectTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionTitle}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <Text style={[styles.charCount, descTooShort && styles.charCountError]}>
                {description.length} / 20 min
              </Text>
            </View>
            <TextInput
              style={[styles.textarea, descTooShort && styles.textareaError]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le problème rencontré en détail — ce qui était attendu, ce qui a été livré, les impacts..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              accessibilityLabel="Description de la réclamation"
            />
            {descTooShort && (
              <Text style={styles.errorText}>
                Encore {20 - description.length} caractère{20 - description.length > 1 ? 's' : ''} minimum.
              </Text>
            )}
          </Animated.View>

          {/* Photo */}
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photo de preuve <Text style={styles.optional}>(optionnel)</Text>
            </Text>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.previewImg} resizeMode="cover" />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.changePhotoBtn}
                    onPress={handlePickPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Changer la photo"
                  >
                    <Camera size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.changePhotoBtnText}>Changer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotoUri(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer la photo"
                  >
                    <X size={15} color={colors.error} strokeWidth={2} />
                    <Text style={styles.removePhotoBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoEmpty}
                onPress={handlePickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Ajouter une photo de preuve"
              >
                <View style={styles.photoEmptyIcon}>
                  <Camera size={24} color={colors.textMuted} strokeWidth={1.5} />
                </View>
                <Text style={styles.photoEmptyTitle}>Ajouter une photo</Text>
                <Text style={styles.photoEmptyHint}>JPG, PNG — max 8 Mo</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Soumettre la réclamation"
              accessibilityState={{ disabled: !canSubmit || mutation.isPending }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={canSubmit ? colors.white : colors.textMuted} size="small" />
              ) : (
                <>
                  <ShieldAlert size={18} color={canSubmit ? colors.white : colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                    Soumettre la réclamation
                  </Text>
                </>
              )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  infoBold: { fontWeight: '700', color: colors.warning },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  required: { color: colors.error },
  optional: { fontSize: fontSize.sm, fontWeight: '400', color: colors.textMuted },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted },
  charCountError: { color: colors.error },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subjectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 38,
    justifyContent: 'center',
  },
  subjectChipActive: {
    backgroundColor: `${colors.warning}15`,
    borderColor: colors.warning,
  },
  subjectText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  subjectTextActive: { color: colors.warning, fontWeight: '700' },

  textarea: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 130,
    lineHeight: 24,
    ...shadow.sm,
  },
  textareaError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.xs, color: colors.error },

  photoPreview: { gap: spacing.sm },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: radius.xl,
    backgroundColor: colors.bgMuted,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.primary,
    minHeight: 36,
  },
  changePhotoBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: `${colors.error}50`,
    minHeight: 36,
  },
  removePhotoBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },

  photoEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    minHeight: 120,
    justifyContent: 'center',
  },
  photoEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSub },
  photoEmptyHint: { fontSize: fontSize.xs, color: colors.textMuted },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.bgMuted },
  submitBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  submitBtnTextDisabled: { color: colors.textMuted },
})
