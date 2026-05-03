const BASE_URL = '/api'

export const aiApi = {
  doChatWithLoveAppSse(message, chatId) {
    const url = `${BASE_URL}/ai/my_app/chat/sse/one?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}`
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
    const url = `${BASE_URL}/ai/manus/chat?message=${encodeURIComponent(message)}`
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
