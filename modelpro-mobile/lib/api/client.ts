import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'
import { BASE_URL } from '@/constants/api'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt')
      router.replace('/(auth)/login')
    }
    return Promise.reject(err)
  }
)

export default apiClient
