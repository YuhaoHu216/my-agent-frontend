import request from '@/utils/request'
import { createSseStream } from './sse'

const BASE_URL = '/api'

export const orchestratorApi = {
  list() {
    return request.get('/orchestrator/list')
  },
  add(data) {
    return request.post('/orchestrator/add', data)
  },
  update(data) {
    return request.put('/orchestrator/update', data)
  },
  deleteById(id) {
    return request.delete(`/orchestrator/${id}`)
  },
  toggle(id) {
    return request.put(`/orchestrator/toggle/${id}`)
  },
  listAgents(id) {
    return request.get(`/orchestrator/${id}/agents`)
  },
  bindAgents(id, agentIds) {
    return request.put(`/orchestrator/${id}/agents/bind`, { agentIds })
  },

  doChat(message, chatId, orchestratorId) {
    const url = `${BASE_URL}/ai/orchestrator/chat?orchestratorId=${encodeURIComponent(orchestratorId)}&message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}`
    return createSseStream(url)
  },
}