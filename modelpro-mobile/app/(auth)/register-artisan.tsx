import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import { metiersApi } from '@/lib/api/metiers'
import { useAuthStore } from '@/lib/store/authStore'

const schema = z
  .object({
    nom: z.string().min(2, 'Nom requis'),
    prenom: z.string().min(2, 'Prénom requis'),
    telephone: z.string().min(9, 'Numéro invalide'),
    password: z.string().min(6, 'Minimum 6 caractères'),
    confirm: z.string(),
    nomAtelier: z.string().min(2, 'Nom de l\'atelier requis'),
    localisation: z.string().min(2, 'Localisation requise'),
    metierId: z.number({ required_error: 'Choisissez un métier' }),
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
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
        nomAtelier: data.nomAtelier,
        localisation: data.localisation,
        metierIdI: data.metierId,
      })
      await setAuth(res.data.user as any, res.data.token)
      router.replace('/(artisan)/dashboard')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#F7F4EF' }}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 }}>
          Rejoindre en tant qu'artisan
        </Text>
        <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 32 }}>
          Créez votre vitrine sur ModèlePro
        </Text>

        {/* Champs texte */}
        {[
          { name: 'nom' as const, label: 'Nom', placeholder: 'Diallo' },
          { name: 'prenom' as const, label: 'Prénom', placeholder: 'Fatou' },
          { name: 'telephone' as const, label: 'Téléphone', placeholder: '77 000 00 00', keyboard: 'phone-pad' as const },
          { name: 'nomAtelier' as const, label: 'Nom de l\'atelier', placeholder: 'Atelier Diallo Couture' },
          { name: 'localisation' as const, label: 'Localisation', placeholder: 'Dakar, Médina' },
          { name: 'password' as const, label: 'Mot de passe', placeholder: '••••••••', secure: true },
          { name: 'confirm' as const, label: 'Confirmer le mot de passe', placeholder: '••••••••', secure: true },
        ].map((field) => (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: { onChange, value } }) => (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginBottom: 6 }}>
                  {field.label}
                </Text>
                <TextInput
                  value={value as string}
                  onChangeText={onChange}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboard ?? 'default'}
                  secureTextEntry={field.secure}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: errors[field.name] ? '#C1121F' : '#E5E7EB',
                  }}
                />
                {errors[field.name] && (
                  <Text style={{ color: '#C1121F', fontSize: 12, marginTop: 4 }}>
                    {errors[field.name]?.message}
                  </Text>
                )}
              </View>
            )}
          />
        ))}

        {/* Sélecteur de métier */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginBottom: 6 }}>
            Métier
          </Text>
          <TouchableOpacity
            onPress={() => setMetierOpen(!metierOpen)}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: errors.metierId ? '#C1121F' : '#E5E7EB',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: selectedMetier ? '#1A1A2E' : '#9CA3AF' }}>
              {loadingMetiers ? 'Chargement...' : selectedMetier?.nom ?? 'Choisissez votre métier'}
            </Text>
            <Text style={{ color: '#6B7280' }}>{metierOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.metierId && (
            <Text style={{ color: '#C1121F', fontSize: 12, marginTop: 4 }}>
              {errors.metierId.message}
            </Text>
          )}

          {metierOpen && metiers && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginTop: 4,
                maxHeight: 200,
              }}
            >
              <FlatList
                data={metiers.filter((m) => m.actif)}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setValue('metierId', item.id, { shouldValidate: true })
                      setMetierOpen(false)
                    }}
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                      backgroundColor: selectedMetierId === item.id ? '#FEF3E8' : '#fff',
                    }}
                  >
                    <Text style={{ fontSize: 15, color: '#1A1A2E' }}>{item.nom}</Text>
                  </TouchableOpacity>
                )}
                nestedScrollEnabled
              />
            </View>
          )}
        </View>

        {error ? (
          <Text style={{ color: '#C1121F', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#C9762B',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginBottom: 24,
            marginTop: 8,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Créer mon profil artisan
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingBottom: 32 }}>
          <Text style={{ color: '#6B7280' }}>Déjà un compte ?</Text>
          <Link href="/(auth)/login" style={{ color: '#C9762B', fontWeight: '600' }}>
            Se connecter
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
