import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { AppointmentType, AppointmentStatus } from '@/constants/enums'

export interface Appointment {
  id: number
  type: AppointmentType
  statut: AppointmentStatus
  dateHeure: string
  lieu: string | null
  notes: string | null
  createdAt: string
  artisan: {
    id: number
    atelier: string
    métier: string
    photoProfil: string | null
    user: { nom: string; prenom: string }
  }
}

export interface CreateAppointmentPayload {
  artisanId: number
  type: AppointmentType
  dateHeure: string
  lieu?: string
  notes?: string
}

export const appointmentsApi = {
  create: (data: CreateAppointmentPayload) =>
    apiClient.post<Appointment>(ENDPOINTS.appointments, data),

  myAppointments: () =>
    apiClient.get<Appointment[]>(ENDPOINTS.myAppointments),

  cancel: (id: number) =>
    apiClient.patch(ENDPOINTS.cancelAppointment(id)),
}
