import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { OrderStatus, PaymentStatus } from '@/constants/enums'

export const formatPrice = (amount: number): string =>
  `${new Intl.NumberFormat('fr-SN').format(amount)} FCFA`

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy', { locale: fr })
}

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy à HH:mm', { locale: fr })
}

export const formatRelative = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  const d = new Date(date)
  return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true, locale: fr })
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  en_cours: 'En cours',
  en_finition: 'En finition',
  prete: 'Prête',
  livree: 'Livrée',
  annulee: 'Annulée',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Non payé',
  deposit_paid: 'Acompte versé',
  fully_paid: 'Payé',
}

export const getOrderStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    en_attente: '#C9762B',
    acceptee: '#2563EB',
    en_cours: '#7C3AED',
    en_finition: '#D97706',
    prete: '#059669',
    livree: '#2D6A4F',
    annulee: '#C1121F',
  }
  return colors[status]
}

export const getMontantPaye = (order?: {
  statutPaiement?: PaymentStatus | string | null
  paymentStatus?: PaymentStatus | string | null
  prixTotal?: number | null
  totalPrice?: number | null
  prix?: number | null
  acompte?: number | null
  depositAmount?: number | null
} | null): number => {
  if (!order) return 0
  const status = order.statutPaiement || order.paymentStatus || 'unpaid'
  const total = order.prixTotal ?? order.totalPrice ?? order.prix ?? 0
  const deposit = order.acompte ?? order.depositAmount ?? 0

  if (status === 'unpaid') {
    return 0
  }
  if (status === 'fully_paid') {
    return total
  }
  if (status === 'deposit_paid') {
    return deposit || Math.round(total * 0.5)
  }
  if (order.acompte && order.acompte > 0) {
    return order.acompte
  }
  return 0
}

export const API_SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:5000'

export const getImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_SERVER_URL}${cleanPath}`
}

