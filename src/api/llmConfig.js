import request from '@/utils/request'

export const llmConfigApi = {
  list() {
    return request.get('/llm-config/list')
  },
  save(data) {
    return request.post('/llm-config/save', data)
  },
  deleteByProvider(provider) {
    return request.delete(`/llm-config/${provider}`)
  },
  test(data) {
    return request.post('/llm-config/test', data)
  },
  presets() {
    return request.get('/llm-config/presets')
  },
}
