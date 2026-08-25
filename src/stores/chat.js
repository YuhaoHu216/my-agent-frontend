import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { chatMemoryApi } from '@/api/chatMemory'

// 会话 / 消息 / 聊天偏好共享状态：
// 历史会话列表展示在 AppLayout 侧边栏，消息与流式发送在 ChatRoom，天然跨组件，必须共享。
export const useChatStore = defineStore('chat', () => {
  const sessions = ref([])
  const loadingSessions = ref(false)
  const creatingNew = ref(false)
  const currentChatId = ref('')
  const messages = ref([])
  const chatMode = ref(localStorage.getItem('chatMode') || 'chat')
  const selectedModel = ref(localStorage.getItem('selectedModel') || '')
  const isSending = ref(false)

  const loadSessions = async () => {
    loadingSessions.value = true
    try {
      const res = await chatMemoryApi.getAllConversationsSummary()
      if (res.code === 200 && res.data) {
        sessions.value = Object.entries(res.data).map(([id, info]) => ({
          id,
          name: info.name || id,
        }))
      }
    } catch (error) {
      console.error('获取会话列表失败:', error)
    } finally {
      loadingSessions.value = false
    }
  }

  const setCurrent = (id) => {
    currentChatId.value = id
  }

  // 新聊天：后端创建会话，清空消息并跳转（ChatRoom 通过 watch route.query 加载空会话）
  const newChat = async () => {
    creatingNew.value = true
    try {
      const res = await chatMemoryApi.newConversationId()
      if (res.code === 200) {
        currentChatId.value = res.data
        messages.value = []
        router.replace({ path: '/chat', query: { conversationId: res.data } })
      } else {
        ElMessage.error(res.message || '创建会话失败')
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      ElMessage.error('创建会话失败')
    } finally {
      creatingNew.value = false
    }
  }

  // 进入已有会话：切换 currentChatId 并跳转，消息由 ChatRoom 加载
  const enterSession = (id) => {
    if (id !== currentChatId.value) messages.value = []
    currentChatId.value = id
    router.replace({ path: '/chat', query: { conversationId: id } })
  }

  const deleteSession = async (id) => {
    try {
      const res = await chatMemoryApi.deleteConversation(id)
      if (res.code === 200) {
        sessions.value = sessions.value.filter((s) => s.id !== id)
        if (id === currentChatId.value) {
          await newChat() // 删除的是当前会话 → 自动开新会话，避免右侧空态 + URL 挂已删 id
        }
        ElMessage.success('删除成功')
      } else {
        ElMessage.error(res.message || '删除会话失败')
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      ElMessage.error('删除会话失败')
    }
  }

  const renameSession = async (id, name) => {
    try {
      const res = await chatMemoryApi.updateConversationName(id, name)
      if (res.code === 200) {
        const s = sessions.value.find((x) => x.id === id)
        if (s) s.name = name
        ElMessage.success('重命名成功')
      }
    } catch (error) {
      console.error('重命名失败:', error)
      ElMessage.error('重命名失败')
    }
  }

  const setMode = (m) => {
    chatMode.value = m
    localStorage.setItem('chatMode', m)
  }

  const setModel = (m) => {
    selectedModel.value = m
    localStorage.setItem('selectedModel', m)
  }

  // 退出登录时清空会话态，防止换账号残留（chatMode/selectedModel 是用户偏好，保留）
  const reset = () => {
    sessions.value = []
    loadingSessions.value = false
    creatingNew.value = false
    currentChatId.value = ''
    messages.value = []
    isSending.value = false
  }

  return {
    sessions,
    loadingSessions,
    creatingNew,
    currentChatId,
    messages,
    chatMode,
    selectedModel,
    isSending,
    loadSessions,
    setCurrent,
    newChat,
    enterSession,
    deleteSession,
    renameSession,
    setMode,
    setModel,
    reset,
  }
})
