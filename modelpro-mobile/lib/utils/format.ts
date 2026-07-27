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
  if (!date) return '—'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true, locale: fr })
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
