import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface UserProfile {
  id: number
  nom: string
  prenom: string
  telephone: string
  email: string | null
  role: 'client' | 'artisan' | 'admin'
  statut: 'actif' | 'suspendu'
  photoUrl: string | null
}

export interface UpdateUserPayload {
  nom?: string
  prenom?: string
  telephone?: string
  email?: string
  photoUrl?: string
  localisation?: string
}

export const userApi = {
  me: () =>
    apiClient.get<UserProfile>(ENDPOINTS.me),

  update: (data: UpdateUserPayload) =>
    apiClient.put<UserProfile>(ENDPOINTS.me, data),
}
