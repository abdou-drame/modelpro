import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { OrderStatus, AppointmentStatus } from '@/constants/enums'

// ── Stats ──────────────────────────────────────────────────────────────────

export interface ArtisanStats {
  chiffreAffaires: number
  commandesEnCours: number
  noteGlobale: number
}

// ── Profile ────────────────────────────────────────────────────────────────

export interface ArtisanProfile {
  id: number
  atelier: string
  metier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photoProfil: string | null
  photosAtelier: string[]
  statutValidation: string
  noteMoyenne: number
  user: { nom: string; prenom: string; telephone: string; photoUrl: string | null }
}

export interface UpdateProfilePayload {
  atelier?: string
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
    nom: string
    prenom: string
    telephone: string
  }
  creation: { id: number; titre: string; photoUrl: string | null } | null
}

// ── Appointments ──────────────────────────────────────────────────────────

export interface ArtisanAppointment {
  id: number
  type: string
  statut: AppointmentStatus
  date: string | null
  lieu: string | null
  notes: string | null
  motifRefus?: string | null
  proposedDate?: string | null
  createdAt?: string
  client: {
    id?: number
    nom: string
    prenom: string
    telephone?: string
    email?: string
    photoUrl?: string | null
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

async function buildFileFormData(fieldName: string, uris: string[]): Promise<FormData> {
  const form = new FormData()
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i]
    if (typeof window !== 'undefined' && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
      const response = await fetch(uri)
      const blob = await response.blob()
      form.append(fieldName, blob, `photo_${i}.jpg`)
    } else {
      form.append(fieldName, {
        uri,
        name: `photo_${i}.jpg`,
        type: 'image/jpeg',
      } as any)
    }
  }
  return form
}

// ── API calls ──────────────────────────────────────────────────────────────

export const artisanApi = {
  // Stats
  stats: () =>
    apiClient.get<ArtisanStats>(ENDPOINTS.artisanStats),

  // Profile
  getProfile: () =>
    apiClient.get<ArtisanProfile>(ENDPOINTS.artisanProfile).then((r) => {
      const p = r.data as any
      if (p) {
        p.photoProfil = p.user?.photoUrl || p.photoProfil || null
        if (typeof p.photosAtelier === 'string') {
          try { p.photosAtelier = JSON.parse(p.photosAtelier) } catch { p.photosAtelier = [] }
        }
        if (!Array.isArray(p.photosAtelier)) p.photosAtelier = []
      }
      return r
    }),
  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.put<ArtisanProfile>(ENDPOINTS.artisanProfile, data),
  uploadPhotos: async (uris: string[]) => {
    const form = await buildFileFormData('photos', uris)
    return apiClient.post(ENDPOINTS.artisanPhotos, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deletePhoto: (photoUrl: string) =>
    apiClient.delete(ENDPOINTS.artisanPhotos, { data: { photoUrl } }),
  uploadAvatar: async (uri: string) => {
    const form = await buildFileFormData('avatar', [uri])
    return apiClient.post('/artisans/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Orders
  orders: () =>
    apiClient.get<ArtisanOrder[]>(ENDPOINTS.artisanOrders).then((r) => {
      r.data.forEach((o: any) => {
        o.prixTotal = o.totalPrice ?? o.prix ?? o.prixTotal ?? null
        const isUnpaid = !o.paymentStatus || o.paymentStatus === 'unpaid'
        o.acompte = isUnpaid ? (o.depositAmount ?? o.acompte ?? 0) : (o.depositAmount ?? o.acompte ?? (o.prixTotal ? Math.round(o.prixTotal * 0.5) : null))
        if (typeof o.mesures === 'string') {
          try { o.mesures = JSON.parse(o.mesures) } catch { o.mesures = null }
        }
      })
      return r
    }),
  orderById: (id: number) =>
    apiClient.get<ArtisanOrder>(ENDPOINTS.artisanOrderById(id)).then((r) => {
      const o = r.data as any
      if (o) {
        o.prixTotal = o.totalPrice ?? o.prix ?? o.prixTotal ?? null
        const isUnpaid = !o.paymentStatus || o.paymentStatus === 'unpaid'
        o.acompte = isUnpaid ? (o.depositAmount ?? o.acompte ?? 0) : (o.depositAmount ?? o.acompte ?? (o.prixTotal ? Math.round(o.prixTotal * 0.5) : null))
        if (typeof o.mesures === 'string') {
          try { o.mesures = JSON.parse(o.mesures) } catch { o.mesures = null }
        }
      }
      return r
    }),
  updateOrderStatus: (id: number, statut: OrderStatus, dateLivraisonEstimee?: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderStatus(id), { statut, dateLivraisonEstimee }),
  updateDeliveryDate: (id: number, date: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderDelivery(id), { dateLivraisonEstimee: date }),
  updatePayment: (id: number, data: { paymentStatus?: string; depositAmount?: number; totalPrice?: number; montant?: number; type?: string; methode?: string }) =>
    apiClient.patch(ENDPOINTS.artisanOrderPayment(id), data),

  // Appointments
  appointments: () =>
    apiClient.get<ArtisanAppointment[]>(ENDPOINTS.artisanAppointments),
  updateAppointmentStatus: (id: number, statut: AppointmentStatus) =>
    apiClient.patch(ENDPOINTS.artisanAppointmentStatus(id), { statut }),
  rescheduleAppointment: (id: number, proposedDate: string, raison?: string) =>
    apiClient.patch(ENDPOINTS.artisanAppointmentReschedule(id), { proposedDate, raison }),

  // Models
  myModels: () =>
    apiClient.get<MyModel[]>(ENDPOINTS.myModels).then((r) => {
      r.data.forEach((m: any) => {
        if (typeof m.photos === 'string') {
          try { m.photos = JSON.parse(m.photos) } catch { m.photos = [] }
        }
        if (!Array.isArray(m.photos)) m.photos = []
        if (typeof m.options === 'string') {
          try { m.options = JSON.parse(m.options) } catch { m.options = [] }
        }
        if (!Array.isArray(m.options)) m.options = []
      })
      return r
    }),
  createModel: (data: CreateModelPayload) =>
    apiClient.post<MyModel>(ENDPOINTS.models, data),
  updateModel: (id: number, data: Partial<CreateModelPayload>) =>
    apiClient.put<MyModel>(ENDPOINTS.modelById(id), data),
  deleteModel: (id: number) =>
    apiClient.delete(ENDPOINTS.modelById(id)),
  // Reviews
  getReviews: () =>
    apiClient.get<any[]>(ENDPOINTS.myReviews),
}
