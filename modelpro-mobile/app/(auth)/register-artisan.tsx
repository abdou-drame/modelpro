import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { metiersApi } from '@/lib/api/metiers'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize, radius, shadow, fontWeight } from '@/constants/theme'

const schema = z
  .object({
    nom: z.string().min(2, 'Nom requis'),
    prenom: z.string().min(2, 'Prénom requis'),
    telephone: z.string().min(9, 'Numéro invalide'),
    password: z.string().min(6, 'Minimum 6 caractères'),
    confirm: z.string(),
    nomAtelier: z.string().min(2, "Nom de l'atelier requis"),
    localisation: z.string().min(2, 'Localisation requise'),
    metierId: z.number({ message: 'Choisissez un métier' }),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

// ── Reusable Field component ──────────────────────────────────────────────────
type FieldProps = {
  label: string
  value: string | undefined
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  keyboard?: 'default' | 'phone-pad' | 'email-address'
  secure?: boolean
  accessibilityLabel: string
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  keyboard = 'default',
  secure = false,
  accessibilityLabel,
}: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        keyboardType={keyboard}
        secureTextEntry={secure}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={fieldStyles.input}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={accessibilityLabel}
      />
      <View
        style={[
          fieldStyles.underline,
          focused && fieldStyles.underlineFocused,
          !!error && fieldStyles.underlineError,
        ]}
      />
      {error ? (
        <Text style={fieldStyles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 2.2,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  underline: { height: 1, backgroundColor: colors.border },
  underlineFocused: { height: 1.5, backgroundColor: colors.primary },
  underlineError: { height: 1.5, backgroundColor: colors.error },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
})

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RegisterArtisanScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [metierOpen, setMetierOpen] = useState(false)

  const { data: metiers, isLoading: loadingMetiers } = useQuery({
    queryKey: ['metiers'],
    queryFn: () => metiersApi.list().then((r) => r.data),
  })

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', prenom: '', telephone: '', password: '', confirm: '', nomAtelier: '', localisation: '' },
  })

  const selectedMetierId = watch('metierId')
  const selectedMetier = metiers?.find((m) => m.id === selectedMetierId)

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.register({
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        password: data.password,
        role: 'artisan',
        atelier: data.nomAtelier,
        localisation: data.localisation,
        métier: selectedMetier?.nom ?? '',
      })
      await setAuth(res.data.user as any, res.data.token)
      router.replace('/(artisan)/dashboard')
    } catch (e: any) {
      setError(e.response?.data?.error || "Erreur lors de l'inscription")
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header strip ── */}
        <LinearGradient
          colors={['#3B1A05', '#6B2A08', '#8B3A0F']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerStrip}
        >
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />
          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <Text style={styles.headerLabel}>MODÈLEPRO · ARTISANS</Text>
            <Text style={styles.headerTitle}>Ouvrez votre atelier</Text>
            <Text style={styles.headerSub}>Rejoignez la communauté de maîtres artisans</Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Form card ── */}
        <Animated.View entering={FadeInUp.delay(180).duration(500)} style={styles.card}>

          {/* ── Section: Identité ── */}
          <Text style={styles.sectionLabel}>IDENTITÉ</Text>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <Controller
                control={control}
                name="prenom"
                render={({ field: { onChange, value } }) => (
                  <Field
                    label="PRÉNOM"
                    value={value}
                    onChange={onChange}
                    error={errors.prenom?.message}
                    placeholder="Fatou"
                    accessibilityLabel="Prénom"
                  />
                )}
              />
            </View>
            <View style={styles.rowField}>
              <Controller
                control={control}
                name="nom"
                render={({ field: { onChange, value } }) => (
                  <Field
                    label="NOM"
                    value={value}
                    onChange={onChange}
                    error={errors.nom?.message}
                    placeholder="Diallo"
                    accessibilityLabel="Nom de famille"
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="telephone"
            render={({ field: { onChange, value } }) => (
              <Field
                label="TÉLÉPHONE"
                value={value}
                onChange={onChange}
                error={errors.telephone?.message}
                placeholder="77 000 00 00"
                keyboard="phone-pad"
                accessibilityLabel="Numéro de téléphone"
              />
            )}
          />

          {/* ── Section: Atelier ── */}
          <View style={styles.sectionSeparator} />
          <Text style={styles.sectionLabel}>VOTRE ATELIER</Text>

          <Controller
            control={control}
            name="nomAtelier"
            render={({ field: { onChange, value } }) => (
              <Field
                label="NOM DE L'ATELIER"
                value={value}
                onChange={onChange}
                error={errors.nomAtelier?.message}
                placeholder="Atelier Diallo Couture"
                accessibilityLabel="Nom de l'atelier"
              />
            )}
          />

          <Controller
            control={control}
            name="localisation"
            render={({ field: { onChange, value } }) => (
              <Field
                label="LOCALISATION"
                value={value}
                onChange={onChange}
                error={errors.localisation?.message}
                placeholder="Dakar, Médina"
                accessibilityLabel="Localisation de l'atelier"
              />
            )}
          />

          {/* Metier picker */}
          <View style={styles.fieldWrap}>
            <Text style={styles.pickerLabel}>MÉTIER</Text>
            <TouchableOpacity
              onPress={() => setMetierOpen(!metierOpen)}
              style={[
                styles.pickerBtn,
                !!errors.metierId && styles.pickerBtnError,
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Choisir un métier"
              accessibilityState={{ expanded: metierOpen }}
            >
              <Text
                style={[
                  styles.pickerBtnText,
                  !selectedMetier && styles.pickerBtnPlaceholder,
                ]}
              >
                {loadingMetiers
                  ? 'Chargement des métiers...'
                  : selectedMetier?.nom ?? 'Choisissez votre spécialité'}
              </Text>
              {metierOpen ? (
                <ChevronUp size={18} color={colors.textSub} />
              ) : (
                <ChevronDown size={18} color={colors.textSub} />
              )}
            </TouchableOpacity>
            {errors.metierId ? (
              <Text style={styles.pickerError} accessibilityRole="alert">
                {errors.metierId.message}
              </Text>
            ) : null}

            {metierOpen && metiers ? (
              <View style={styles.pickerDropdown}>
                <FlatList
                  data={metiers.filter((m) => m.actif)}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setValue('metierId', item.id, { shouldValidate: true })
                        setMetierOpen(false)
                      }}
                      style={[
                        styles.pickerItem,
                        selectedMetierId === item.id && styles.pickerItemSelected,
                      ]}
                      accessibilityRole="menuitem"
                      accessibilityLabel={item.nom}
                      accessibilityState={{ selected: selectedMetierId === item.id }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMetierId === item.id && styles.pickerItemTextSelected,
                        ]}
                      >
                        {item.nom}
                      </Text>
                      {selectedMetierId === item.id ? (
                        <View style={styles.pickerItemDot} />
                      ) : null}
                    </TouchableOpacity>
                  )}
                  nestedScrollEnabled
                />
              </View>
            ) : null}
          </View>

          {/* ── Section: Sécurité ── */}
          <View style={styles.sectionSeparator} />
          <Text style={styles.sectionLabel}>SÉCURITÉ</Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Field
                label="MOT DE PASSE"
                value={value}
                onChange={onChange}
                error={errors.password?.message}
                secure
                accessibilityLabel="Mot de passe"
              />
            )}
          />

          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, value } }) => (
              <Field
                label="CONFIRMER LE MOT DE PASSE"
                value={value}
                onChange={onChange}
                error={errors.confirm?.message}
                secure
                accessibilityLabel="Confirmer le mot de passe"
              />
            )}
          />

          {/* Global error */}
          {error ? (
            <View style={styles.globalErrorWrap} accessibilityRole="alert">
              <Text style={styles.globalError}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={isSubmitting ? 'Inscription en cours' : 'Créer mon profil artisan'}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnLabel}>CRÉER MON PROFIL ARTISAN</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <Link
              href="/(auth)/login"
              style={styles.loginLink}
              accessibilityRole="link"
              accessibilityLabel="Se connecter"
            >
              Se connecter
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3B1A05' },
  scroll: { flexGrow: 1, backgroundColor: colors.bg },

  // ── Header strip ──
  headerStrip: {
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
  },
  decoCircleLg: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -50,
    right: -60,
  },
  decoCircleSm: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 30,
    right: 70,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    flex: 1,
    ...shadow.lg,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: spacing.lg,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },

  // Side-by-side row
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  rowField: { flex: 1 },

  // ── Metier picker ──
  fieldWrap: { marginBottom: spacing.xl },
  pickerLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 2.2,
    marginBottom: spacing.sm,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
  pickerBtnError: {
    borderBottomColor: colors.error,
    borderBottomWidth: 1.5,
  },
  pickerBtnText: {
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
  pickerBtnPlaceholder: {
    color: colors.textMuted,
  },
  pickerError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
  pickerDropdown: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.md,
  },
  pickerItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  pickerItemSelected: {
    backgroundColor: '#FDF0E6',
  },
  pickerItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  pickerItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // ── Global error ──
  globalErrorWrap: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  globalError: {
    fontSize: fontSize.sm,
    color: colors.error,
  },

  // ── Button ──
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    minHeight: 52,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    ...shadow.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
  },

  // ── Login link ──
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  loginText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  loginLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
})
