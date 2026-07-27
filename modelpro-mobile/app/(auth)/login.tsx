import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize, radius, shadow, fontWeight } from '@/constants/theme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42

const schema = z.object({
  telephone: z.string().min(9, 'Numéro invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})

type FormData = z.infer<typeof schema>

export default function LoginScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { telephone: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.login(data)
      await setAuth(res.data.user as any, res.data.token)
      if (res.data.user.role === 'artisan') {
        router.replace('/(artisan)/dashboard')
      } else {
        router.replace('/(client)')
      }
    } catch (e: any) {
      if (!e.response) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
      } else {
        setError(e.response.data?.error || 'Identifiants incorrects')
      }
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
        bounces={false}
      >
        {/* ── Hero area ── */}
        <LinearGradient
          colors={['#6B2A08', '#8B3A0F', '#B85C2A']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative circle — offset top-right for asymmetric feel */}
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />

          <Animated.View entering={FadeInDown.delay(80).duration(600)} style={styles.brandBlock}>
            {/* Monogram */}
            <View style={styles.monogram}>
              <Text style={styles.monogramLetter}>M</Text>
            </View>

            <Text style={styles.wordmark}>MODÈLEPRO</Text>
            <Text style={styles.tagline}>L'artisanat africain, sur mesure</Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Form card — bottom sheet style ── */}
        <Animated.View entering={FadeInUp.delay(200).duration(550)} style={styles.sheet}>
          <Text style={styles.sheetTitle}>Connexion</Text>
          <Text style={styles.sheetSub}>Accédez à votre espace personnel</Text>

          {/* Telephone */}
          <Controller
            control={control}
            name="telephone"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>TÉLÉPHONE</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder=""
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  onFocus={() => setFocusedField('telephone')}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Numéro de téléphone"
                />
                <View
                  style={[
                    styles.underline,
                    focusedField === 'telephone' && styles.underlineFocused,
                    !!errors.telephone && styles.underlineError,
                  ]}
                />
                {errors.telephone ? (
                  <Text style={styles.fieldError} accessibilityRole="alert">
                    {errors.telephone.message}
                  </Text>
                ) : null}
              </View>
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>MOT DE PASSE</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder=""
                  secureTextEntry
                  autoComplete="password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Mot de passe"
                />
                <View
                  style={[
                    styles.underline,
                    focusedField === 'password' && styles.underlineFocused,
                    !!errors.password && styles.underlineError,
                  ]}
                />
                {errors.password ? (
                  <Text style={styles.fieldError} accessibilityRole="alert">
                    {errors.password.message}
                  </Text>
                ) : null}
              </View>
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
            accessibilityLabel={isSubmitting ? 'Connexion en cours' : 'Se connecter'}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnLabel}>SE CONNECTER</Text>
            )}
          </TouchableOpacity>

          {/* Register links */}
          <View style={styles.linksSection}>
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Pas encore de compte ? </Text>
              <Link
                href="/(auth)/register-client"
                style={styles.registerLink}
                accessibilityRole="link"
                accessibilityLabel="Créer un compte client"
              >
                Créer un compte
              </Link>
            </View>
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Vous êtes artisan ? </Text>
              <Link
                href="/(auth)/register-artisan"
                style={styles.registerLink}
                accessibilityRole="link"
                accessibilityLabel="Rejoindre en tant qu'artisan"
              >
                Rejoindre
              </Link>
            </View>
          </View>

          <Text style={styles.hint}>Démo : 0702000001 / Client@2026</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.bg,
  },

  // ── Hero ──
  hero: {
    height: HERO_HEIGHT,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxxl,
  },
  decoCircleLg: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -60,
  },
  decoCircleSm: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 40,
    right: 80,
  },
  brandBlock: {
    alignItems: 'flex-start',
  },
  monogram: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  monogramLetter: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 1,
  },
  wordmark: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: 5,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    fontWeight: fontWeight.regular,
  },

  // ── Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    ...shadow.lg,
  },
  sheetTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  sheetSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
    letterSpacing: 0.2,
  },

  // ── Fields ──
  field: {
    marginBottom: spacing.xl,
  },
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
  underline: {
    height: 1,
    backgroundColor: colors.border,
  },
  underlineFocused: {
    height: 1.5,
    backgroundColor: colors.primary,
  },
  underlineError: {
    height: 1.5,
    backgroundColor: colors.error,
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
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
  btnDisabled: {
    opacity: 0.6,
  },
  btnLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 2.5,
  },

  // ── Bottom links ──
  linksSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  registerText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
  },
  registerLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },
})
