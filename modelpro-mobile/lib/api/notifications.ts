import apiClient from './client'
import { ENDPOINTS } from '@/constants/api'
import { NotificationType } from '@/constants/enums'

export interface AppNotification {
  id: number
  type: NotificationType
  titre: string
  description: string
  lu: boolean
  referenceId: number | null
  createdAt: string
}

export const notificationsApi = {
  list: () =>
    apiClient.get<AppNotification[]>(ENDPOINTS.notifications),

  markRead: (id: number) =>
    apiClient.patch(ENDPOINTS.markNotificationRead(id)),

  markAllRead: () =>
    apiClient.patch(ENDPOINTS.markAllNotificationsRead),
}
