import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface Model {
  id: number
  titre: string
  description: string | null
  prixEstimatif: number | null
  photoUrl: string | null
  photos: string[]
  options: string[]
  disponible: boolean
  artisan: {
    id: number
    nomAtelier: string
    notemoyenne: number
    user: { nom: string; prenom: string }
    metier: { nom: string }
  }
}

export interface ModelListParams {
  search?: string
  metierId?: number
  artisanId?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

export const modelsApi = {
  list: (params?: ModelListParams) =>
    apiClient.get<{ models: Model[]; total: number; page: number; totalPages: number }>(
      ENDPOINTS.models,
      { params }
    ),

  getById: (id: number) =>
    apiClient.get<Model>(ENDPOINTS.modelById(id)),
}
