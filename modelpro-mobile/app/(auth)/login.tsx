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
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize } from '@/constants/theme'

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
      >
        {/* Monogram + wordmark */}
        <View style={styles.brandBlock}>
          <View style={styles.monogram}>
            <Text style={styles.monogramLetter}>M</Text>
          </View>
          <Text style={styles.wordmark}>MODÈLEPRO</Text>
          <Text style={styles.tagline}>LA COUTURE, SUR MESURE</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="telephone"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>TÉLÉPHONE OU EMAIL</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder=""
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('telephone')}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                />
                <View style={[styles.underline, focusedField === 'telephone' && styles.underlineFocused, !!errors.telephone && styles.underlineError]} />
                {errors.telephone && <Text style={styles.fieldError}>{errors.telephone.message}</Text>}
              </View>
            )}
          />

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
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                />
                <View style={[styles.underline, focusedField === 'password' && styles.underlineFocused, !!errors.password && styles.underlineError]} />
                {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
              </View>
            )}
          />

          {error ? <Text style={styles.globalError}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnLabel}>SE CONNECTER</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <Link href="/(auth)/register-client" style={styles.registerLink}>
              Créer un compte
            </Link>
          </View>

          <Text style={styles.hint}>
            Démo : 0702000001 / Client@2026
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xxxl },
  monogram: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  monogramLetter: { fontSize: 32, fontWeight: '300', color: colors.primary, letterSpacing: 2 },
  wordmark: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: 6, marginBottom: 6 },
  tagline: { fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 3, fontWeight: '400' },
  form: { gap: spacing.sm },
  field: { marginBottom: spacing.xl },
  label: { fontSize: 10, fontWeight: '600', color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.sm },
  input: { fontSize: fontSize.base, color: colors.text, paddingVertical: spacing.sm, backgroundColor: 'transparent' },
  underline: { height: 1, backgroundColor: colors.border },
  underlineFocused: { height: 1.5, backgroundColor: colors.primary },
  underlineError: { height: 1.5, backgroundColor: colors.error },
  fieldError: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs, letterSpacing: 0.3 },
  globalError: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  btn: { backgroundColor: colors.primary, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  btnDisabled: { opacity: 0.6 },
  btnLabel: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 2.5 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  registerText: { fontSize: fontSize.sm, color: colors.textSub },
  registerLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.2 },
})
