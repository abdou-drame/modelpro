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
  artisan?: {
    id: number
    atelier: string
    métier: string
    noteMoyenne: number | null
    user?: { nom: string; prenom: string }
  } | null
}

export interface ModelListParams {
  search?: string
  metierId?: number
  artisanId?: number
  minPrice?: number
  maxPrice?: number
  localisation?: string
  page?: number
  limit?: number
}

function parseModel(m: any): Model {
  if (typeof m.photos === 'string') {
    try { m.photos = JSON.parse(m.photos) } catch { m.photos = [] }
  }
  if (!Array.isArray(m.photos)) m.photos = []
  if (typeof m.options === 'string') {
    try { m.options = JSON.parse(m.options) } catch { m.options = [] }
  }
  if (!Array.isArray(m.options)) m.options = []
  return m
}

export const modelsApi = {
  list: (params?: ModelListParams) =>
    apiClient.get<{ models: Model[]; total: number; page: number; totalPages: number }>(
      ENDPOINTS.models,
      { params }
    ).then((r) => {
      if (r.data?.models) r.data.models.forEach(parseModel)
      return r
    }),

  getById: (id: number) =>
    apiClient.get<Model>(ENDPOINTS.modelById(id)).then((r) => {
      parseModel(r.data)
      return r
    }),
}
