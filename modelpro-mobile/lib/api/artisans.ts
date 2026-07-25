import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface ArtisanPublic {
  id: number
  nomAtelier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photoProfil: string | null
  photosAtelier: string[]
  notemoyenne: number
  nombreAvis: number
  estValide: boolean
  metier: { id: number; nom: string }
  user: { nom: string; prenom: string }
}

export interface ArtisanReview {
  id: number
  noteGlobale: number
  noteQualite: number
  noteDelai: number
  noteCommunication: number
  notePrix: number
  noteProfessionnalisme: number
  commentaire: string | null
  createdAt: string
  client: { user: { nom: string; prenom: string }; photoProfil: string | null }
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
    apiClient.get<ArtisanPublic>(ENDPOINTS.artisanById(id)),

  getReviews: (id: number) =>
    apiClient.get<ArtisanReview[]>(ENDPOINTS.artisanReviews(id)),
}
