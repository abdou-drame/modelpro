import { useState } from 'react'
import {
  View, Text, Image, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import {
  Camera, User, MapPin, FileText, CheckCircle2, Plus, Crown, ChevronRight, LogOut, Star, X,
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

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  errorText: { fontSize: fontSize.xs, color: colors.error },
})

export default function ArtisanProfileScreen() {
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Voulez-vous vous déconnecter ?')) return
      await clearAuth()
      router.replace('/(auth)/login')
      return
    }
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => { await clearAuth(); router.replace('/(auth)/login') },
      },
    ])
  }
  const queryClient = useQueryClient()
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['artisan-profile'],
    queryFn: () => artisanApi.getProfile().then((r) => r.data),
  })

  const { data: artisanReviews = [] } = useQuery({
    queryKey: ['artisan-reviews'],
    queryFn: () => artisanApi.getReviews().then((r) => r.data),
  })

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profile
      ? {
          nomAtelier: profile.atelier,
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

  const onSubmit = (values: FormValues) => updateMutation.mutate({ nomAtelier: values.nomAtelier, description: values.description, localisation: values.localisation, zone: values.zone })

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Cover header */}
        <View style={styles.cover}>
          <Image
            source={{ uri: profile?.photosAtelier?.[0] ?? PLACEHOLDER_COVER }}
            style={StyleSheet.absoluteFill as any}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(26,16,5,0.10)', 'rgba(26,16,5,0.82)']}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.coverContent}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: profile?.photoProfil ?? PLACEHOLDER_AVATAR }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.coverMeta}>
              <Text style={styles.coverName}>{user?.prenom} {user?.nom}</Text>
              {profile?.metier ? (
                <Text style={styles.coverMetier}>{profile.metier}</Text>
              ) : null}
              {profile ? (
                <View style={styles.coverRatingRow}>
                  <StarRating value={profile.noteMoyenne ?? 0} size={11} />
                  <Text style={styles.coverRatingText}>
                    {(profile.noteMoyenne ?? 0).toFixed(1)}
                  </Text>
                </View>
              ) : null}
              {profile?.statutValidation === 'valide' ? (
                <View style={styles.validBadge}>
                  <CheckCircle2 size={11} color={colors.success} strokeWidth={2.5} />
                  <Text style={styles.validText}>Profil validé</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>

          {/* Pending validation banner */}
          {profile && profile.statutValidation !== 'valide' ? (
            <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.validationCard}>
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
          ) : null}

          {/* Atelier info */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Informations de l'atelier</Text>

            <FormField label="Nom de l'atelier *" error={errors.nomAtelier?.message}>
              <Controller
                control={control}
                name="nomAtelier"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <User size={15} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Nom de votre atelier"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Nom de l'atelier"
                    />
                  </View>
                )}
              />
            </FormField>

            <FormField label="Description">
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={[styles.inputRow, styles.inputMultiRow]}>
                    <FileText size={15} color={colors.textMuted} strokeWidth={2} style={{ marginTop: 2 }} />
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
                      accessibilityLabel="Description de l'atelier"
                    />
                  </View>
                )}
              />
            </FormField>

            <FormField label="Ville / Localisation">
              <Controller
                control={control}
                name="localisation"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex: Dakar, Plateau"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Localisation de l'atelier"
                    />
                  </View>
                )}
              />
            </FormField>

            <FormField label="Zone de service">
              <Controller
                control={control}
                name="zone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.inputRow}>
                    <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex: Dakar, Thiès, Pikine"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Zone de service"
                    />
                  </View>
                )}
              />
            </FormField>

            {isDirty && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer les modifications"
              >
                <Text style={styles.saveBtnText}>
                  {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Workshop photos */}
          <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Photos de l'atelier</Text>
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={handlePickPhotos}
                disabled={uploadMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Ajouter des photos"
              >
                <Camera size={14} color={colors.white} strokeWidth={2} />
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
                <TouchableOpacity
                  style={styles.addPhotoTile}
                  onPress={handlePickPhotos}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter une photo"
                >
                  <Plus size={22} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <TouchableOpacity
                style={styles.emptyPhotos}
                onPress={handlePickPhotos}
                accessibilityRole="button"
                accessibilityLabel="Ajouter des photos de l'atelier"
              >
                <Camera size={28} color={colors.border} strokeWidth={1.5} />
                <Text style={styles.emptyPhotosText}>Ajouter des photos de votre atelier</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Reviews link */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <TouchableOpacity
              style={styles.subscriptionRow}
              onPress={() => router.push('/(artisan)/reviews')}
              accessibilityRole="button"
              accessibilityLabel="Voir mes avis clients"
            >
              <View style={styles.subscriptionIcon}>
                <Star size={20} color={colors.primary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subscriptionLabel}>Mes avis clients</Text>
                <Text style={styles.subscriptionSub}>
                  Consulter mes évaluations et commentaires
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Subscription link */}
          <Animated.View entering={FadeInUp.delay(220).springify()}>
            <TouchableOpacity
              style={styles.subscriptionRow}
              onPress={() => router.push('/(artisan)/subscription')}
              accessibilityRole="button"
              accessibilityLabel="Gérer l'abonnement ModèlePro"
            >
              <View style={styles.subscriptionIcon}>
                <Crown size={20} color={colors.primary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subscriptionLabel}>Abonnement ModèlePro</Text>
                <Text style={styles.subscriptionSub}>Gérer votre plan et historique</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <LogOut size={18} color={colors.error} strokeWidth={1.8} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Reviews Modal */}
      {showReviewsModal && (
        <View style={StyleSheet.absoluteFillObject} style={{ zIndex: 999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xxl ?? 24, borderTopRightRadius: radius.xxl ?? 24, padding: spacing.xl, maxHeight: '80%', gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.text }}>Avis clients ({artisanReviews.length})</Text>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {artisanReviews.length === 0 ? (
                <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginVertical: 30 }}>
                  Aucun avis reçu pour le moment.
                </Text>
              ) : (
                artisanReviews.map((rev) => (
                  <View key={rev.id} style={{ backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs, borderWidth: 1, borderColor: colors.borderLight }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: colors.text }}>
                        {rev.client ? `${rev.client.prenom ?? ''} ${rev.client.nom ?? ''}` : 'Client'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                        <Text style={{ fontSize: fontSize.sm, fontWeight: '700', color: colors.text }}>{rev.note}/5</Text>
                      </View>
                    </View>
                    {rev.commentaire ? (
                      <Text style={{ fontSize: fontSize.sm, color: colors.textSub, marginTop: 4 }}>{rev.commentaire}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  cover: { height: 270, justifyContent: 'flex-end', overflow: 'hidden' },
  coverContent: {
    padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md,
  },
  avatarWrap: {
    ...shadow.lg,
    borderRadius: radius.full,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.55)',
  },
  coverMeta: { flex: 1, gap: 5 },
  coverName: {
    fontSize: fontSize.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.4,
  },
  coverMetier: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.65)' },
  coverRatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  coverRatingText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  validBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(45,106,79,0.3)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  validText: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },

  body: { padding: spacing.xl, gap: spacing.xl },

  validationCard: { borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm },
  validationBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: `${colors.warning}40`,
  },
  validationContent: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg,
  },
  validationDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.warning, marginTop: 4,
  },
  validationTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  validationSub: { fontSize: fontSize.sm, color: colors.textSub, lineHeight: 20 },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.lg, ...shadow.sm,
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgMuted, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: colors.border, minHeight: 48,
  },
  inputMultiRow: { alignItems: 'flex-start' },
  input: { flex: 1, fontSize: fontSize.base, color: colors.text },
  inputMulti: { minHeight: 90, paddingTop: 0 },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center', minHeight: 48,
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36,
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

  subscriptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, ...shadow.sm, minHeight: 64,
  },
  subscriptionIcon: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  subscriptionLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  subscriptionSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.errorLight,
    borderRadius: radius.xl, paddingVertical: spacing.md, minHeight: 52,
  },
  logoutText: { fontSize: fontSize.base, fontWeight: '600', color: colors.error },
})
