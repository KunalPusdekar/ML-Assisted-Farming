import axios from 'axios'

function normalizeBaseUrl(raw) {
  let url = (raw || '').trim()
  if (!url) return 'http://localhost:8000'
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
      url = `http://${url}`
    } else if (url.startsWith(':')) {
      // ":8000" -> "http://localhost:8000"
      url = `http://localhost${url}`
    } else {
      url = `http://${url}`
    }
  }
  // Remove trailing slash for consistency
  if (url.endsWith('/')) url = url.slice(0, -1)
  return url
}

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
