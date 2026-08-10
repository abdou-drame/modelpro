import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'

export interface WalletTransaction {
  id: number
  artisanId: number
  orderId: number | null
  paymentId: number | null
  type: 'credit' | 'retrait'
  montant: number
  statut: 'valide' | 'en_attente' | 'rejete'
  moyenPaiement: 'wave' | 'orange_money' | null
  numeroReception: string | null
  commentaireAdmin: string | null
  traiteAt: string | null
  createdAt: string
}

export interface WalletResponse {
  solde: number
  transactions: WalletTransaction[]
}

export interface RequestWithdrawalPayload {
  montant: number
  moyenPaiement: 'wave' | 'orange_money'
}

export const walletApi = {
  getMyWallet: () =>
    apiClient.get<WalletResponse>(ENDPOINTS.artisanWallet),

  requestWithdrawal: (data: RequestWithdrawalPayload) =>
    apiClient.post<WalletTransaction>(ENDPOINTS.artisanWalletWithdraw, data),
}
