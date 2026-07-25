import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { OrderStatus, AppointmentStatus } from '@/constants/enums'

// ── Stats ──────────────────────────────────────────────────────────────────

export interface ArtisanStats {
  revenus: { total: number; moisCourant: number }
  commandes: { actives: number; total: number; enAttente: number }
  noteMoyenne: number
  nombreAvis: number
}

// ── Profile ────────────────────────────────────────────────────────────────

export interface ArtisanProfile {
  id: number
  nomAtelier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photoProfil: string | null
  photosAtelier: string[]
  estValide: boolean
  notemoyenne: number
  metier: { id: number; nom: string }
  user: { nom: string; prenom: string; telephone: string; photoUrl: string | null }
}

export interface UpdateProfilePayload {
  nomAtelier?: string
  description?: string
  localisation?: string
  zone?: string
}

// ── Orders ─────────────────────────────────────────────────────────────────

export interface ArtisanOrder {
  id: number
  statut: OrderStatus
  description: string | null
  mesures: Record<string, string> | null
  options: string[]
  prixTotal: number | null
  acompte: number | null
  dateLivraisonEstimee: string | null
  createdAt: string
  client: {
    id: number
    photoProfil: string | null
    user: { nom: string; prenom: string; telephone: string }
  }
  creation: { id: number; titre: string; photoUrl: string | null } | null
}

// ── Appointments ──────────────────────────────────────────────────────────

export interface ArtisanAppointment {
  id: number
  type: string
  statut: AppointmentStatus
  dateHeure: string
  lieu: string | null
  notes: string | null
  client: {
    id: number
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
}

// ── Models ─────────────────────────────────────────────────────────────────

export interface MyModel {
  id: number
  titre: string
  description: string | null
  prixEstimatif: number | null
  photoUrl: string | null
  photos: string[]
  options: string[]
  disponible: boolean
}

export interface CreateModelPayload {
  titre: string
  description?: string
  prixEstimatif?: number
  photoUrl?: string
  photos?: string[]
  options?: string[]
}

// ── API calls ──────────────────────────────────────────────────────────────

export const artisanApi = {
  // Stats
  stats: () =>
    apiClient.get<ArtisanStats>(ENDPOINTS.artisanStats),

  // Profile
  getProfile: () =>
    apiClient.get<ArtisanProfile>(ENDPOINTS.artisanProfile),
  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.put<ArtisanProfile>(ENDPOINTS.artisanProfile, data),
  uploadPhotos: (uris: string[]) => {
    const form = new FormData()
    uris.forEach((uri, i) => {
      form.append('photos', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any)
    })
    return apiClient.post(ENDPOINTS.artisanPhotos, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Orders
  orders: () =>
    apiClient.get<ArtisanOrder[]>(ENDPOINTS.artisanOrders),
  orderById: (id: number) =>
    apiClient.get<ArtisanOrder>(ENDPOINTS.artisanOrderById(id)),
  updateOrderStatus: (id: number, statut: OrderStatus, dateLivraisonEstimee?: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderStatus(id), { statut, dateLivraisonEstimee }),
  updateDeliveryDate: (id: number, date: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderDelivery(id), { dateLivraisonEstimee: date }),
  updatePayment: (id: number, data: { montant: number; type: string; methode: string }) =>
    apiClient.patch(ENDPOINTS.artisanOrderPayment(id), data),

  // Appointments
  appointments: () =>
    apiClient.get<ArtisanAppointment[]>(ENDPOINTS.artisanAppointments),
  updateAppointmentStatus: (id: number, statut: AppointmentStatus) =>
    apiClient.patch(ENDPOINTS.artisanAppointmentStatus(id), { statut }),
  rescheduleAppointment: (id: number, dateHeure: string, raison?: string) =>
    apiClient.patch(ENDPOINTS.artisanAppointmentReschedule(id), { dateHeure, raison }),

  // Models
  myModels: () =>
    apiClient.get<MyModel[]>(ENDPOINTS.myModels),
  createModel: (data: CreateModelPayload) =>
    apiClient.post<MyModel>(ENDPOINTS.models, data),
  updateModel: (id: number, data: Partial<CreateModelPayload>) =>
    apiClient.put<MyModel>(ENDPOINTS.modelById(id), data),
  deleteModel: (id: number) =>
    apiClient.delete(ENDPOINTS.modelById(id)),
}
