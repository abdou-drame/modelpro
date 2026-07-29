import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/lib/store/authStore'
import { colors } from '@/constants/theme'

export default function RootIndex() {
  const { isAuthenticated, isInitialized, user, loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    if (!isAuthenticated) {
      router.replace('/(auth)/login')
    } else if (user?.role === 'artisan') {
      router.replace('/(artisan)/dashboard')
    } else {
      router.replace('/(client)')
    }
  }, [isInitialized, isAuthenticated, user])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary ?? '#8B4513'} />
      <Text style={styles.text}>Chargement ModèlePro...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    gap: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B4513',
  },
})
