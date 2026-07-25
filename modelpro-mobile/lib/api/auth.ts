import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface RegisterPayload {
  telephone: string
  password: string
  nom: string
  prenom: string
  role: 'client' | 'artisan'
  metierIdI?: number
  nomAtelier?: string
  localisation?: string
}

export interface LoginPayload {
  telephone: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    nom: string
    prenom: string
    telephone: string
    role: string
    photoUrl: string | null
  }
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>(ENDPOINTS.register, data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>(ENDPOINTS.login, data),

  updateFcmToken: (fcmToken: string) =>
    apiClient.patch(ENDPOINTS.fcmToken, { fcmToken }),
}
