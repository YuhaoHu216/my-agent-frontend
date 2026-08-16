import { useUserStore } from '@/stores/user'

const BASE_URL = '/api'

const getToken = () => {
  const userStore = useUserStore()
  return userStore.token || ''
}

const sseFetch = (url) => {
  const token = getToken()
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

const createSseStream = (url) => {
  return new ReadableStream({
    async start(controller) {
      let reader
      try {
        const response = await sseFetch(url)
        reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).replace(/^ /, '')
              // 尝试解析 JSON，成功则为结构化事件，失败则作为纯文本（向后兼容）
              try {
                const event = JSON.parse(raw)
                controller.enqueue(event)
              } catch {
                controller.enqueue(raw)
              }
            }
          }
        }
      } catch (error) {
        console.error('SSE 请求失败:', error)
      } finally {
        if (reader) {
          try { reader.releaseLock() } catch {}
        }
        controller.close()
      }
    },
  })
}

export const aiApi = {
  doChatWithLoveAppSse(message, chatId, model) {
    const url = `${BASE_URL}/ai/my_app/chat/sse/one?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}&model=${encodeURIComponent(model)}`
    return createSseStream(url)
  },

  doChatWithManus(message, chatId, model) {
    const url = `${BASE_URL}/ai/manus/chat?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}&model=${encodeURIComponent(model)}`
    return createSseStream(url)
  },
}
