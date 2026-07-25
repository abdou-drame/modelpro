import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface Message {
  id: number
  contenu: string | null
  photoUrl: string | null
  lu: boolean
  createdAt: string
  expediteur: {
    id: number
    nom: string
    prenom: string
    role: string
    photoUrl: string | null
  }
  orderId: number
}

export interface Conversation {
  orderId: number
  artisan: {
    id: number
    nomAtelier: string
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
  client: {
    id: number
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
  dernierMessage: {
    contenu: string | null
    photoUrl: string | null
    createdAt: string
    expediteurId: number
  } | null
  nonLus: number
}

export const messagesApi = {
  conversations: () =>
    apiClient.get<Conversation[]>(ENDPOINTS.conversations),

  orderMessages: (orderId: number) =>
    apiClient.get<Message[]>(ENDPOINTS.orderMessages(orderId)),

  send: (orderId: number, contenu?: string, photo?: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    form.append('orderId', String(orderId))
    if (contenu) form.append('contenu', contenu)
    if (photo) form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as any)
    return apiClient.post<Message>(ENDPOINTS.messages, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  markRead: (id: number) =>
    apiClient.patch(ENDPOINTS.markMessageRead(id)),
}
