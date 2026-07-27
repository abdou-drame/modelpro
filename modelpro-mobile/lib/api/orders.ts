import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { OrderStatus, PaymentStatus } from '@/constants/enums'

export interface Order {
  id: number
  statut: OrderStatus
  statutPaiement: PaymentStatus
  description: string | null
  mesures: Record<string, string> | null
  options: string[]
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

export interface CreateOrderPayload {
  artisanId: number
  creationId?: number
  description?: string
  mesures?: Record<string, string>
  options?: string[]
}

export const ordersApi = {
  create: (data: CreateOrderPayload) =>
    apiClient.post<Order>(ENDPOINTS.orders, data),

  myOrders: () =>
    apiClient.get<Order[]>(ENDPOINTS.myOrders),

  cancel: (id: number) =>
    apiClient.patch(ENDPOINTS.cancelOrder(id)),
}
