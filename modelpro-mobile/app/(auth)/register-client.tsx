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
} from 'react-native'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { Eye, EyeOff, ArrowLeft, User } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, radius, fontSize, fontFamily, shadow } from '@/constants/theme'

const schema = z
  .object({
    prenom: z.string().min(2, 'Prénom requis'),
    nom: z.string().min(2, 'Nom requis'),
    telephone: z.string().min(9, 'Numéro invalide'),
    localisation: z.string().min(2, 'Localisation requise'),
    password: z.string().min(6, 'Min 6 caractères'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Mots de passe différents',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterClientScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { prenom: '', nom: '', telephone: '', localisation: '', password: '', confirm: '' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.registerClient({
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        localisation: data.localisation,
        password: data.password,
      })
      await setAuth(res.data.user as any, res.data.token)
      router.replace('/(client)')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoMark}>
                <User size={24} color={colors.accent} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez la communauté ModèlePro</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.row}>
                <Controller
                  control={control}
                  name="prenom"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Prénom</Text>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Aminata"
                        placeholderTextColor={colors.textLight}
                        style={[styles.input, errors.prenom && styles.inputError]}
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="nom"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Nom</Text>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Diallo"
                        placeholderTextColor={colors.textLight}
                        style={[styles.input, errors.nom && styles.inputError]}
                      />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="telephone"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="77 123 45 67"
                      placeholderTextColor={colors.textLight}
                      keyboardType="phone-pad"
                      style={[styles.input, errors.telephone && styles.inputError]}
                    />
                    {errors.telephone && <Text style={styles.errorText}>{errors.telephone.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="localisation"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Ville / Quartier</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Dakar, Plateau"
                      placeholderTextColor={colors.textLight}
                      style={[styles.input, errors.localisation && styles.inputError]}
                    />
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
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showPassword}
                        style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                      />
                      <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="confirm"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirmer</Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textLight}
                      secureTextEntry={!showPassword}
                      style={[styles.input, errors.confirm && styles.inputError]}
                    />
                    {errors.confirm && <Text style={styles.errorText}>{errors.confirm.message}</Text>}
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
                {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Créer mon compte</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.footerLink}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLinkText}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: 40 },
  header: { paddingTop: 56, marginBottom: spacing.md },
  backBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  content: { flex: 1 },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoMark: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted },

  form: { gap: spacing.lg, marginBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  input: {
    height: 52, backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg,
    fontSize: fontSize.md, color: colors.text,
  },
  inputError: { borderColor: colors.error },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 0, top: 0, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: fontSize.xs, color: colors.error },
  errorBox: { backgroundColor: colors.errorBg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error },
  errorBoxText: { fontSize: fontSize.sm, color: colors.error, textAlign: 'center' },
  submitBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, ...shadow.sm },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.white },
  footerLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: fontSize.md, color: colors.textMuted },
  footerLinkText: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600' },
})
