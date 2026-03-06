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
    // ONLY clear the session on an explicit 401 from the server.
    // Network errors (timeout, no connection, CORS) must NOT log the user out —
    // the Render free tier can take 50 s to wake up and that would wipe the
    // session every time a user returns to the tab.
    const isExplicit401 =
      error.response?.status === 401 &&
      error.response?.data?.detail !== undefined // real server response, not Axios timeout

    if (isExplicit401) {
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