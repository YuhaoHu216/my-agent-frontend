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

        // 解析一个 SSE 事件块：事件块之间以空行（\n\n）分隔；同一事件块内
        // 的多行 data: 属于同一份内容（内容中的换行会被后端拆成多行），
        // 需用换行连接还原，否则 markdown 表格等依赖换行的语法无法渲染
        const emitBlock = (block) => {
          const dataLines = block.split('\n')
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).replace(/^ /, ''))
          if (dataLines.length === 0) return
          const raw = dataLines.join('\n')
          // 尝试解析 JSON，成功则为结构化事件，失败则作为纯文本（向后兼容）
          try {
            const event = JSON.parse(raw)
            controller.enqueue(event)
          } catch {
            controller.enqueue(raw)
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          // 事件块以空行结束；数据可能跨多次 read 到达，用 buffer 累积
          let boundary = buffer.indexOf('\n\n')
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            emitBlock(block)
            boundary = buffer.indexOf('\n\n')
          }
        }
        // 流结束时末尾事件块可能没有结尾空行，仍需解析
        if (buffer.trim()) {
          emitBlock(buffer)
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
