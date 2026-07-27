import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface ArtisanPublic {
  id: number
  atelier: string
  métier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photoProfil: string | null
  photosAtelier: string[]
  noteMoyenne: number
  nombreAvis: number
  statutValidation: string
  user: { nom: string; prenom: string }
}

export interface ArtisanReview {
  id: number
  note: number
  noteQualite: number | null
  noteDelai: number | null
  noteCommunication: number | null
  notePrix: number | null
  noteProfessionnalisme: number | null
  commentaire: string | null
  createdAt: string
  client: { id: number; nom: string; prenom: string; photoUrl: string | null }
}

export interface ArtisanSearchParams {
  metier?: string
  atelier?: string
  localisation?: string
  zone?: string
  page?: number
  limit?: number
}

export const artisansApi = {
  search: (params?: ArtisanSearchParams) =>
    apiClient.get<{ artisans: ArtisanPublic[]; total: number; page: number }>(
      ENDPOINTS.artisansSearch,
      { params }
    ),

  getById: (id: number) =>
    apiClient.get<ArtisanPublic>(ENDPOINTS.artisanById(id)).then((r) => {
      const p = r.data as any
      if (typeof p.photosAtelier === 'string') {
        try { p.photosAtelier = JSON.parse(p.photosAtelier) } catch { p.photosAtelier = [] }
      }
      if (!Array.isArray(p.photosAtelier)) p.photosAtelier = []
      return r
    }),

  getReviews: (id: number) =>
    apiClient.get<ArtisanReview[]>(ENDPOINTS.artisanReviews(id)),
}
