import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key)
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return }
    return SecureStore.setItemAsync(key, value)
  },
  async delete(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return }
    return SecureStore.deleteItemAsync(key)
  },
}

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
    await storage.set('jwt', token)
    await storage.set('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: async () => {
    await storage.delete('jwt')
    await storage.delete('user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  loadFromStorage: async () => {
    const token = await storage.get('jwt')
    const userStr = await storage.get('user')
    if (token && userStr) {
      set({ user: JSON.parse(userStr), token, isAuthenticated: true })
    }
  },
}))
