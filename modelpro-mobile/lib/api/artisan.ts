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

// Shape brute retournée par le backend (champs Sequelize)
interface ArtisanProfileRaw {
  id: number
  atelier: string
  métier: string
  description: string | null
  localisation: string | null
  zone: string | null
  photosAtelier: string | null // JSON string dans la DB
  documentValidation: string | null
  statutValidation: 'en_attente' | 'valide' | 'rejete'
  noteMoyenne: number | null
  nombreAvis: number
  statutAbonnement: 'inactif' | 'actif' | 'expire'
  user: { nom: string; prenom: string; telephone: string; photoUrl: string | null }
}

// Shape normalisée pour les composants UI
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
  nombreAvis: number
  metier: { id: number; nom: string }
  statutAbonnement: 'inactif' | 'actif' | 'expire'
  user: { nom: string; prenom: string; telephone: string; photoUrl: string | null }
}

export interface UpdateProfilePayload {
  nomAtelier?: string
  description?: string
  localisation?: string
  zone?: string
}

function normalizeArtisanProfile(raw: ArtisanProfileRaw): ArtisanProfile {
  let photos: string[] = []
  if (raw.photosAtelier) {
    try { photos = JSON.parse(raw.photosAtelier) } catch { photos = [] }
  }
  return {
    id: raw.id,
    nomAtelier: raw.atelier ?? '',
    description: raw.description,
    localisation: raw.localisation,
    zone: raw.zone,
    photoProfil: raw.user?.photoUrl ?? null,
    photosAtelier: photos,
    estValide: raw.statutValidation === 'valide',
    notemoyenne: raw.noteMoyenne ?? 0,
    nombreAvis: raw.nombreAvis ?? 0,
    metier: { id: 0, nom: raw.métier ?? '' },
    statutAbonnement: raw.statutAbonnement ?? 'inactif',
    user: raw.user,
  }
}

// ── Orders ─────────────────────────────────────────────────────────────────

interface ArtisanOrderRaw {
  id: number
  statut: OrderStatus
  consignes: string | null
  mesures: string | null
  totalPrice: number | null
  depositAmount: number | null
  deliveryDate: string | null
  createdAt: string
  // backend retourne l'User directement avec l'alias 'client'
  client: { id: number; nom: string; prenom: string; telephone: string; photoUrl?: string | null } | null
  creation?: { id: number; titre: string; photoUrl: string | null } | null
}

export interface ArtisanOrder {
  id: number
  statut: OrderStatus
  description: string | null
  mesures: string | null
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

function normalizeArtisanOrder(raw: ArtisanOrderRaw): ArtisanOrder {
  return {
    id: raw.id,
    statut: raw.statut,
    description: raw.consignes,
    mesures: raw.mesures,
    prixTotal: raw.totalPrice,
    acompte: raw.depositAmount,
    dateLivraisonEstimee: raw.deliveryDate,
    createdAt: raw.createdAt,
    client: {
      id: raw.client?.id ?? 0,
      photoProfil: raw.client?.photoUrl ?? null,
      user: {
        nom: raw.client?.nom ?? '',
        prenom: raw.client?.prenom ?? '',
        telephone: raw.client?.telephone ?? '',
      },
    },
    creation: raw.creation ?? null,
  }
}

// ── Appointments ──────────────────────────────────────────────────────────

// Brut backend
interface ArtisanAppointmentRaw {
  id: number
  type: string | null
  statut: string
  date: string | null
  lieu: string | null
  notes: string | null
  client?: {
    id: number
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
}

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

function normalizeArtisanAppointment(raw: ArtisanAppointmentRaw): ArtisanAppointment {
  return {
    id: raw.id,
    type: raw.type ?? 'prise_mesures',
    statut: (raw.statut ?? 'demande') as AppointmentStatus,
    dateHeure: raw.date ?? '',
    lieu: raw.lieu,
    notes: raw.notes,
    client: {
      id: raw.client?.id ?? 0,
      photoProfil: raw.client?.photoProfil ?? null,
      user: { nom: raw.client?.user?.nom ?? '', prenom: raw.client?.user?.prenom ?? '' },
    },
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
    apiClient.get<ArtisanProfileRaw>(ENDPOINTS.artisanProfile)
      .then((r) => ({ ...r, data: normalizeArtisanProfile(r.data) })),
  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.put(ENDPOINTS.artisanProfile, {
      atelier: data.nomAtelier,
      description: data.description,
      localisation: data.localisation,
      zone: data.zone,
    }),
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
    apiClient.get<ArtisanOrderRaw[]>(ENDPOINTS.artisanOrders)
      .then((r) => ({ ...r, data: r.data.map(normalizeArtisanOrder) })),
  orderById: (id: number) =>
    apiClient.get<ArtisanOrderRaw>(ENDPOINTS.artisanOrderById(id))
      .then((r) => ({ ...r, data: normalizeArtisanOrder(r.data) })),
  updateOrderStatus: (id: number, statut: OrderStatus, dateLivraisonEstimee?: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderStatus(id), { statut, dateLivraisonEstimee }),
  updateDeliveryDate: (id: number, date: string) =>
    apiClient.patch(ENDPOINTS.artisanOrderDelivery(id), { dateLivraisonEstimee: date }),
  updatePayment: (id: number, data: { montant: number; type: string; methode: string }) =>
    apiClient.patch(ENDPOINTS.artisanOrderPayment(id), data),

  // Appointments
  appointments: () =>
    apiClient.get<ArtisanAppointmentRaw[]>(ENDPOINTS.artisanAppointments)
      .then((r) => ({ ...r, data: r.data.map(normalizeArtisanAppointment) })),
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
