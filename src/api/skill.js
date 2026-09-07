import request from '@/utils/request'

export const skillApi = {
  list() {
    return request.get('/skill/list')
  },
  add(data) {
    return request.post('/skill/add', data)
  },
  update(data) {
    return request.put('/skill/update', data)
  },
  deleteById(id) {
    return request.delete(`/skill/${id}`)
  },
  toggle(id) {
    return request.put(`/skill/toggle/${id}`)
  },
}