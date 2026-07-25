import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface Message {
  id: number
  texte: string | null
  photoUrl: string | null
  lu: boolean
  createdAt: string
  sender: {
    id: number
    nom: string
    prenom: string
    role: string
    photoUrl: string | null
  }
  orderId: number
}

// Shape retournée par le backend : { orderId, order: { artisan, client }, lastMessage }
export interface ConversationRaw {
  orderId: number
  order: {
    id: number
    artisan: {
      id: number
      atelier: string
      photoProfil: string | null
      user: { id: number; nom: string; prenom: string; photoUrl: string | null }
    }
    client: {
      id: number
      photoUrl: string | null
      nom: string
      prenom: string
    }
  }
  lastMessage: {
    texte: string | null
    photoUrl: string | null
    createdAt: string
    senderId: number
  } | null
}

// Shape normalisée pour les composants UI
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
    texte: string | null
    photoUrl: string | null
    createdAt: string
    expediteurId: number
  } | null
  nonLus: number
}

function normalizeConversation(raw: ConversationRaw): Conversation {
  const artisan = raw.order?.artisan
  const client = raw.order?.client
  return {
    orderId: raw.orderId,
    artisan: {
      id: artisan?.id ?? 0,
      nomAtelier: artisan?.atelier ?? '',
      photoProfil: artisan?.user?.photoUrl ?? null,
      user: { nom: artisan?.user?.nom ?? '', prenom: artisan?.user?.prenom ?? '' },
    },
    client: {
      id: client?.id ?? 0,
      photoProfil: client?.photoUrl ?? null,
      user: { nom: client?.nom ?? '', prenom: client?.prenom ?? '' },
    },
    dernierMessage: raw.lastMessage
      ? {
          texte: raw.lastMessage.texte,
          photoUrl: raw.lastMessage.photoUrl,
          createdAt: raw.lastMessage.createdAt,
          expediteurId: raw.lastMessage.senderId,
        }
      : null,
    nonLus: 0,
  }
}

export const messagesApi = {
  conversations: () =>
    apiClient.get<ConversationRaw[]>(ENDPOINTS.conversations)
      .then((r) => ({ ...r, data: r.data.map(normalizeConversation) })),

  orderMessages: (orderId: number) =>
    apiClient.get<Message[]>(ENDPOINTS.orderMessages(orderId)),

  send: (orderId: number, texte?: string, photo?: { uri: string; name: string; type: string }) => {
    const form = new FormData()
    form.append('orderId', String(orderId))
    if (texte) form.append('texte', texte)
    if (photo) form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as any)
    return apiClient.post<Message>(ENDPOINTS.messages, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  markRead: (id: number) =>
    apiClient.patch(ENDPOINTS.markMessageRead(id)),
}
