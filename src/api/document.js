import request from '@/utils/request'

export const documentApi = {
  upload(formData) {
    return request.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  },

  async downloadById(id, fileName) {
    const blob = await request.get(`/document/download/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}
