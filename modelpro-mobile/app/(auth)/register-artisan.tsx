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
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Eye, EyeOff, AlertCircle, Crown, ChevronDown, ChevronUp, Check } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { metiersApi } from '@/lib/api/metiers'
import { useAuthStore } from '@/lib/store/authStore'

const schema = z
  .object({
    nom: z.string().min(2, 'Nom requis'),
    prenom: z.string().min(2, 'Prénom requis'),
    telephone: z.string().min(9, 'Numéro invalide (min 9 chiffres)'),
    password: z.string().min(6, 'Mot de passe trop court (min 6 caractères)'),
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

export default function RegisterArtisanScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [metierOpen, setMetierOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: metiers } = useQuery({
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
        métier: selectedMetier?.nom ?? 'Couture',
      })
      await setAuth(res.data.user as any, res.data.token)
      router.replace('/(artisan)/dashboard')
    } catch (e: any) {
      if (!e.response) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
      } else {
        setError(e.response?.data?.error || "Erreur lors de l'inscription")
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
            <Text style={styles.surtitre}>ESPACE ARTISAN — INSCRIPTION</Text>
            <Text style={styles.mainTitle}>Ouvrez votre atelier</Text>
            <Text style={styles.subtitle}>
              Rejoignez la communauté des maîtres artisans et développez votre activité
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
                      placeholder="ex: Mamadou"
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
                      placeholder="ex: Sow"
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

            {/* Nom de l'atelier */}
            <Controller
              control={control}
              name="nomAtelier"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nom de l'atelier</Text>
                  <View style={[styles.inputWrapper, !!errors.nomAtelier && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: Atelier Excellence Couture"
                      placeholderTextColor="#A89684"
                      style={styles.input}
                      accessibilityLabel="Nom de l'atelier"
                    />
                  </View>
                  {errors.nomAtelier && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#9E2A2B" />
                      <Text style={styles.errorText}>{errors.nomAtelier.message}</Text>
                    </View>
                  )}
                </View>
              )}
            />

            {/* Sélecteur de Métier */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Spécialité / Métier</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, !!errors.metierId && styles.inputWrapperError, styles.selectWrapper]}
                onPress={() => setMetierOpen(!metierOpen)}
                activeOpacity={0.8}
              >
                <Text style={selectedMetier ? styles.selectTextSelected : styles.selectTextPlaceholder}>
                  {selectedMetier ? selectedMetier.nom : 'Sélectionner votre spécialité'}
                </Text>
                {metierOpen ? <ChevronUp size={18} color="#7A6A58" /> : <ChevronDown size={18} color="#7A6A58" />}
              </TouchableOpacity>

              {metierOpen && (
                <View style={styles.dropdownList}>
                  {metiers?.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.dropdownItem, selectedMetierId === m.id && styles.dropdownItemSelected]}
                      onPress={() => {
                        setValue('metierId', m.id, { shouldValidate: true })
                        setMetierOpen(false)
                      }}
                    >
                      <Text style={[styles.dropdownItemText, selectedMetierId === m.id && styles.dropdownItemTextSelected]}>
                        {m.nom}
                      </Text>
                      {selectedMetierId === m.id && <Check size={16} color="#C05A2B" strokeWidth={2.5} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {errors.metierId && (
                <View style={styles.errorRow}>
                  <AlertCircle size={14} color="#9E2A2B" />
                  <Text style={styles.errorText}>{errors.metierId.message}</Text>
                </View>
              )}
            </View>

            {/* Téléphone */}
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Téléphone professionnel</Text>
                  <View style={[styles.inputWrapper, !!errors.telephone && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: 0701000001"
                      placeholderTextColor="#A89684"
                      keyboardType="phone-pad"
                      style={styles.input}
                      accessibilityLabel="Téléphone professionnel"
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

            {/* Localisation */}
            <Controller
              control={control}
              name="localisation"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Localisation de l'atelier</Text>
                  <View style={[styles.inputWrapper, !!errors.localisation && styles.inputWrapperError]}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="ex: Dakar, Marché HLM"
                      placeholderTextColor="#A89684"
                      style={styles.input}
                      accessibilityLabel="Localisation de l'atelier"
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

            {/* Bouton Inscription Artisan */}
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? "Création de l'atelier en cours" : "Créer mon atelier"}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Créer mon atelier</Text>
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
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTextPlaceholder: {
    fontSize: 15,
    color: '#A89684',
  },
  selectTextSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1005',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D9',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  dropdownItemSelected: {
    backgroundColor: '#FAF8F5',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1005',
  },
  dropdownItemTextSelected: {
    fontWeight: '700',
    color: '#C05A2B',
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
