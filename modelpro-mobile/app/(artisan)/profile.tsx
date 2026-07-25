import {
  View, Text, Image, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import {
  Camera, User, MapPin, FileText, CheckCircle2, Plus,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { useAuthStore } from '@/lib/store/authStore'
import { StarRating } from '@/components/ui/StarRating'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'
const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

const schema = z.object({
  nomAtelier: z.string().min(2, 'Au moins 2 caractères'),
  description: z.string().optional(),
  localisation: z.string().optional(),
  zone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ArtisanProfileScreen() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['artisan-profile'],
    queryFn: () => artisanApi.getProfile().then((r) => r.data),
  })

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profile
      ? {
          nomAtelier: profile.nomAtelier,
          description: profile.description ?? '',
          localisation: profile.localisation ?? '',
          zone: profile.zone ?? '',
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => artisanApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artisan-profile'] })
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (uris: string[]) => artisanApi.uploadPhotos(uris),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artisan-profile'] }),
  })

  const handlePickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour ajouter des photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    })
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri)
      uploadMutation.mutate(uris)
    }
  }

  const onSubmit = (values: FormValues) => updateMutation.mutate(values)

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header cover */}
        <View style={styles.cover}>
          <Image
            source={{ uri: profile?.photosAtelier?.[0] ?? PLACEHOLDER_COVER }}
            style={StyleSheet.absoluteFillObject as any}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(26,26,46,0.2)', 'rgba(26,26,46,0.8)']}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.coverContent}>
            <Image
              source={{ uri: profile?.photoProfil ?? PLACEHOLDER_AVATAR }}
              style={styles.avatar}
            />
            <View style={styles.coverText}>
              <Text style={styles.coverName}>{user?.prenom} {user?.nom}</Text>
              {profile && (
                <View style={styles.coverMeta}>
                  <StarRating value={profile.notemoyenne} size={12} />
                  <Text style={styles.coverMetaText}>{profile.notemoyenne.toFixed(1)} · {profile.metier.nom}</Text>
                </View>
              )}
              {profile?.estValide && (
                <View style={styles.validBadge}>
                  <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
                  <Text style={styles.validText}>Profil validé</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* Informations */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Informations de l'atelier</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nom de l'atelier *</Text>
              <Controller
                control={control}
                name="nomAtelier"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <User size={16} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Nom de votre atelier"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              />
              {errors.nomAtelier && <Text style={styles.errorText}>{errors.nomAtelier.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={[styles.inputRow, styles.inputMultiRow]}>
                    <FileText size={16} color={colors.textMuted} strokeWidth={2} style={{ marginTop: 2 }} />
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Décrivez votre savoir-faire, vos spécialités..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ville / Localisation</Text>
              <Controller
                control={control}
                name="localisation"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex: Dakar, Plateau"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Zone de service</Text>
              <Controller
                control={control}
                name="zone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <MapPin size={16} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex: Dakar, Thiès, Pikine"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              />
            </View>

            {isDirty && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.saveBtnText}>
                  {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Photos atelier */}
          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Photos de l'atelier</Text>
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={handlePickPhotos}
                disabled={uploadMutation.isPending}
              >
                <Camera size={16} color={colors.white} strokeWidth={2} />
                <Text style={styles.addPhotoBtnText}>
                  {uploadMutation.isPending ? 'Upload...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            {profile?.photosAtelier && profile.photosAtelier.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {profile.photosAtelier.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={styles.atelierPhoto} resizeMode="cover" />
                ))}
                <TouchableOpacity style={styles.addPhotoTile} onPress={handlePickPhotos}>
                  <Plus size={24} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <TouchableOpacity style={styles.emptyPhotos} onPress={handlePickPhotos}>
                <Camera size={32} color={colors.border} strokeWidth={1.5} />
                <Text style={styles.emptyPhotosText}>Ajouter des photos de votre atelier</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Validation status */}
          {profile && !profile.estValide && (
            <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.validationCard}>
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.validationBorder} />
              <View style={styles.validationContent}>
                <View style={styles.validationDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.validationTitle}>Validation en cours</Text>
                  <Text style={styles.validationSub}>
                    Votre profil est en cours de vérification. Vous recevrez une notification une fois validé.
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cover: { height: 260, justifyContent: 'flex-end', overflow: 'hidden' },
  coverContent: { padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  avatar: {
    width: 72, height: 72, borderRadius: radius.full,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  coverText: { gap: 5, flex: 1 },
  coverName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  coverMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  coverMetaText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  validBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45,106,79,0.25)', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  validText: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },

  body: { padding: spacing.xl, gap: spacing.xl },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.lg, ...shadow.sm,
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  inputMultiRow: { alignItems: 'flex-start' },
  input: { flex: 1, fontSize: fontSize.base, color: colors.text },
  inputMulti: { minHeight: 90, paddingTop: 0 },
  errorText: { fontSize: fontSize.xs, color: colors.error },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7,
  },
  addPhotoBtnText: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600' },
  photosScroll: { marginTop: spacing.xs },
  atelierPhoto: {
    width: 120, height: 90, borderRadius: radius.lg, marginRight: spacing.sm,
  },
  addPhotoTile: {
    width: 120, height: 90, borderRadius: radius.lg, marginRight: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyPhotos: {
    alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  emptyPhotosText: { fontSize: fontSize.sm, color: colors.textMuted },

  validationCard: {
    borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm,
  },
  validationBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: `${colors.warning}40`,
  },
  validationContent: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.lg,
  },
  validationDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.warning, marginTop: 4,
  },
  validationTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  validationSub: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },
})
