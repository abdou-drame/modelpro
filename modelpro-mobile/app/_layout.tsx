import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/authStore'
import { registerFcmToken } from '@/lib/utils/fcm'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
})

function AuthGuard() {
  const { isAuthenticated, user, loadFromStorage } = useAuthStore()
  const segments = useSegments()

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    if (isAuthenticated) registerFcmToken()
  }, [isAuthenticated])

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.role === 'artisan') {
        router.replace('/(artisan)/dashboard')
      } else {
        router.replace('/(client)')
      }
    }
  }, [isAuthenticated, segments])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: '#FAF7F2' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(client)" options={{ animation: 'none' }} />
        <Stack.Screen name="(artisan)" options={{ animation: 'none' }} />
      </Stack>
    </QueryClientProvider>
  )
}
