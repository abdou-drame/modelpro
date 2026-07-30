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
} from 'react-native'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { Eye, EyeOff, ArrowLeft, Scissors } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, radius, fontSize, fontFamily, shadow } from '@/constants/theme'

const schema = z.object({
  telephone: z.string().min(1, 'Numéro ou email requis'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type FormData = z.infer<typeof schema>

export default function LoginScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { telephone: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.login(data)
      await setAuth(res.data.user as any, res.data.token)
      router.replace(res.data.user.role === 'artisan' ? '/(artisan)/dashboard' : '/(client)')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Identifiants incorrects')
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoMark}>
                <Scissors size={24} color={colors.accent} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Bon retour</Text>
              <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Controller
                control={control}
                name="telephone"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email ou téléphone</Text>
                    <TextInput
                      value={value}
                      onChangeText={(v) => { onChange(v); setError('') }}
                      onBlur={onBlur}
                      placeholder="Entrez votre identifiant"
                      placeholderTextColor={colors.textLight}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.input, errors.telephone && styles.inputError]}
                    />
                    {errors.telephone && <Text style={styles.errorText}>{errors.telephone.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mot de passe</Text>
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        value={value}
                        onChangeText={(v) => { onChange(v); setError('') }}
                        onBlur={onBlur}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showPassword}
                        style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color={colors.textMuted} strokeWidth={1.5} />
                        ) : (
                          <Eye size={20} color={colors.textMuted} strokeWidth={1.5} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                  </View>
                )}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Se connecter</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Demo accounts */}
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>Comptes démo</Text>
              <View style={styles.demoRow}>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => { setValue('telephone', '0702000001'); setValue('password', 'Client@2026') }}
                >
                  <Text style={styles.demoBtnText}>Client</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => { setValue('telephone', '0701000001'); setValue('password', 'Artisan@2026') }}
                >
                  <Text style={styles.demoBtnText}>Artisan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer link */}
            <View style={styles.footerLink}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register-client')}>
                <Text style={styles.footerLinkText}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 56,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.serif,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Form
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  input: {
    height: 52,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBoxText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },

  // Demo
  demoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  demoLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.full,
  },
  demoBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Footer
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  footerLinkText: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '600',
  },
})
