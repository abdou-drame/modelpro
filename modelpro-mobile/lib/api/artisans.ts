import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

// Shape brute retournée par le backend
interface ArtisanPublicRaw {
  id: number
  atelier: string
  métier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photosAtelier: string | null // JSON string
  statutValidation: 'en_attente' | 'valide' | 'rejete'
  noteMoyenne: number
  nombreAvis: number
  user: { id: number; nom: string; prenom: string; photoUrl: string | null }
}

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

function normalizePublicArtisan(raw: ArtisanPublicRaw): ArtisanPublic {
  let photos: string[] = []
  if (raw.photosAtelier) {
    try { photos = JSON.parse(raw.photosAtelier) } catch { photos = [] }
  }
  return {
    id: raw.id,
    nomAtelier: raw.atelier ?? '',
    description: raw.description,
    localisation: raw.localisation,
    zone: raw.zone,
    photoProfil: raw.user?.photoUrl ?? null,
    photosAtelier: photos,
    notemoyenne: raw.noteMoyenne ?? 0,
    nombreAvis: raw.nombreAvis ?? 0,
    estValide: raw.statutValidation === 'valide',
    metier: { id: 0, nom: raw.métier ?? '' },
    user: { nom: raw.user?.nom ?? '', prenom: raw.user?.prenom ?? '' },
  }
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
    apiClient.get<ArtisanPublicRaw[]>(ENDPOINTS.artisansSearch, { params })
      .then((r) => ({
        ...r,
        data: { artisans: r.data.map(normalizePublicArtisan), total: r.data.length, page: 1 },
      })),

  getById: (id: number) =>
    apiClient.get<ArtisanPublicRaw>(ENDPOINTS.artisanById(id))
      .then((r) => ({ ...r, data: normalizePublicArtisan(r.data) })),

  getReviews: (id: number) =>
    apiClient.get<ArtisanReview[]>(ENDPOINTS.artisanReviews(id)),
}
