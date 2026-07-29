import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { AppointmentType, AppointmentStatus } from '@/constants/enums'

// Shape brute retournée par le backend
interface AppointmentRaw {
  id: number
  type: string | null
  statut: string
  date: string | null
  lieu: string | null
  notes: string | null
  createdAt: string
  artisan?: {
    id: number
    atelier: string
    user: { nom: string; prenom: string; photoUrl: string | null }
  }
  client?: {
    id: number
    user: { nom: string; prenom: string }
  }
}

export interface Appointment {
  id: number
  type: AppointmentType
  statut: AppointmentStatus
  dateHeure: string | null
  lieu: string | null
  notes: string | null
  createdAt: string
  artisan: {
    id: number
    atelier: string
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
}

function normalizeAppointment(raw: AppointmentRaw): Appointment {
  return {
    id: raw.id,
    type: (raw.type ?? 'prise_mesures') as AppointmentType,
    statut: (raw.statut ?? 'demande') as AppointmentStatus,
    dateHeure: raw.date ?? null,
    lieu: raw.lieu,
    notes: raw.notes,
    createdAt: raw.createdAt,
    artisan: {
      id: raw.artisan?.id ?? 0,
      atelier: raw.artisan?.atelier ?? '',
      photoProfil: raw.artisan?.user?.photoUrl ?? null,
      user: {
        nom: raw.artisan?.user?.nom ?? '',
        prenom: raw.artisan?.user?.prenom ?? '',
      },
    },
  }
}

export interface CreateAppointmentPayload {
  artisanId: number
  type: AppointmentType
  dateHeure: string   // ISO local, ex: "2026-08-15T10:00:00"
  lieu?: string
  notes?: string
}

export const appointmentsApi = {
  create: (data: CreateAppointmentPayload) => {
    const { dateHeure, ...rest } = data
    return apiClient.post<Appointment>(ENDPOINTS.appointments, { ...rest, date: dateHeure })
  },

  myAppointments: () =>
    apiClient.get<AppointmentRaw[]>(ENDPOINTS.myAppointments)
      .then((r) => ({ ...r, data: r.data.map(normalizeAppointment) })),

  cancel: (id: number) =>
    apiClient.patch(ENDPOINTS.cancelAppointment(id)),
}
