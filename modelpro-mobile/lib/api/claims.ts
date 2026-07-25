import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface CreateClaimPayload {
  orderId: number
  sujet: string
  description: string
  photoPreuve?: string
}

export interface Claim {
  id: number
  sujet: string
  description: string
  statut: 'en_attente' | 'en_cours' | 'resolu' | 'rejete'
  photoPreuve: string | null
  createdAt: string
  order: {
    id: number
    artisan: { nomAtelier: string }
  }
}

export const claimsApi = {
  create: (data: CreateClaimPayload) =>
    apiClient.post<Claim>(ENDPOINTS.claims, data),

  myClaims: () =>
    apiClient.get<Claim[]>(ENDPOINTS.myClaims),
}
