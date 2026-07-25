import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'

const schema = z.object({
  telephone: z.string().min(9, 'Numéro invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})

type FormData = z.infer<typeof schema>

export default function LoginScreen() {
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

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
      setError(e.response?.data?.error || 'Erreur de connexion')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#F7F4EF' }}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 }}>
          Connexion
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 40 }}>
          Bienvenue sur ModèlePro
        </Text>

        <Controller
          control={control}
          name="telephone"
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginBottom: 6 }}>
                Téléphone
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="77 000 00 00"
                keyboardType="phone-pad"
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: errors.telephone ? '#C1121F' : '#E5E7EB',
                }}
              />
              {errors.telephone && (
                <Text style={{ color: '#C1121F', fontSize: 12, marginTop: 4 }}>
                  {errors.telephone.message}
                </Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#1A1A2E', marginBottom: 6 }}>
                Mot de passe
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                secureTextEntry
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: errors.password ? '#C1121F' : '#E5E7EB',
                }}
              />
              {errors.password && (
                <Text style={{ color: '#C1121F', fontSize: 12, marginTop: 4 }}>
                  {errors.password.message}
                </Text>
              )}
            </View>
          )}
        />

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
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: '#6B7280' }}>Pas encore de compte ?</Text>
          <Link href="/(auth)/register-client" style={{ color: '#C9762B', fontWeight: '600' }}>
            S'inscrire
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
