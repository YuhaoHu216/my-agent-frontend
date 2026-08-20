<template>
  <div class="chat-layout">
    <div class="sidebar">
      <el-tabs v-model="activeSidebarTab" class="sidebar-tabs">
        <el-tab-pane label="会话" name="sessions">
          <div class="sidebar-header">
            <h2>历史会话</h2>
            <el-button type="primary" size="small" @click="handleNewChat" :loading="creatingNew">
              <el-icon><Plus /></el-icon>
              新建会话
            </el-button>
          </div>
          <div class="session-list" v-loading="loadingSessions">
            <div
              v-for="session in sessions"
              :key="session.id"
              :class="['session-item', { active: session.id === chatId }]"
              @click="enterSession(session.id)"
            >
              <span class="session-name">{{ session.name }}</span>
              <span class="session-actions">
                <el-button link size="small" @click.stop="handleRename(session)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-popconfirm
                  title="确定要删除该会话吗？"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  popper-class="glass-popper"
                  @confirm="handleDelete(session.id)"
                >
                  <template #reference>
                    <el-button link size="small" @click.stop>
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </span>
            </div>
            <el-empty v-if="!loadingSessions && sessions.length === 0" description="暂无历史会话" :image-size="60" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="文档" name="documents">
          <div class="doc-search-bar">
            <el-input v-model="searchQuery" placeholder="搜索文档..." size="small" clearable @keyup.enter="handleDocSearch" />
            <el-button size="small" type="primary" @click="handleDocSearch" :loading="searching">搜索</el-button>
          </div>
          <div class="doc-upload-bar">
            <el-upload :auto-upload="false" :show-file-list="false" :on-change="handleFileChange" accept="*">
              <el-button size="small" type="primary" plain>
                <el-icon><Upload /></el-icon> 上传文档
              </el-button>
            </el-upload>
          </div>
          <div class="doc-list" v-loading="loadingDocs">
            <div
              v-for="doc in filteredDocs"
              :key="doc.id"
              :class="['doc-item', { active: selectedDocId === doc.id }]"
              @click="selectedDocId = doc.id"
            >
              <span class="doc-name">{{ doc.fileName }}</span>
              <span class="doc-actions">
                <el-button link size="small" @click.stop="handleDocDownload(doc)">
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-popconfirm
                  title="确定要删除该文档吗？"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  popper-class="glass-popper"
                  @confirm="handleDocDelete(doc.id)"
                >
                  <template #reference>
                    <el-button link size="small" @click.stop>
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </span>
            </div>
            <el-empty v-if="!loadingDocs && filteredDocs.length === 0" description="暂无文档" :image-size="60" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="main-area">
      <div class="chat-header">
        <div class="header-left">
          <el-radio-group v-model="chatMode" size="small" @change="onModeChange">
            <el-radio-button value="chat">Chat 模式</el-radio-button>
            <el-radio-button value="agent">Agent 模式</el-radio-button>
          </el-radio-group>
          <el-select v-model="selectedModel" size="small" class="model-select" @change="onModelChange">
            <el-option label="通义千问" value="qwen" />
            <el-option label="DeepSeek" value="deepseek" />
          </el-select>
        </div>
        <span class="chat-title">{{ chatMode === 'chat' ? 'AI 助手' : 'AI 智能体' }}</span>
        <div class="header-right">
          <div class="user-info" v-if="userInfo">
            <el-dropdown trigger="click" popper-class="glass-popper">
              <div class="user-avatar">
                <el-avatar :size="32" :icon="UserFilled" />
                <span class="username">{{ userInfo.username }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>
                    <div class="user-detail">
                      <p><el-icon><User /></el-icon> 用户名：{{ userInfo.username }}</p>
                      <p><el-icon><Message /></el-icon> 邮箱：{{ userInfo.email }}</p>
                      <p v-if="userInfo.phone"><el-icon><Phone /></el-icon> 手机：{{ userInfo.phone }}</p>
                      <p><el-icon><Calendar /></el-icon> 注册时间：{{ formatTime(userInfo.createTime) }}</p>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item @click="router.push('/mcp-config')">
                    <el-icon><SetUp /></el-icon> MCP 配置
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.role, chatMode]"
        >
          <div class="message-avatar">
            <el-avatar v-if="message.role === 'ai'" :icon="chatMode === 'agent' ? Cpu : UserFilled" />
            <el-avatar v-else :icon="User" />
          </div>
          <div class="message-content">
            <div class="message-bubble">
              <template v-if="message.content || (message.role === 'ai' && message.events && message.events.length > 0)">
                <template v-if="message.role === 'ai'">
                  <!-- 新格式：结构化事件展示（基于消息自身的 events 判断，不依赖当前模式） -->
                  <template v-if="message.events && message.events.length > 0">
                    <div v-for="(stepEvents, stepIdx) in groupedEvents(message.events)" :key="stepIdx" class="step-block">
                      <!-- 思考过程 - 可折叠面板（包含工具调用和结果） -->
                      <div v-if="hasThinkOrToolEvents(stepEvents)" class="think-event">
                        <el-collapse v-model="activeThinkingPanels" class="think-collapse">
                          <el-collapse-item :name="'step-'+getStepNumber(stepEvents)">
                            <template #title>
                              <el-icon class="think-icon"><Loading v-if="getStepNumber(stepEvents) === message.currentStep && isSending" /></el-icon>
                              第 {{ getStepNumber(stepEvents) }} 步思考过程
                            </template>
                            <!-- 思考内容 -->
                            <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'think')" :key="'think-'+stepIdx+'-'+eIdx" class="thinking-content">{{ event.content }}</div>
                            <!-- 工具调用信息 -->
                            <div v-if="hasToolEvents(stepEvents)" class="tool-section">
                              <div class="tool-section-divider">— 工具调用 —</div>
                              <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'tool_call')" :key="'toolcall-'+stepIdx+'-'+eIdx" class="tool-call-info">
                                <el-tag size="small" type="info" class="tool-call-tag">调用工具</el-tag>
                                <span class="tool-call-detail">{{ formatToolCalls(event.content) }}</span>
                              </div>
                              <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'tool_result')" :key="'result-'+stepIdx+'-'+eIdx" class="tool-result">
                                <div class="tool-result-text">{{ event.content }}</div>
                              </div>
                            </div>
                          </el-collapse-item>
                        </el-collapse>
                      </div>
                      <!-- 最终回答（finish 完整文本，或 answer 流式分块累积） -->
                      <div v-if="getAnswerText(stepEvents)" class="finish-answer">
                        <MarkdownRenderer :content="getAnswerText(stepEvents)" />
                      </div>
                      <!-- 错误提示 -->
                      <div v-for="(event, eIdx) in stepEvents.filter(e => e.type === 'error' || e.type === 'max_steps')" :key="'warn-'+stepIdx+'-'+eIdx">
                        <el-alert :title="event.content" type="warning" :closable="false" show-icon />
                      </div>
                    </div>
                  </template>
                  <!-- 旧格式：chat 模式 / 无结构化事件的 AI 消息，直接按 markdown 渲染 -->
                  <template v-else>
                    <MarkdownRenderer :content="message.content" />
                  </template>
                </template>
                <template v-else>
                  {{ message.content }}
                </template>
              </template>
              <div v-else class="typing">
                <span class="dot">.</span>
                <span class="dot">.</span>
                <span class="dot">.</span>
              </div>
            </div>
            <div class="message-time">{{ message.time }}</div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            placeholder="请输入消息..."
            @keyup.enter="sendMessage"
            :disabled="isSending"
            type="textarea"
            :rows="3"
            resize="none"
            class="message-textarea"
          />
          <el-button
            type="primary"
            @click="sendMessage"
            :loading="isSending"
            :disabled="!inputMessage.trim()"
            class="send-button"
          >
            <el-icon><Top /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  UserFilled,
  Cpu,
  Top,
  Plus,
  Edit,
  Delete,
  Download,
  Message,
  Phone,
  Calendar,
  SwitchButton,
  Upload,
  Loading,
  SetUp
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { aiApi } from '@/api/ai'
import { chatMemoryApi } from '@/api/chatMemory'
import { documentApi } from '@/api/document'
import { logout } from '@/api/user'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

// Chat mode: 'chat' or 'agent'
const chatMode = ref(localStorage.getItem('chatMode') || 'chat')
// Model selection: 'qwen' (通义千问) or 'deepseek'
const selectedModel = ref(localStorage.getItem('selectedModel') || 'qwen')
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const chatId = ref('')
const messagesContainer = ref(null)
// Agent 模式下当前正在思考的面板（默认展开当前步骤的思考）
const activeThinkingPanels = ref([])

// Session sidebar
const sessions = ref([])
const loadingSessions = ref(false)
const creatingNew = ref(false)

// Sidebar tabs
const activeSidebarTab = ref('sessions')

// Document management
const docs = ref([])
const loadingDocs = ref(false)
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref(null)
const selectedDocId = ref(null)
const uploading = ref(false)

const filteredDocs = computed(() => {
  return searchResults.value !== null ? searchResults.value : docs.value
})

const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatTimestamp = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 拉取指定会话的历史消息并映射为前端结构
const fetchMessages = async (conversationId) => {
  const res = await chatMemoryApi.getConversationMessages(conversationId)
  if (res.code === 200 && Array.isArray(res.data)) {
    return res.data.map(msg => ({
      role: msg.role === 'USER' ? 'user' : 'ai',
      content: msg.text || '',
      events: msg.events || undefined,
      time: formatTimestamp(msg.timestamp)
    }))
  }
  return []
}

// 判断当前会话是否存在未完成的回复（最后一条为 USER 且无对应 ASSISTANT）
const isIncomplete = () => {
  if (!messages.value.length) return false
  return messages.value[messages.value.length - 1].role === 'user'
}

let pollTimer = null
const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 会话存在进行中的回复时，轮询拉取直到出现 ASSISTANT（Agent 后台执行完成后落库）
const startPolling = (conversationId) => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (chatId.value !== conversationId) {
      stopPolling()
      return
    }
    messages.value = await fetchMessages(conversationId)
    await scrollToBottom()
    if (!isIncomplete()) {
      stopPolling()
    }
  }, 1500)
}

// 加载会话消息；若回复未完成则启动轮询恢复
const loadMessages = async (conversationId, { poll = true } = {}) => {
  messages.value = await fetchMessages(conversationId)
  await scrollToBottom()
  if (poll && isIncomplete()) {
    startPolling(conversationId)
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isSending.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  messages.value.push({
    role: 'user',
    content: userMessage,
    time: getCurrentTime()
  })

  await scrollToBottom()

  isSending.value = true
  isLoading.value = true

  const aiMessageIndex = messages.value.length
  messages.value.push({
    role: 'ai',
    content: '',
    time: getCurrentTime()
  })

  // 记录本次发送对应的会话，切走后再收到的流式输出将被丢弃（后端仍在后台执行并持久化）
  const targetChatId = chatId.value

  try {
    const stream = chatMode.value === 'agent'
      ? aiApi.doChatWithManus(userMessage, targetChatId, selectedModel.value)
      : aiApi.doChatWithLoveAppSse(userMessage, targetChatId, selectedModel.value)
    const reader = stream.getReader()
    let sessionsRefreshed = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // 切换会话后，丢弃旧流的输出，避免污染新会话
      if (chatId.value !== targetChatId) {
        await scrollToBottom()
        continue
      }

      // 首个事件到达时，后端已预写入 USER，刷新列表让新会话立即出现
      if (!sessionsRefreshed) {
        sessionsRefreshed = true
        loadSessions()
      }

      // Agent 模式：检测结构化事件
      if (chatMode.value === 'agent' && typeof value === 'object' && value.type) {
        // 过滤掉 step_start / step_end 标记事件，它们只用于后端流程控制
        if (value.type === 'step_start' || value.type === 'step_end') {
          await scrollToBottom()
          continue
        }

        const aiMsg = messages.value[aiMessageIndex]
        if (!aiMsg.events) aiMsg.events = []
        aiMsg.events.push(value)
        aiMsg.currentStep = value.step

        // answer 是最终回答的流式分块，完整文本会由 finish 事件携带，故不重复拼接到 content
        if (value.type === 'answer') {
          await scrollToBottom()
          continue
        }

        // 同时拼接 content 用于向后兼容的文本展示和历史消息恢复
        const labelMap = { think: '[思考]', tool_call: '[工具调用]', tool_result: '[工具结果]', finish: '[最终回答]' }
        const label = labelMap[value.type] || ''
        aiMsg.content += (label ? label + ' ' : '') + value.content + '\n'
      } else {
        // Chat 模式或旧格式纯文本
        messages.value[aiMessageIndex].content += value
      }

      await scrollToBottom()
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    if (chatId.value === targetChatId) {
      messages.value[aiMessageIndex].content = '抱歉，出现了一些问题，请稍后再试。'
    }
  } finally {
    isSending.value = false
    isLoading.value = false
    await scrollToBottom()
    // 首轮完成后刷新侧边栏（会话名/内容已更新）
    if (chatId.value === targetChatId) {
      await loadSessions()
    }
  }
}

const onModeChange = () => {
  // 切换模式时保留对话内容，不做清空，并持久化当前模式（刷新后恢复）
  localStorage.setItem('chatMode', chatMode.value)
}

const onModelChange = () => {
  // 持久化当前模型选择（刷新后恢复）
  localStorage.setItem('selectedModel', selectedModel.value)
}

// 按 step 编号分组事件
const groupedEvents = (events) => {
  if (!events || !events.length) return []
  const groups = {}
  for (const e of events) {
    const key = e.step || 0
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  return Object.values(groups)
}

// 格式化工具调用 JSON 为可读文本
const formatToolCalls = (content) => {
  try {
    const calls = JSON.parse(content)
    if (Array.isArray(calls)) {
      return calls.map(c => `${c.name}(${c.arguments})`).join('；')
    }
  } catch {
    // 非 JSON 格式，直接返回
  }
  return content
}

// 判断步骤中是否包含工具相关事件
const hasToolEvents = (stepEvents) => {
  return stepEvents.some(e => e.type === 'tool_call' || e.type === 'tool_result')
}

// 判断步骤中是否有思考或工具事件
const hasThinkOrToolEvents = (stepEvents) => {
  return stepEvents.some(e => e.type === 'think' || e.type === 'tool_call' || e.type === 'tool_result')
}

// 获取步骤编号
const getStepNumber = (stepEvents) => {
  if (!stepEvents || !stepEvents.length) return 0
  return stepEvents[0].step || 0
}

// 获取某步骤的最终回答文本：优先 finish 完整文本，否则拼接 answer 流式分块
const getAnswerText = (stepEvents) => {
  if (!stepEvents || !stepEvents.length) return ''
  const finish = stepEvents.find(e => e.type === 'finish')
  if (finish) return finish.content
  return stepEvents.filter(e => e.type === 'answer').map(e => e.content).join('')
}

// Session sidebar methods
const loadSessions = async () => {
  loadingSessions.value = true
  try {
    const res = await chatMemoryApi.getAllConversationsSummary()
    if (res.code === 200 && res.data) {
      sessions.value = Object.entries(res.data).map(([id, info]) => ({
        id,
        name: info.name || id
      }))
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
  } finally {
    loadingSessions.value = false
  }
}

const handleNewChat = async () => {
  creatingNew.value = true
  try {
    const res = await chatMemoryApi.newConversationId()
    if (res.code === 200) {
      chatId.value = res.data
      messages.value = []
      router.replace({ path: '/chat-room', query: { conversationId: res.data } })
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('创建会话失败')
  } finally {
    creatingNew.value = false
  }
}

const enterSession = async (id) => {
  const isDifferent = id !== chatId.value
  chatId.value = id
  if (isDifferent) messages.value = []
  stopPolling()
  router.replace({ path: '/chat-room', query: { conversationId: id } })

  try {
    await loadMessages(id)
  } catch (error) {
    console.error('加载会话消息失败:', error)
    if (isDifferent) messages.value = []
    ElMessage.error('加载会话消息失败')
  }
}

const handleRename = async (session) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的会话名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: session.name
    })
    if (value && value.trim()) {
      const res = await chatMemoryApi.updateConversationName(session.id, value.trim())
      if (res.code === 200) {
        session.name = value.trim()
        ElMessage.success('重命名成功')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重命名失败:', error)
    }
  }
}

const handleDelete = async (id) => {
  try {
    const res = await chatMemoryApi.deleteConversation(id)
    if (res.code === 200) {
      sessions.value = sessions.value.filter(s => s.id !== id)
      if (id === chatId.value) {
        chatId.value = ''
        messages.value = []
      }
      ElMessage.success('删除成功')
    }
  } catch (error) {
    console.error('删除会话失败:', error)
    ElMessage.error('删除会话失败')
  }
}

// Document management
const loadDocs = async () => {
  loadingDocs.value = true
  try {
    const res = await documentApi.list()
    if (res.code === 200 && res.data) {
      docs.value = res.data
      searchResults.value = null
    }
  } catch (error) {
    console.error('获取文档列表失败:', error)
  } finally {
    loadingDocs.value = false
  }
}

const handleDocSearch = async () => {
  if (!searchQuery.value.trim()) {
    await loadDocs()
    return
  }
  searching.value = true
  try {
    const res = await documentApi.search(searchQuery.value.trim())
    if (res.code === 200 && res.data) {
      searchResults.value = res.data
    }
  } catch (error) {
    console.error('搜索文档失败:', error)
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

const handleFileChange = async (file) => {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.raw)
    const res = await documentApi.upload(formData)
    if (res.code === 200) {
      ElMessage.success('上传成功')
      await loadDocs()
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (error) {
    console.error('上传文档失败:', error)
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
  }
}

const handleDocDelete = async (id) => {
  try {
    const res = await documentApi.deleteById(id)
    if (res.code === 200) {
      docs.value = docs.value.filter(d => d.id !== id)
      if (searchResults.value !== null) {
        searchResults.value = searchResults.value.filter(d => d.id !== id)
      }
      ElMessage.success('删除成功')
    }
  } catch (error) {
    console.error('删除文档失败:', error)
    ElMessage.error('删除失败')
  }
}

const handleDocDownload = async (doc) => {
  try {
    await documentApi.downloadById(doc.id, doc.fileName)
  } catch (error) {
    console.error('下载文档失败:', error)
    ElMessage.error('下载失败')
  }
}

watch(activeSidebarTab, (newTab) => {
  if (newTab === 'documents') {
    loadDocs()
  }
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    try {
      await logout()
    } catch (error) {
      console.error('登出请求失败', error)
    } finally {
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await loadSessions()

  if (route.query.conversationId) {
    chatId.value = route.query.conversationId
    // 加载已有会话的历史消息（回复未完成时自动轮询恢复）
    try {
      await loadMessages(chatId.value)
    } catch (error) {
      console.error('加载会话消息失败:', error)
    }
  } else {
    try {
      const res = await chatMemoryApi.newConversationId()
      chatId.value = res.data
      router.replace({ path: '/chat-room', query: { conversationId: res.data } })
    } catch (error) {
      console.error('获取会话ID失败:', error)
    }
  }
})

onUnmounted(stopPolling)
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

// ========== 玻璃态主题变量 ==========
.chat-layout {
  --glass-bg: rgba(255, 255, 255, 0.07);
  --glass-bg-strong: rgba(255, 255, 255, 0.12);
  --glass-border: rgba(255, 255, 255, 0.14);
  --text-primary: #f4f7fb;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.38);
  --accent: #5eead4;
  --accent-deep: #2dd4bf;

  position: relative;
  display: flex;
  height: 100vh;
  background-image: url('@/assets/back.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  font-family: 'Poppins', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;

  // 深色遮罩层，让玻璃面板与白色文字清晰可读
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    background: rgba(12, 18, 30, 0.72);
    pointer-events: none;
  }
}

// ---- 自定义滚动条 ----
.sidebar,
.session-list,
.doc-list,
.chat-messages {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.16);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

// ---- Sidebar ----
.sidebar {
  position: relative;
  z-index: 1;
  width: 280px;
  flex-shrink: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  color: var(--text-primary);

  .sidebar-header {
    padding: 20px 18px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--text-primary);
      margin: 0;
    }

    :deep(.el-button) {
      background: var(--glass-bg-strong);
      border-color: var(--glass-border);
      color: #fff;
      border-radius: 10px;
      transition: all 0.25s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.22);
        border-color: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
  }

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 2px 10px;
    padding: 11px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);

      .session-actions {
        opacity: 1;
      }
    }

    &.active {
      background: linear-gradient(135deg, rgba(94, 234, 212, 0.22), rgba(45, 212, 191, 0.1));
      box-shadow: inset 0 0 0 1px rgba(94, 234, 212, 0.35);

      .session-name {
        color: #fff;
      }
    }

    .session-name {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-actions {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;

      :deep(.el-button) {
        color: var(--text-secondary);

        &:hover {
          color: #fff;
        }
      }
    }
  }
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 6px 16px 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
  }

  :deep(.el-tabs__item) {
    color: var(--text-secondary);
    font-size: 14px;

    &.is-active {
      color: #fff;
    }
  }

  :deep(.el-tabs__active-bar) {
    background: var(--accent);
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tab-pane) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.doc-search-bar {
  display: flex;
  gap: 8px;
  padding: 14px 16px 6px;

  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: none;
    border: 1px solid var(--glass-border);
    border-radius: 10px;

    .el-input__inner {
      color: var(--text-primary);

      &::placeholder {
        color: var(--text-tertiary);
      }
    }
  }

  :deep(.el-button) {
    background: var(--accent);
    border-color: var(--accent);
    color: #0c2230;
    border-radius: 10px;

    &:hover {
      background: #7ff0dd;
      border-color: #7ff0dd;
    }
  }
}

.doc-upload-bar {
  padding: 6px 16px 8px;

  :deep(.el-button) {
    background: transparent;
    border-color: var(--glass-border);
    color: var(--text-primary);
    border-radius: 10px;
    transition: all 0.25s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }
}

.doc-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  .doc-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 2px 10px;
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.08);

      .doc-actions {
        opacity: 1;
      }
    }

    &.active {
      background: linear-gradient(135deg, rgba(94, 234, 212, 0.22), rgba(45, 212, 191, 0.1));
      box-shadow: inset 0 0 0 1px rgba(94, 234, 212, 0.35);

      .doc-name {
        color: #fff;
      }
    }

    .doc-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .doc-actions {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;

      :deep(.el-button) {
        color: var(--text-secondary);

        &:hover {
          color: #fff;
        }
      }
    }
  }
}

:deep(.el-empty__description p) {
  color: var(--text-tertiary);
}

// ---- Main area ----
.main-area {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

// ---- Header ----
.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--glass-border);
  gap: 16px;

  .header-left {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;

    :deep(.el-radio-button__inner) {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      transition: all 0.25s ease;
    }

    :deep(.el-radio-button:first-child .el-radio-button__inner) {
      border-radius: 10px 0 0 10px;
    }

    :deep(.el-radio-button:last-child .el-radio-button__inner) {
      border-radius: 0 10px 10px 0;
    }

    :deep(.el-radio-button.is-active .el-radio-button__inner) {
      background: rgba(255, 255, 255, 0.95);
      color: #0f1c2b;
      border-color: transparent;
      box-shadow: none;
    }

    .model-select {
      width: 128px;
    }

    :deep(.model-select .el-select__wrapper) {
      background: rgba(255, 255, 255, 0.06);
      box-shadow: none;
      border: 1px solid var(--glass-border);
      border-radius: 10px;
    }

    :deep(.model-select .el-select__wrapper.is-focused) {
      box-shadow: 0 0 0 1px var(--accent) inset;
    }

    :deep(.model-select .el-select__placeholder) {
      color: var(--text-tertiary);
    }

    :deep(.model-select .el-select__selected-item) {
      color: var(--text-primary);
    }

    :deep(.model-select .el-select__caret) {
      color: var(--text-secondary);
    }
  }

  .chat-title {
    flex: 1;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--text-primary);
  }

  .header-right {
    flex-shrink: 0;

    .user-info {
      .user-avatar {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 20px;
        transition: all 0.3s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        :deep(.el-avatar) {
          background: linear-gradient(135deg, var(--accent), var(--accent-deep));
          color: #0c2230;
        }

        .username {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
      }

      .user-detail {
        padding: 4px 0;

        p {
          margin: 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);

          .el-icon {
            color: var(--accent);
          }
        }
      }
    }
  }
}

// ---- Messages ----
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px;

  .message {
    display: flex;
    margin-bottom: 20px;
    animation: messageIn 0.35s ease both;

    &.user {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;

        .message-bubble {
          background: rgba(255, 255, 255, 0.95);
          color: #1e2a3a;
          border-radius: 18px 18px 4px 18px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .message-time {
          text-align: right;
          color: rgba(255, 255, 255, 0.45);
        }
      }
    }

    &.ai {
      .message-content {
        align-items: flex-start;

        .message-bubble {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        .message-time {
          color: rgba(255, 255, 255, 0.45);
        }
      }
    }

    .message-avatar {
      flex-shrink: 0;
      margin: 0 10px;

      :deep(.el-avatar) {
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      }
    }

    &.user .message-avatar :deep(.el-avatar) {
      background: #fff;
      color: #0f1c2b;
    }

    &.ai .message-avatar :deep(.el-avatar) {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #0c2230;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 72%;

      .message-bubble {
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.65;
        word-wrap: break-word;

        // Agent 模式结构化事件样式
        .step-block {
          margin-bottom: 6px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        .think-event {
          .think-collapse {
            border: none;
            background: transparent;

            :deep(.el-collapse-item__header) {
              font-size: 13px;
              color: var(--text-secondary);
              height: 32px;
              line-height: 32px;
              border: none;
              background: transparent;
              padding: 0 4px;
            }

            :deep(.el-collapse-item__wrap) {
              border: none;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 8px;
              margin: 4px 0;
            }

            :deep(.el-collapse-item__content) {
              padding: 10px 14px;
              font-size: 13px;
              color: rgba(255, 255, 255, 0.75);
              line-height: 1.7;
              white-space: pre-wrap;
              word-break: break-word;
            }
          }

          .think-icon {
            margin-right: 6px;
            font-size: 14px;
          }

          .tool-section {
            margin-top: 10px;

            .tool-section-divider {
              text-align: center;
              font-size: 12px;
              color: var(--text-tertiary);
              margin-bottom: 8px;
            }
          }
        }

        .thinking-content {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .tool-call-info {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 4px 0;

          .tool-call-tag {
            flex-shrink: 0;
            background: rgba(94, 234, 212, 0.16);
            border-color: rgba(94, 234, 212, 0.4);
            color: var(--accent);
          }

          .tool-call-detail {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.5;
            word-break: break-all;
          }
        }

        .tool-result {
          .tool-result-text {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
          }
        }

        .finish-answer {
          padding-top: 4px;
        }

        :deep(.el-alert) {
          border-radius: 8px;

          &.el-alert--warning {
            background: rgba(250, 173, 20, 0.12);
            border: 1px solid rgba(250, 173, 20, 0.3);

            .el-alert__title {
              color: #fcd34d;
            }

            .el-alert__icon {
              color: #fbbf24;
            }
          }
        }
      }

      .message-time {
        font-size: 12px;
        margin-top: 5px;
      }
    }
  }
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ---- Typing animation ----
.typing {
  display: flex;
  gap: 4px;
  padding: 8px 2px;

  .dot {
    animation: typing 1.4s infinite;
    font-size: 22px;
    line-height: 1;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

// ---- Input ----
.chat-input {
  padding: 16px 20px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--glass-border);

  .input-wrapper {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 12px 12px 12px 18px;
    border: 1px solid var(--glass-border);
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.16);
    }

    .message-textarea {
      flex: 1;

      :deep(.el-textarea__inner) {
        background-color: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
        font-size: 15px;
        line-height: 1.5;
        max-height: 200px;
        resize: none;
        color: var(--text-primary);
        caret-color: var(--accent);

        &::placeholder {
          color: var(--text-tertiary);
        }
      }
    }

    .send-button {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), var(--accent-deep)) !important;
      border: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;

      .el-icon {
        font-size: 18px;
        color: #0c2230;
      }

      &:hover:not(.is-disabled) {
        background: linear-gradient(135deg, #7ff0dd, #34d6bf) !important;
        filter: brightness(1.05);
        box-shadow: 0 4px 14px rgba(45, 212, 191, 0.4);
      }

      &:disabled {
        background: rgba(255, 255, 255, 0.12) !important;
        cursor: not-allowed;

        .el-icon {
          color: var(--text-tertiary);
        }
      }
    }
  }
}
</style>

<style lang="scss">
// popper 挂载在 body，需全局样式；用特定 class 限定，避免污染其他页面
.glass-popper.el-popper {
  background: rgba(20, 27, 42, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  color: #f4f7fb;

  .el-popper__arrow::before {
    background: rgba(20, 27, 42, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }
}

.glass-popper .el-dropdown-menu {
  background: transparent;
  padding: 6px;

  .el-dropdown-menu__item {
    color: rgba(255, 255, 255, 0.85);

    &:hover,
    &:focus {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
  }

  .el-dropdown-menu__item--divided {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
}

.glass-popper.el-popconfirm {
  .el-popconfirm__main {
    color: #f4f7fb;
  }

  .el-button {
    border-radius: 9px;

    &.el-button--primary {
      background: #2dd4bf;
      border-color: #2dd4bf;
      color: #0c2230;

      &:hover {
        background: #5eead4;
        border-color: #5eead4;
      }
    }

    &:not(.el-button--primary) {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.85);

      &:hover {
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
      }
    }
  }
}
</style>
