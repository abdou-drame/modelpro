import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { OrderStatus, PaymentStatus } from '@/constants/enums'

export interface Order {
  id: number
  statut: OrderStatus
  statutPaiement: PaymentStatus
  description: string | null
  mesures: string | null
  prixTotal: number | null
  acompte: number | null
  dateLivraisonEstimee: string | null
  createdAt: string
  updatedAt: string
  artisan: {
    id: number
    atelier: string
    métier: string
    noteMoyenne: number | null
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
  creation: { id: number; titre: string; photoUrl: string | null } | null
}

interface OrderRaw {
  id: number
  statut: OrderStatus
  paymentStatus: PaymentStatus
  consignes: string | null
  mesures: string | null
  totalPrice: number | null
  depositAmount: number | null
  deliveryDate: string | null
  createdAt: string
  updatedAt: string
  artisan: {
    id: number
    atelier: string
    métier: string
    photosAtelier: string | null
    user: { nom: string; prenom: string; photoUrl: string | null }
  } | null
  creation?: { id: number; titre: string; photoUrl: string | null } | null
}

function normalizeOrder(raw: OrderRaw): Order {
  return {
    id: raw.id,
    statut: raw.statut,
    statutPaiement: raw.paymentStatus ?? 'unpaid',
    description: raw.consignes,
    mesures: raw.mesures,
    prixTotal: raw.totalPrice,
    acompte: raw.depositAmount,
    dateLivraisonEstimee: raw.deliveryDate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    artisan: {
      id: raw.artisan?.id ?? 0,
      atelier: raw.artisan?.atelier ?? '',
      métier: raw.artisan?.métier ?? '',
      noteMoyenne: null,
      photoProfil: raw.artisan?.user?.photoUrl ?? null,
      user: { nom: raw.artisan?.user?.nom ?? '', prenom: raw.artisan?.user?.prenom ?? '' },
    },
    creation: raw.creation ?? null,
  }
}

export interface CreateOrderPayload {
  artisanId: number
  creationId?: number
  description?: string
  mesures?: string
}

export const ordersApi = {
  create: async (data: CreateOrderPayload) => {
    const r = await apiClient.post<OrderRaw>(ENDPOINTS.orders, {
      artisanId: data.artisanId,
      modeleId: data.creationId,
      consignes: data.description,
      mesures: data.mesures,
    })
    return { data: normalizeOrder(r.data) }
  },

  myOrders: async () => {
    const r = await apiClient.get<OrderRaw[]>(ENDPOINTS.myOrders)
    const raw = Array.isArray(r.data) ? r.data : []
    return { data: raw.map(normalizeOrder) }
  },

  cancel: (id: number) =>
    apiClient.patch(ENDPOINTS.cancelOrder(id)),
}
