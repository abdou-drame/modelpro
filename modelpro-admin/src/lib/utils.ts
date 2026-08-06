import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function formatRelative(d: string | Date | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
  if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)} j`
  return formatDate(date)
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente', acceptee: 'Acceptée', en_cours: 'En cours',
  en_finition: 'En finition', prete: 'Prête', livree: 'Livrée', annulee: 'Annulée',
}

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente', en_cours: 'En cours', resolu: 'Résolu', rejete: 'Rejeté',
}

export const USER_STATUS_LABELS: Record<string, string> = {
  actif: 'Actif', suspendu: 'Suspendu', inactif: 'Inactif',
}

// Résout les URLs relatives /uploads/... en URL absolues vers le serveur backend.
// Passe les URLs déjà absolues (http/https) telles quelles.
const ADMIN_API_SERVER = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : 'http://localhost:5000'

export function getImgUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${ADMIN_API_SERVER}${cleanPath}`
}

// Parse photosAtelier depuis string JSON ou tableau, filtre les valeurs vides.
export function parsePhotosAtelier(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return (JSON.parse(raw) as string[]).filter(Boolean) } catch { return [] }
}
