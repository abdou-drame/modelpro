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
  const artisanProfile = raw.order?.artisan ?? null
  const clientRaw = raw.order?.client ?? null
  return {
    orderId: raw.orderId,
    artisan: {
      id: artisanProfile?.id ?? 0,
      nomAtelier: artisanProfile?.atelier ?? '',
      photoProfil: artisanProfile?.user?.photoUrl ?? null,
      user: {
        nom: artisanProfile?.user?.nom ?? '',
        prenom: artisanProfile?.user?.prenom ?? '',
      },
    },
    client: {
      id: clientRaw?.id ?? 0,
      photoProfil: clientRaw?.photoUrl ?? null,
      user: {
        nom: clientRaw?.nom ?? '',
        prenom: clientRaw?.prenom ?? '',
      },
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
  conversations: async () => {
    const r = await apiClient.get<ConversationRaw[]>(ENDPOINTS.conversations)
    const raw = Array.isArray(r.data) ? r.data : []
    return { data: raw.map(normalizeConversation) }
  },

  orderMessages: (orderId: number) =>
    apiClient.get<Message[]>(ENDPOINTS.orderMessages(orderId)),

  send: (orderId: number, texte?: string, photo?: { uri: string; name: string; type: string }) => {
    if (photo) {
      const form = new FormData()
      form.append('orderId', String(orderId))
      if (texte) form.append('texte', texte)
      form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as any)
      // Ne pas forcer Content-Type — laisser axios/browser gérer la boundary
      return apiClient.post<Message>(ENDPOINTS.messages, form)
    }
    return apiClient.post<Message>(ENDPOINTS.messages, { orderId, texte })
  },

  markRead: (id: number) =>
    apiClient.patch(ENDPOINTS.markMessageRead(id)),
}
