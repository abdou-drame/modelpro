import Component, { useEffect } from 'react'
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
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

// ── Global Error Boundary to prevent Blank Page ──────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Caught React render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    } else {
      router.replace('/')
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oups ! Une erreur est survenue</Text>
          <Text style={styles.errorSub}>
            {this.state.error?.message ?? "Une erreur inattendue s'est produite."}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={this.handleReset}>
            <Text style={styles.resetBtnText}>Recharger l'application</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}

function AuthGuard() {
  const { isAuthenticated, isInitialized, user, loadFromStorage } = useAuthStore()
  const segments = useSegments()

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    if (isAuthenticated) registerFcmToken()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isInitialized) return

    const inAuthGroup = segments[0] === '(auth)'
    const inArtisanGroup = segments[0] === '(artisan)'
    const inClientGroup = segments[0] === '(client)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)')
    } else if (isAuthenticated) {
      if (inAuthGroup) {
        if (user?.role === 'artisan') {
          router.replace('/(artisan)/dashboard')
        } else {
          router.replace('/(client)')
        }
      } else if (user?.role === 'artisan' && inClientGroup) {
        router.replace('/(artisan)/dashboard')
      } else if (user?.role === 'client' && inArtisanGroup) {
        router.replace('/(client)')
      }
    }
  }, [isInitialized, isAuthenticated, segments, user])

  return null
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
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
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(client)" options={{ animation: 'none' }} />
          <Stack.Screen name="(artisan)" options={{ animation: 'none' }} />
        </Stack>
      </QueryClientProvider>
    </RootErrorBoundary>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: '#FAF7F2', gap: 16,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#1F1916', textAlign: 'center' },
  errorSub: { fontSize: 14, color: '#70665F', textAlign: 'center', lineHeight: 20 },
  resetBtn: {
    backgroundColor: '#8B4513', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 8,
  },
  resetBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})
