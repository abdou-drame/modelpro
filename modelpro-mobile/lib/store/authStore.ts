import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface User {
  id: number
  nom: string
  prenom: string
  telephone: string
  role: 'client' | 'artisan' | 'admin'
  photoUrl: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => Promise<void>
  clearAuth: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('jwt', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('jwt')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('jwt')
    const userStr = await SecureStore.getItemAsync('user')
    if (token && userStr) {
      set({ user: JSON.parse(userStr), token, isAuthenticated: true })
    }
  },
}))
