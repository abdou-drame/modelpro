import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import apiClient from '../api/client'

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key) || sessionStorage.getItem(key)
    }
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
      sessionStorage.setItem(key, value)
      return
    }
    return SecureStore.setItemAsync(key, value)
  },
  async delete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      return
    }
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
  isInitialized: boolean
  setAuth: (user: User, token: string) => Promise<void>
  clearAuth: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: async (user, token) => {
    try {
      await storage.set('jwt', token)
      await storage.set('user', JSON.stringify(user))
    } catch (e) {
      console.warn('[AuthStore] Error saving to storage:', e)
    }
    set({ user, token, isAuthenticated: true, isInitialized: true })
  },

  clearAuth: async () => {
    try {
      await storage.delete('jwt')
      await storage.delete('user')
    } catch (e) {
      console.warn('[AuthStore] Error clearing storage:', e)
    }
    set({ user: null, token: null, isAuthenticated: false, isInitialized: true })
  },

  loadFromStorage: async () => {
    try {
      const token = await storage.get('jwt')
      const userStr = await storage.get('user')
      if (token && token !== 'undefined' && token !== 'null') {
        let cachedUser: User | null = null
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
          try { cachedUser = JSON.parse(userStr) } catch {}
        }

        if (cachedUser && cachedUser.id && cachedUser.role) {
          set({ user: cachedUser, token, isAuthenticated: true, isInitialized: true })
        }

        // Vérifier le profil auprès du serveur pour garantir le rôle et statut exacts
        try {
          const res = await apiClient.get<User>('/users/me')
          if (res.data && res.data.id && res.data.role) {
            await storage.set('user', JSON.stringify(res.data))
            set({ user: res.data, token, isAuthenticated: true, isInitialized: true })
            return
          }
        } catch (apiErr: any) {
          if (apiErr?.response?.status === 401) {
            await storage.delete('jwt')
            await storage.delete('user')
            set({ user: null, token: null, isAuthenticated: false, isInitialized: true })
            return
          }
        }

        if (cachedUser) return
      }
    } catch (e) {
      console.warn('[AuthStore] Error loading from storage:', e)
    }
    set({ user: null, token: null, isAuthenticated: false, isInitialized: true })
  },
}))
