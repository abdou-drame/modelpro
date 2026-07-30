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
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { Eye, EyeOff, ArrowLeft, Scissors, ChevronDown, Check } from 'lucide-react-native'
import { authApi } from '@/lib/api/auth'
import { metiersApi } from '@/lib/api/metiers'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, radius, fontSize, fontFamily, shadow } from '@/constants/theme'

const DEFAULT_METIERS = [
  { id: 1, nom: 'Couture', actif: true },
  { id: 2, nom: 'Coiffure', actif: true },
  { id: 3, nom: 'Cordonnerie', actif: true },
  { id: 4, nom: 'Bijouterie', actif: true },
  { id: 5, nom: 'Maroquinerie', actif: true },
]

const schema = z
  .object({
    prenom: z.string().min(2, 'Prénom requis'),
    nom: z.string().min(2, 'Nom requis'),
    nomAtelier: z.string().min(2, 'Nom atelier requis'),
    metierId: z.number({ message: 'Choisissez un métier' }),
    telephone: z.string().min(9, 'Numéro invalide'),
    localisation: z.string().min(2, 'Localisation requise'),
    password: z.string().min(6, 'Min 6 caractères'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Mots de passe différents', path: ['confirm'] })

type FormData = z.infer<typeof schema>

export default function RegisterArtisanScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [metierOpen, setMetierOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { data: metiersData } = useQuery({
    queryKey: ['metiers'],
    queryFn: () => metiersApi.list().then((r) => r.data),
  })

  const metiers = metiersData?.length ? metiersData : DEFAULT_METIERS

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { prenom: '', nom: '', nomAtelier: '', telephone: '', localisation: '', password: '', confirm: '' },
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
      setError(e.response?.data?.error || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                <Scissors size={24} color={colors.accent} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>Ouvrir un atelier</Text>
              <Text style={styles.subtitle}>Rejoignez les maîtres artisans</Text>
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
                      <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Mamadou" placeholderTextColor={colors.textLight} style={[styles.input, errors.prenom && styles.inputError]} />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="nom"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Nom</Text>
                      <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Sow" placeholderTextColor={colors.textLight} style={[styles.input, errors.nom && styles.inputError]} />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="nomAtelier"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Nom de l'atelier</Text>
                    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Atelier Excellence" placeholderTextColor={colors.textLight} style={[styles.input, errors.nomAtelier && styles.inputError]} />
                  </View>
                )}
              />

              {/* Métier Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Spécialité</Text>
                <TouchableOpacity
                  style={[styles.selectBtn, errors.metierId && styles.inputError]}
                  onPress={() => setMetierOpen(!metierOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={selectedMetier ? styles.selectBtnTextActive : styles.selectBtnText}>
                    {selectedMetier?.nom ?? 'Choisir votre métier'}
                  </Text>
                  <ChevronDown size={20} color={colors.textMuted} strokeWidth={1.5} style={{ transform: [{ rotate: metierOpen ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {metierOpen && (
                  <Animated.View entering={FadeInDown.duration(150)} style={styles.dropdown}>
                    {metiers.filter(m => m.actif !== false).map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.dropdownItem, selectedMetierId === m.id && styles.dropdownItemActive]}
                        onPress={() => { setValue('metierId', m.id, { shouldValidate: true }); setMetierOpen(false) }}
                      >
                        <Text style={[styles.dropdownItemText, selectedMetierId === m.id && styles.dropdownItemTextActive]}>{m.nom}</Text>
                        {selectedMetierId === m.id && <Check size={18} color={colors.accent} strokeWidth={2} />}
                      </TouchableOpacity>
                    ))}
                  </Animated.View>
                )}
                {errors.metierId && <Text style={styles.errorText}>{errors.metierId.message}</Text>}
              </View>

              <Controller
                control={control}
                name="telephone"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="77 123 45 67" placeholderTextColor={colors.textLight} keyboardType="phone-pad" style={[styles.input, errors.telephone && styles.inputError]} />
                    {errors.telephone && <Text style={styles.errorText}>{errors.telephone.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="localisation"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Localisation atelier</Text>
                    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Dakar, Marché HLM" placeholderTextColor={colors.textLight} style={[styles.input, errors.localisation && styles.inputError]} />
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
                      <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="••••••••" placeholderTextColor={colors.textLight} secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput, errors.password && styles.inputError]} />
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
                    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="••••••••" placeholderTextColor={colors.textLight} secureTextEntry={!showPassword} style={[styles.input, errors.confirm && styles.inputError]} />
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
                {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Créer mon atelier</Text>}
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
  backBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  content: { flex: 1 },
  logoSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoMark: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted },

  form: { gap: spacing.lg, marginBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  input: { height: 52, backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, fontSize: fontSize.md, color: colors.text },
  inputError: { borderColor: colors.error },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 0, top: 0, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },

  selectBtn: { height: 52, backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectBtnText: { fontSize: fontSize.md, color: colors.textLight },
  selectBtnTextActive: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },

  dropdown: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs, overflow: 'hidden', ...shadow.md },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownItemActive: { backgroundColor: colors.bgMuted },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text },
  dropdownItemTextActive: { fontWeight: '600', color: colors.accent },

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
