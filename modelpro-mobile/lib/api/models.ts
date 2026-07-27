import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface Model {
  id: number
  titre: string
  description: string | null
  prixEstimatif: number | null
  photoUrl: string | null
  photos: string[]
  categorie: string | null
  delaiEstime: string | null
  artisan: {
    id: number
    nomAtelier: string
    notemoyenne: number
    user: { nom: string; prenom: string; photoUrl: string | null }
    metier: { nom: string }
  }
}

interface ModelRaw {
  id: number
  titre: string
  description: string | null
  prixEstimatif: number | null
  photoUrl: string | null
  photos: string | null
  categorie: string | null
  delaiEstime: string | null
  artisan: {
    id: number
    atelier: string
    métier: string
    noteMoyenne: number | null
    user?: { nom: string; prenom: string; photoUrl: string | null } | null
  } | null
}

function normalizeModel(raw: ModelRaw): Model {
  let photos: string[] = []
  if (raw.photos) {
    try { photos = JSON.parse(raw.photos) } catch { photos = [] }
  }
  return {
    id: raw.id,
    titre: raw.titre,
    description: raw.description,
    prixEstimatif: raw.prixEstimatif,
    photoUrl: raw.photoUrl,
    photos,
    categorie: raw.categorie,
    delaiEstime: raw.delaiEstime,
    artisan: {
      id: raw.artisan?.id ?? 0,
      nomAtelier: raw.artisan?.atelier ?? '',
      notemoyenne: raw.artisan?.noteMoyenne ?? 0,
      user: {
        nom: raw.artisan?.user?.nom ?? '',
        prenom: raw.artisan?.user?.prenom ?? '',
        photoUrl: raw.artisan?.user?.photoUrl ?? null,
      },
      metier: { nom: raw.artisan?.métier ?? '' },
    },
  }
}

export interface ModelListParams {
  search?: string
  metier?: string
  artisanId?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

interface ModelListRaw {
  models: ModelRaw[]
  total: number
  page: number
  totalPages: number
}

export const modelsApi = {
  list: async (params?: ModelListParams) => {
    const r = await apiClient.get<ModelListRaw>(ENDPOINTS.models, { params })
    const rows = Array.isArray(r.data?.models) ? r.data.models : []
    return {
      data: {
        models: rows.map(normalizeModel),
        total: r.data?.total ?? 0,
        page: r.data?.page ?? 1,
        totalPages: r.data?.totalPages ?? 1,
      }
    }
  },

  getById: async (id: number) => {
    const r = await apiClient.get<ModelRaw>(ENDPOINTS.modelById(id))
    return { data: normalizeModel(r.data) }
  },
}
