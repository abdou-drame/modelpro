const ENV = {
  dev: 'http://localhost:5000/api/v1',
  staging: 'https://staging-api.modelepro.com/api/v1',
  prod: 'https://api.modelepro.com/api/v1',
} as const

type Env = keyof typeof ENV

export const BASE_URL = ENV[(process.env.EXPO_PUBLIC_ENV as Env) ?? 'dev']

export const ENDPOINTS = {
  // Auth
  register: '/auth/register',
  login: '/auth/login',
  fcmToken: '/users/fcm-token',

  // User
  me: '/users/me',

  // Artisans (public)
  artisansSearch: '/artisans/search',
  artisanById: (id: number) => `/artisans/${id}`,
  artisanReviews: (id: number) => `/artisans/${id}/reviews`,

  // Artisan (private)
  artisanProfile: '/artisans/profile',
  artisanPhotos: '/artisans/photos',
  artisanDocument: '/artisans/document',
  artisanStats: '/artisans/stats',
  artisanOrders: '/artisans/orders',
  artisanOrderById: (id: number) => `/artisans/orders/${id}`,
  artisanOrderStatus: (id: number) => `/artisans/orders/${id}/status`,
  artisanOrderDelivery: (id: number) => `/artisans/orders/${id}/delivery-date`,
  artisanOrderPayment: (id: number) => `/artisans/orders/${id}/payment`,
  artisanAppointments: '/artisans/appointments',
  artisanAppointmentStatus: (id: number) => `/artisans/appointments/${id}/status`,
  artisanAppointmentReschedule: (id: number) => `/artisans/appointments/${id}/reschedule`,

  // Metiers
  metiers: '/metiers',

  // Models (catalogue)
  models: '/models',
  modelById: (id: number) => `/models/${id}`,
  myModels: '/models/my-models',

  // Orders (client)
  orders: '/orders',
  myOrders: '/orders/my-orders',
  cancelOrder: (id: number) => `/orders/${id}/cancel`,

  // Appointments (client)
  appointments: '/appointments',
  myAppointments: '/appointments/my-appointments',
  cancelAppointment: (id: number) => `/appointments/${id}/cancel`,

  // Reviews & Claims
  reviews: '/reviews',
  claims: '/claims',
  myClaims: '/claims/my-claims',

  // Messages
  messages: '/messages',
  conversations: '/messages/conversations',
  orderMessages: (orderId: number) => `/messages/order/${orderId}`,
  markMessageRead: (id: number) => `/messages/${id}/read`,

  // Notifications
  notifications: '/notifications',
  markNotificationRead: (id: number) => `/notifications/${id}/read`,
  markAllNotificationsRead: '/notifications/read-all',

  // Payments
  payments: '/payments',
  orderPayments: (orderId: number) => `/payments/order/${orderId}`,
  paymentSummary: (orderId: number) => `/payments/summary/${orderId}`,
  mySubscription: '/payments/subscriptions/my',
  paymentStatus: (id: number) => `/payments/${id}/status`,
} as const
