import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface CreateReviewPayload {
  artisanId: number
  noteQualite: number
  noteDelai: number
  noteCommunication: number
  notePrix: number
  noteProfessionnalisme: number
  commentaire?: string
}

export interface Review {
  id: number
  noteQualite: number
  noteDelai: number
  noteCommunication: number
  notePrix: number
  noteProfessionnalisme: number
  noteMoyenne: number
  commentaire: string | null
  createdAt: string
  client: {
    id: number
    user: { nom: string; prenom: string; photoUrl: string | null }
  }
}

export const reviewsApi = {
  create: (data: CreateReviewPayload) =>
    apiClient.post<Review>(ENDPOINTS.reviews, data),

  byArtisan: (artisanId: number) =>
    apiClient.get<Review[]>(ENDPOINTS.artisanReviews(artisanId)),
}
