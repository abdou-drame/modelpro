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
    atelier: string
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
  client: {
    id: number
    photoProfil: string | null
    nom: string
    prenom: string
  }
  dernierMessage: {
    contenu: string | null
    photoUrl: string | null
    createdAt: string
    expediteurId: number
  } | null
  nonLus: number
}

function normalizeConversations(raw: any[]): Conversation[] {
  return raw.map((item) => {
    const order = item.order ?? item
    const lastMsg = item.lastMessage ?? item.dernierMessage ?? null
    return {
      orderId: item.orderId ?? order.id,
      artisan: {
        id: order.artisan?.id ?? 0,
        atelier: order.artisan?.atelier ?? '',
        photoProfil: order.artisan?.photoProfil ?? null,
        user: order.artisan?.user ?? { nom: '', prenom: '' },
      },
      client: {
        id: order.client?.id ?? 0,
        photoProfil: order.client?.photoUrl ?? null,
        nom: order.client?.nom ?? '',
        prenom: order.client?.prenom ?? '',
      },
      dernierMessage: lastMsg
        ? {
            contenu: lastMsg.contenu ?? null,
            photoUrl: lastMsg.photoUrl ?? null,
            createdAt: lastMsg.createdAt,
            expediteurId: lastMsg.senderId ?? lastMsg.expediteurId ?? 0,
          }
        : null,
      nonLus: 0,
    }
  })
}

export const messagesApi = {
  conversations: () =>
    apiClient.get<any[]>(ENDPOINTS.conversations).then((r) => ({
      ...r,
      data: normalizeConversations(r.data),
    })) as any,

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
