import axios from 'axios'

const BASE_URL = '/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
)

export const documentApi = {
  upload(formData) {
    return request.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  list() {
    return request.get('/document/list')
  },

  search(query, topK = 10) {
    return request.post('/document/search', { query, topK })
  },

  deleteById(id) {
    return request.delete(`/document/${id}`)
  }
}
