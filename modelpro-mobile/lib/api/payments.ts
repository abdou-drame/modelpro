import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import type { PaymentType, PaymentMethod } from '@/constants/enums'

export interface Payment {
  id: number
  orderId: number | null
  artisanId: number | null
  montant: number
  type: PaymentType
  moyen: PaymentMethod
  statut: 'en_attente' | 'confirme' | 'echoue' | 'rembourse'
  referenceTransaction: string | null
  createdAt: string
  // Présent uniquement pour un abonnement payé par mobile money : URL PayTech à ouvrir
  // pour finaliser le paiement (le statut ne passe à 'confirme' qu'après l'IPN).
  redirectUrl?: string
}

export interface PaymentSummary {
  totalPrice: number
  depositAmount: number
  totalAcomptePaid: number
  totalSoldePaid: number
  totalFraisServicePaid: number
  totalOrderPaid: number
  remainingBalance: number
  paymentStatus: string
}

export interface CreatePaymentPayload {
  orderId?: number
  artisanId?: number
  // Requis pour les paiements de type 'acompte' | 'solde' | 'integral' | 'frais_service'.
  // Pour 'abonnement', le montant est calculé côté serveur à partir de packId + cycle.
  montant?: number
  type: PaymentType
  moyen: PaymentMethod
  referenceTransaction?: string
  statut?: 'en_attente' | 'confirme'
  packId?: number
  cycle?: 'mensuel' | 'annuel'
}

export interface Subscription {
  id: number
  montant: number
  moyen: PaymentMethod
  statut: string
  dateDebut: string
  dateFin: string | null
  createdAt: string
}

export interface Pack {
  id: number
  code: 'essentiel' | 'pro' | 'business'
  nom: string
  prixMensuel: number
  prixAnnuel: number
  limiteModelesActifs: number | null
  actif: boolean
}

export interface SubscriptionResponse {
  statutAbonnement: 'inactif' | 'essai' | 'actif' | 'expire'
  dateFinAbonnement: string | null
  pack: Pack | null
  subscriptions: Subscription[]
}

export const paymentsApi = {
  create: (data: CreatePaymentPayload) =>
    apiClient.post<Payment>(ENDPOINTS.payments, data),

  orderPayments: (orderId: number) =>
    apiClient.get<Payment[]>(ENDPOINTS.orderPayments(orderId)),

  summary: (orderId: number) =>
    apiClient.get<PaymentSummary>(ENDPOINTS.paymentSummary(orderId)),

  mySubscription: () =>
    apiClient.get<SubscriptionResponse>(ENDPOINTS.mySubscription),

  updateStatus: (id: number, statut: 'confirme' | 'echoue' | 'rembourse') =>
    apiClient.patch(ENDPOINTS.paymentStatus(id), { statut }),
}

export const packsApi = {
  list: () => apiClient.get<Pack[]>(ENDPOINTS.packs),
}
