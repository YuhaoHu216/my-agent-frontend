import { createSseStream } from './sse'

const BASE_URL = '/api'

export const aiApi = {
  doChatWithLoveAppSse(message, chatId, model, modelName) {
    const url = `${BASE_URL}/ai/my_app/chat/sse/one?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}&model=${encodeURIComponent(model)}&modelName=${encodeURIComponent(modelName || '')}`
    return createSseStream(url)
  },

  doChatWithManus(message, chatId, model, modelName) {
    const url = `${BASE_URL}/ai/manus/chat?message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}&model=${encodeURIComponent(model)}&modelName=${encodeURIComponent(modelName || '')}`
    return createSseStream(url)
  },

  doChatWithCustomAgent(message, chatId, agentId) {
    const url = `${BASE_URL}/ai/agent/chat?agentId=${encodeURIComponent(agentId)}&message=${encodeURIComponent(message)}&chatId=${encodeURIComponent(chatId)}`
    return createSseStream(url)
  },
}