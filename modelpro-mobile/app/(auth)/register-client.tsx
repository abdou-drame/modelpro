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
import { Eye, EyeOff, AlertCircle, Crown, Shield } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'

const schema = z
  .object({
    nom: z.string().min(2, 'Nom requis'),
    prenom: z.string().min(2, 'Prénom requis'),
    telephone: z.string().min(9, 'Numéro invalide (min 9 chiffres)'),
    localisation: z.string().min(2, 'Ville ou quartier requis'),
    password: z.string().min(6, 'Mot de passe trop court (min 6 caractères)'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterClientScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      prenom: '',
      telephone: '',
      localisation: '',
      password: '',
      confirm: '',
    },
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
      if (!e.response) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
      } else {
        setError(e.response.data?.error || 'Une erreur est survenue')
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
            <Text style={styles.surtitre}>CRÉATION DE COMPTE CLIENT</Text>
            <Text style={styles.mainTitle}>Créer un compte</Text>
            <Text style={styles.subtitle}>
              Rejoignez la plateforme et commandez vos tenues sur-mesure
            </Text>
          </View>

          {/* ── Formulaire ── */}
          <View style={styles.form}>

            {/* Prénom */}
            <Controller
              control={control}
              name="prenom"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Prénom</Text>
                  <View style={[styles.inputWrapper, !!errors.prenom && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: Aminata"
                      placeholderTextColor="#A89684"
                      style={styles.input}
                      accessibilityLabel="Prénom"
                    />
                  </View>
                  {errors.prenom && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.prenom.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Nom */}
            <Controller
              control={control}
              name="nom"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nom</Text>
                  <View style={[styles.inputWrapper, !!errors.nom && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: Diallo"
                      placeholderTextColor="#A89684"
                      style={styles.input}
                      accessibilityLabel="Nom"
                    />
                  </View>
                  {errors.nom && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.nom.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Téléphone */}
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Téléphone</Text>
                  <View style={[styles.inputWrapper, !!errors.telephone && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: 0702000001"
                      placeholderTextColor="#A89684"
                      keyboardType="phone-pad"
                      style={styles.input}
                      accessibilityLabel="Numéro de téléphone"
                    />
                  </View>
                  {errors.telephone && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.telephone.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Ville / Localisation */}
            <Controller
              control={control}
              name="localisation"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Ville / Quartier</Text>
                  <View style={[styles.inputWrapper, !!errors.localisation && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: Dakar, Plateau"
                      placeholderTextColor="#A89684"
                      style={styles.input}
                      accessibilityLabel="Ville ou quartier"
                    />
                  </View>
                  {errors.localisation && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.localisation.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Mot de passe */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mot de passe</Text>
                  <View style={[styles.inputWrapper, !!errors.password && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
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
                    >
                      {showPassword ? <EyeOff size={18} color="#7A6A58" /> : <Eye size={18} color="#7A6A58" />}
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.password.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Confirmation mot de passe */}
            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
                  <View style={[styles.inputWrapper, !!errors.confirm && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      placeholderTextColor="#A89684"
                      secureTextEntry={!showConfirm}
                      style={[styles.input, { paddingRight: 44 }]}
                      accessibilityLabel="Confirmer le mot de passe"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirm(!showConfirm)}
                      activeOpacity={0.7}
                    >
                      {showConfirm ? <EyeOff size={18} color="#7A6A58" /> : <Eye size={18} color="#7A6A58" />}
                    </TouchableOpacity>
                  </View>
                  {errors.confirm && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.confirm.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Erreur serveur */}
            {error ? (
              <View style={styles.errorRowGlobal}>
                <AlertCircle size={15} color="#9E2A2B" />
                <Text style={styles.errorTextGlobal}>{error}</Text>
              </View>
            ) : null}

            {/* Bouton Créer mon compte */}
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? 'Création du compte en cours' : 'Créer mon compte'}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>

            {/* Liens bas */}
            <View style={styles.linksBlock}>
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Déjà un compte ? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.registerLinkBold}>Se connecter</Text>
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
    paddingTop: 48,
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
    marginBottom: 28,
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
    marginBottom: 24,
  },
  surtitre: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.8,
    lineHeight: 38,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A6A58',
    lineHeight: 20,
  },

  // ── Formulaire ──
  form: {
    gap: 16,
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

  // ── Bouton Principal ──
  primaryBtn: {
    height: 52,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
})
