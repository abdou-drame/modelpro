export const ORDER_STATUSES = [
  'en_attente',
  'acceptee',
  'en_cours',
  'en_finition',
  'prete',
  'livree',
  'annulee',
] as const

export const PAYMENT_STATUSES = ['unpaid', 'deposit_paid', 'fully_paid'] as const

export const PAYMENT_TYPES = [
  'acompte',
  'solde',
  'integral',
  'frais_service',
  'abonnement',
] as const

export const PAYMENT_METHODS = [
  'wave',
  'orange_money',
  'free_money',
  'especes',
] as const

export const APPOINTMENT_TYPES = [
  'prise_mesures',
  'consultation',
  'depot_article',
  'essayage',
  'retrait',
  'domicile',
] as const

export const APPOINTMENT_STATUSES = [
  'demande',
  'accepte',
  'refuse',
  'reporte',
  'annule',
  'termine',
  'pending',
  'confirme',
] as const

export const NOTIFICATION_TYPES = [
  'nouveau_message',
  'demande_rdv',
  'rdv_statut',
  'commande_statut',
  'rappel',
  'notation',
  'paiement',
] as const

export const USER_ROLES = ['client', 'artisan', 'admin'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
export type PaymentType = (typeof PAYMENT_TYPES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
export type UserRole = (typeof USER_ROLES)[number]
