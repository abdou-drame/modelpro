import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface Metier {
  id: number
  nom: string
  description: string | null
  actif: boolean
}

export const metiersApi = {
  list: () => apiClient.get<Metier[]>(ENDPOINTS.metiers),
}
