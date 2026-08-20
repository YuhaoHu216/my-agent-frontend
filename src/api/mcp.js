import request from '@/utils/request'

export const mcpApi = {
  list() {
    return request.get('/mcp/list')
  },
  add(data) {
    return request.post('/mcp/add', data)
  },
  update(data) {
    return request.put('/mcp/update', data)
  },
  deleteById(id) {
    return request.delete(`/mcp/${id}`)
  },
  toggle(id) {
    return request.put(`/mcp/toggle/${id}`)
  },
  test(id) {
    return request.post(`/mcp/test/${id}`)
  },
  listTools(id) {
    return request.get(`/mcp/${id}/tools`)
  },
  callTool(id, data) {
    return request.post(`/mcp/${id}/tools/call`, data)
  },
}
