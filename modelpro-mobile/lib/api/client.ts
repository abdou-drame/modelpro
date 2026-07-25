import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { BASE_URL } from '@/constants/api'

const getToken = () =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.getItem('jwt'))
    : SecureStore.getItemAsync('jwt')

const deleteToken = () =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.removeItem('jwt'))
    : SecureStore.deleteItemAsync('jwt')

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await deleteToken()
      router.replace('/(auth)/login')
    }
    return Promise.reject(err)
  }
)

export default apiClient
