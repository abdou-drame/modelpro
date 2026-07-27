import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (telephone: string, password: string) =>
    api.post<{ token: string; user: AdminUser }>('/auth/login', { telephone, password }),
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export const statsApi = {
  get: () => api.get<AdminStats>('/admin/stats'),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: { search?: string; role?: string; statut?: string }) =>
    api.get<AdminUser[]>('/admin/users', { params }),
  setStatus: (id: number, statut: 'actif' | 'suspendu') =>
    api.patch(`/admin/users/${id}/status`, { statut }),
}

// ── Artisans ──────────────────────────────────────────────────────────────────
export const artisansAdminApi = {
  list: () => api.get<AdminArtisan[]>('/admin/artisans'),
  pending: () => api.get<AdminArtisan[]>('/admin/pending-artisans'),
  verify: (id: number) => api.patch(`/admin/artisans/${id}/verify`),
  reject: (id: number, motifRejet: string) =>
    api.patch(`/admin/artisans/${id}/reject`, { motifRejet }),
}

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersAdminApi = {
  list: () => api.get<AdminOrder[]>('/admin/orders'),
  overdue: () => api.get<AdminOrder[]>('/admin/orders/overdue'),
}

// ── Catalogue ─────────────────────────────────────────────────────────────────
export const modelsAdminApi = {
  list: () => api.get<AdminModel[]>('/admin/models'),
  delete: (id: number) => api.delete(`/admin/models/${id}`),
}

// ── Claims ────────────────────────────────────────────────────────────────────
export const claimsAdminApi = {
  list: () => api.get<AdminClaim[]>('/admin/claims'),
  setStatus: (id: number, statut: string) =>
    api.patch(`/admin/claims/${id}/status`, { statut }),
}

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsAdminApi = {
  list: () => api.get<AdminAppointment[]>('/admin/appointments'),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsAdminApi = {
  list: () => api.get<AdminPayment[]>('/admin/payments'),
}

// ── Métiers ───────────────────────────────────────────────────────────────────
export const metiersAdminApi = {
  list: () => api.get<Metier[]>('/metiers'),
  create: (data: { nom: string; description: string }) =>
    api.post<Metier>('/admin/metiers', data),
  update: (id: number, data: { nom: string; description: string }) =>
    api.put<Metier>(`/admin/metiers/${id}`, data),
  toggle: (id: number) => api.patch(`/admin/metiers/${id}/toggle`),
  delete: (id: number) => api.delete(`/admin/metiers/${id}`),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number
  totalArtisansActifs: number
  totalClients: number
  totalCommandes: number
  totalClaims: number
  chiffreAffairesTotal: number
}

export interface AdminUser {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string
  role: string
  statut: string
  photoUrl: string | null
  createdAt: string
}

export interface AdminArtisan {
  id: number
  userId: number
  nomAtelier: string
  metier: { id: number; nom: string }
  localisation: string | null
  noteMoyenne: number
  nombreAvis: number
  statutValidation: string
  statutAbonnement: string
  dateFinAbonnement: string | null
  estValide: boolean
  user: AdminUser
}

export interface AdminOrder {
  id: number
  statut: string
  prix: number
  createdAt: string
  dateLivraisonEstimee: string | null
  estEnRetard?: boolean
  client: { user: Pick<AdminUser, 'nom' | 'prenom'> }
  artisan: { nomAtelier: string; metier: { nom: string } }
  creation?: { titre: string } | null
}

export interface AdminModel {
  id: number
  titre: string
  photoUrl: string | null
  prixEstimatif: number | null
  categorie: string | null
  artisan: { nomAtelier: string }
  createdAt: string
}

export interface AdminClaim {
  id: number
  sujet: string
  description: string
  statut: string
  createdAt: string
  client: { user: Pick<AdminUser, 'nom' | 'prenom'> }
  order: { id: number; artisan: { nomAtelier: string } }
}

export interface AdminAppointment {
  id: number
  type: string
  statut: string
  date: string
  notes: string | null
  client: { user: Pick<AdminUser, 'nom' | 'prenom'> }
  artisan: { nomAtelier: string }
}

export interface AdminPayment {
  id: number
  montant: number
  type: string
  moyen: string
  statut: string
  createdAt: string
  order?: { id: number } | null
  artisan: { nomAtelier: string }
}

export interface Metier {
  id: number
  nom: string
  description: string
  actif: boolean
}
