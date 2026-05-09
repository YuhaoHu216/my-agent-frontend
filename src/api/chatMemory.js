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
  error => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

export const chatMemoryApi = {
  newConversationId() {
    return request.get('/chat-memory/new/conversationId')
  },

  getUserConversationIds() {
    return request.get('/chat-memory/conversations')
  },

  getConversationMessages(conversationId) {
    return request.get(`/chat-memory/conversations/${conversationId}`)
  },

  deleteConversation(conversationId) {
    return request.delete(`/chat-memory/conversations/${conversationId}`)
  },

  getAllConversationsSummary() {
    return request.get('/chat-memory/conversations-summary')
  },

  updateConversationName(conversationId, name) {
    return request.put(`/chat-memory/conversations/${conversationId}/name`, null, {
      params: { name }
    })
  }
}
