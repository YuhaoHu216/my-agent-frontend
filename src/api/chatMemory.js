import request from '@/utils/request'

export const chatMemoryApi = {
  newConversationId() {
    return request.get('/chat-memory/new/conversationId')
  },

  getUserConversationIds() {
    return request.get('/chat-memory/conversations')
  },

  getConversationMessages(conversationId) {
    return request.get(`/chat-memory/conversations/${conversationId}`)
  },

  deleteConversation(conversationId) {
    return request.delete(`/chat-memory/conversations/${conversationId}`)
  },

  getAllConversationsSummary() {
    return request.get('/chat-memory/conversations-summary')
  },

  updateConversationName(conversationId, name) {
    return request.put(`/chat-memory/conversations/${conversationId}/name`, null, {
      params: { name },
    })
  },
}
