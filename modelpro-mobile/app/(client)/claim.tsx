import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { ArrowLeft, Camera, ShieldAlert, AlertCircle } from 'lucide-react-native'
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
      Alert.alert('Réclamation soumise', 'Notre équipe examinera votre réclamation et vous contactera.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
  })

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const canSubmit = sujet.length > 0 && description.length >= 20

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Soumettre une réclamation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.infoBanner}>
            <AlertCircle size={18} color={colors.warning} strokeWidth={2} />
            <Text style={styles.infoText}>
              Une réclamation doit être soumise dans les 7 jours suivant la livraison.
            </Text>
          </Animated.View>

          {/* Sujet */}
          <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Sujet *</Text>
            <View style={styles.subjectGrid}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.subjectChip, sujet === s && styles.subjectChipActive]}
                  onPress={() => setSujet(s)}
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
            <Text style={styles.sectionTitle}>Description détaillée *</Text>
            <TextInput
              style={[styles.textarea, description.length > 0 && description.length < 20 && styles.textareaError]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le problème rencontré en détail (minimum 20 caractères)..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {description.length > 0 && description.length < 20 && (
              <Text style={styles.errorText}>{20 - description.length} caractères minimum restants</Text>
            )}
          </Animated.View>

          {/* Photo preuve */}
          <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Photo de preuve (optionnel)</Text>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.previewImg} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={handlePickPhoto}
                >
                  <Camera size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.changePhotoBtnText}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoEmpty} onPress={handlePickPhoto}>
                <Camera size={28} color={colors.border} strokeWidth={1.5} />
                <Text style={styles.photoEmptyText}>Ajouter une photo</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
            >
              <ShieldAlert size={18} color={colors.white} strokeWidth={2} />
              <Text style={styles.submitBtnText}>
                {mutation.isPending ? 'Envoi...' : 'Soumettre la réclamation'}
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
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 60 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: `${colors.warning}18`, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: `${colors.warning}40`,
  },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subjectChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.bgMuted,
    borderWidth: 1.5, borderColor: colors.border,
  },
  subjectChipActive: { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  subjectText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSub },
  subjectTextActive: { color: colors.primary, fontWeight: '700' },
  textarea: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, minHeight: 120, ...shadow.sm,
  },
  textareaError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.xs, color: colors.error },
  photoPreview: { gap: spacing.sm },
  previewImg: { width: '100%', height: 180, borderRadius: radius.xl },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', backgroundColor: colors.bgCard,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary,
  },
  changePhotoBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  photoEmpty: {
    alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.xl,
  },
  photoEmptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.error, borderRadius: radius.xl, padding: spacing.lg, ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
})
