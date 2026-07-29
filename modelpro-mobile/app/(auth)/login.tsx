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
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Eye, EyeOff, AlertCircle, Crown, Check, ChevronDown, ChevronRight } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'

const schema = z.object({
  telephone: z.string().min(1, 'Veuillez saisir votre numéro ou email'),
  password: z.string().min(1, 'Veuillez saisir votre mot de passe'),
})

type FormData = z.infer<typeof schema>

export default function LoginScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
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
        setError(e.response.data?.error || 'Email ou mot de passe incorrect.')
      }
    }
  }

  const fillDemo = (phone: string, pass: string) => {
    setValue('telephone', phone)
    setValue('password', pass)
    setError('')
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
        <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>

          {/* ── En-tête Logo ── */}
          <View style={styles.headerLogoRow}>
            <View style={styles.logoBox}>
              <Crown size={22} color="#C05A2B" strokeWidth={2} />
            </View>
            <Text style={styles.brandTitle}>ModèlePro</Text>
          </View>

          {/* ── Titre & Surtitre ── */}
          <View style={styles.titleSection}>
            <Text style={styles.surtitre}>ACCÈS MEMBRE</Text>
            <Text style={styles.mainTitle}>Bon retour</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre espace ModèlePro</Text>
          </View>

          {/* ── Formulaire ── */}
          <View style={styles.form}>

            {/* Champ Téléphone / Email */}
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, value, onBlur } }) => {
                const hasError = !!errors.telephone || !!error
                return (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Adresse email ou numéro</Text>
                    <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
                      <TextInput
                        value={value}
                        onChangeText={(v) => { onChange(v); setError('') }}
                        onBlur={onBlur}
                        placeholder="ex: client@modelepro.sn ou 0702000001"
                        placeholderTextColor="#A89684"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        accessibilityLabel="Adresse email ou numéro de téléphone"
                      />
                    </View>
                    {errors.telephone ? (
                      <View style={styles.errorRow}>
                        <AlertCircle size={14} color="#9E2A2B" />
                        <Text style={styles.errorText}>{errors.telephone.message}</Text>
                      </View>
                    ) : null}
                  </View>
                )
              }}
            />

            {/* Champ Mot de passe */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => {
                const hasError = !!errors.password || !!error
                return (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mot de passe</Text>
                    <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
                      <TextInput
                        value={value}
                        onChangeText={(v) => { onChange(v); setError('') }}
                        onBlur={onBlur}
                        placeholder="••••••••"
                        placeholderTextColor="#A89684"
                        secureTextEntry={!showPassword}
                        style={[styles.input, { paddingRight: 44 }]}
                        accessibilityLabel="Mot de passe"
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                        accessibilityLabel="Afficher ou masquer le mot de passe"
                      >
                        {showPassword ? (
                          <EyeOff size={18} color="#7A6A58" />
                        ) : (
                          <Eye size={18} color="#7A6A58" />
                        )}
                      </TouchableOpacity>
                    </View>
                    {errors.password ? (
                      <View style={styles.errorRow}>
                        <AlertCircle size={14} color="#9E2A2B" />
                        <Text style={styles.errorText}>{errors.password.message}</Text>
                      </View>
                    ) : null}
                  </View>
                )
              }}
            />

            {/* Message d'erreur global */}
            {error ? (
              <View style={styles.errorRowGlobal}>
                <AlertCircle size={15} color="#9E2A2B" />
                <Text style={styles.errorTextGlobal}>{error}</Text>
              </View>
            ) : null}

            {/* Options Checkbox & Mot de passe oublié */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.rememberText}>Rester connecté</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setError('Contactez le support au 0702000000 pour réinitialiser.')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Se Connecter */}
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? 'Connexion en cours' : 'Se connecter'}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Liens secondaires */}
            <View style={styles.linksBlock}>
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Pas encore de compte ? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register-client')}>
                  <Text style={styles.registerLinkBold}>Créer un compte</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.backHomeBtn}
                onPress={() => router.replace('/(auth)')}
                activeOpacity={0.7}
              >
                <Text style={styles.backHomeText}>Retour à l'accueil</Text>
              </TouchableOpacity>
            </View>

            {/* Démo acccordéon */}
            <View style={styles.demoSection}>
              <TouchableOpacity
                style={styles.demoHeader}
                onPress={() => setShowDemoAccounts(!showDemoAccounts)}
                activeOpacity={0.7}
              >
                {showDemoAccounts ? (
                  <ChevronDown size={16} color="#7A6A58" />
                ) : (
                  <ChevronRight size={16} color="#7A6A58" />
                )}
                <Text style={styles.demoHeaderText}>Comptes de démonstration</Text>
              </TouchableOpacity>

              {showDemoAccounts && (
                <View style={styles.demoContent}>
                  <TouchableOpacity
                    style={styles.demoPill}
                    onPress={() => fillDemo('0702000001', 'Client@2026')}
                  >
                    <Text style={styles.demoPillTitle}>👤 Client Démo</Text>
                    <Text style={styles.demoPillSub}>0702000001 / Client@2026</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.demoPill}
                    onPress={() => fillDemo('0701000001', 'Artisan@2026')}
                  >
                    <Text style={styles.demoPillTitle}>✂️ Artisan Démo</Text>
                    <Text style={styles.demoPillSub}>0701000001 / Artisan@2026</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  container: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },

  // ── Header Logo ──
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // ── Titre Section ──
  titleSection: {
    marginBottom: 28,
  },
  surtitre: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.8,
    lineHeight: 40,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A6A58',
    lineHeight: 22,
  },

  // ── Formulaire ──
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1005',
  },
  inputWrapper: {
    position: 'relative',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#9E2A2B',
    backgroundColor: '#FFF9F9',
  },
  input: {
    fontSize: 15,
    color: '#1A1005',
    width: '100%',
    height: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#9E2A2B',
    fontWeight: '500',
  },
  errorRowGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorTextGlobal: {
    fontSize: 13,
    color: '#9E2A2B',
    fontWeight: '600',
    flex: 1,
  },

  // ── Options ──
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C05A2B',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#C05A2B',
  },
  rememberText: {
    fontSize: 14,
    color: '#55483B',
  },
  forgotText: {
    fontSize: 14,
    color: '#7A6A58',
  },

  // ── Bouton Principal ──
  primaryBtn: {
    height: 52,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C05A2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Liens bas ──
  linksBlock: {
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#7A6A58',
  },
  registerLinkBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1005',
  },
  backHomeBtn: {
    paddingVertical: 4,
  },
  backHomeText: {
    fontSize: 14,
    color: '#7A6A58',
    textDecorationLine: 'underline',
  },

  // ── Accordéon Démo ──
  demoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoHeaderText: {
    fontSize: 13,
    color: '#7A6A58',
    fontWeight: '500',
  },
  demoContent: {
    gap: 8,
    marginTop: 12,
  },
  demoPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
  },
  demoPillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1005',
  },
  demoPillSub: {
    fontSize: 12,
    color: '#7A6A58',
    marginTop: 2,
  },
})
