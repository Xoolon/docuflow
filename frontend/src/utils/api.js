import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('docuflow_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('docuflow_token')
      localStorage.removeItem('docuflow_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
export { API_BASE }