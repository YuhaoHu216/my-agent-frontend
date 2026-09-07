import request from '@/utils/request'

export const agentApi = {
  list() {
    return request.get('/agent/list')
  },
  add(data) {
    return request.post('/agent/add', data)
  },
  update(data) {
    return request.put('/agent/update', data)
  },
  deleteById(id) {
    return request.delete(`/agent/${id}`)
  },
  toggle(id) {
    return request.put(`/agent/toggle/${id}`)
  },
  detail(id) {
    return request.get(`/agent/${id}`)
  },
  bindSkills(id, skillIds) {
    return request.put(`/agent/${id}/skills/bind`, { skillIds })
  },
  bindMcps(id, mcpServerIds) {
    return request.put(`/agent/${id}/mcps/bind`, { mcpServerIds })
  },
}