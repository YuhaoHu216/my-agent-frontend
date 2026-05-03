const BASE_URL = '/api'

const getToken = () => {
  return localStorage.getItem('token') || ''
}

export const aiApi = {
  doChatWithLoveAppSse(message, chatId) {
    const token = getToken()
    const url = `${BASE_URL}/ai/my_app/chat/sse/one?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}&token=${encodeURIComponent(token)}`
    return new ReadableStream({
      start(controller) {
        const eventSource = new EventSource(url)
        
        eventSource.onmessage = (event) => {
          controller.enqueue(event.data)
        }
        
        eventSource.onerror = () => {
          eventSource.close()
          controller.close()
        }
      }
    })
  },

  doChatWithManus(message) {
    const token = getToken()
    const url = `${BASE_URL}/ai/manus/chat?message=${encodeURIComponent(message)}&token=${encodeURIComponent(token)}`
    return new ReadableStream({
      start(controller) {
        const eventSource = new EventSource(url)
        
        eventSource.onmessage = (event) => {
          controller.enqueue(event.data)
        }
        
        eventSource.onerror = () => {
          eventSource.close()
          controller.close()
        }
      }
    })
  }
}
