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
        </div>
        <span class="chat-title">{{ chatMode === 'chat' ? 'AI 助手' : 'AI 超级智能体' }}</span>
        <div class="header-right">
          <div class="user-info" v-if="userInfo">
            <el-dropdown trigger="click">
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
              <template v-if="message.content">
                <template v-if="chatMode === 'agent' && message.role === 'ai'">
                  <div v-for="(line, idx) in formatContent(message.content)" :key="idx" class="message-line">
                    {{ line }}
                  </div>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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
  Upload
} from '@element-plus/icons-vue'
import { aiApi } from '@/api/ai'
import { chatMemoryApi } from '@/api/chatMemory'
import { documentApi } from '@/api/document'
import { userApi } from '@/api/user'

const router = useRouter()
const route = useRoute()

// Chat mode: 'chat' or 'agent'
const chatMode = ref('chat')
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const chatId = ref('')
const messagesContainer = ref(null)

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

// User info
const userInfo = ref(null)

const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
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

  try {
    const stream = chatMode.value === 'agent'
      ? aiApi.doChatWithManus(userMessage, chatId.value)
      : aiApi.doChatWithLoveAppSse(userMessage, chatId.value)
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      messages.value[aiMessageIndex].content += value
      await scrollToBottom()
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    messages.value[aiMessageIndex].content = '抱歉，出现了一些问题，请稍后再试。'
  } finally {
    isSending.value = false
    isLoading.value = false
    await scrollToBottom()
    // 首次发消息后刷新侧边栏（新会话可能不在列表中）
    if (!sessions.value.some(s => s.id === chatId.value)) {
      await loadSessions()
    }
  }
}

const onModeChange = () => {
  // 切换模式时保留对话内容，不做清空
}

const formatContent = (content) => {
  if (!content) return []

  const lines = content.split(/(Step \d+:)/g)
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('Step')) {
      result.push(line)
    } else {
      if (result.length > 0) {
        result[result.length - 1] += ' ' + line
      } else {
        result.push(line)
      }
    }
  }

  return result
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
      await loadSessions()
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
  router.replace({ path: '/chat-room', query: { conversationId: id } })

  try {
    const res = await chatMemoryApi.getConversationMessages(id)
    if (res.code === 200 && Array.isArray(res.data)) {
      messages.value = res.data.map(msg => ({
        role: msg.role === 'USER' ? 'user' : 'ai',
        content: msg.text || '',
        time: ''
      }))
      await scrollToBottom()
    }
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

// User info
const loadUserInfo = async () => {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const res = await userApi.getUserInfo()
    if (res.code === 200) {
      userInfo.value = res.data
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    try {
      await userApi.logout()
    } catch (error) {
      console.error('登出请求失败', error)
    } finally {
      localStorage.removeItem('token')
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
  loadUserInfo()
  await loadSessions()

  if (route.query.conversationId) {
    chatId.value = route.query.conversationId
    // 加载已有会话的历史消息
    try {
      const res = await chatMemoryApi.getConversationMessages(chatId.value)
      if (res.code === 200 && res.data) {
        messages.value = res.data.map(msg => ({
          role: msg.role === 'USER' ? 'user' : 'ai',
          content: msg.text || '',
          time: ''
        }))
        await scrollToBottom()
      }
    } catch (error) {
      console.error('加载会话消息失败:', error)
    }
  } else {
    try {
      const res = await chatMemoryApi.newConversationId()
      chatId.value = res.data
      router.replace({ path: '/chat-room', query: { conversationId: res.data } })
      // 新建会话后刷新侧边栏
      await loadSessions()
    } catch (error) {
      console.error('获取会话ID失败:', error)
    }
  }
})
</script>

<style scoped lang="scss">
.chat-layout {
  display: flex;
  height: 100vh;
}

// ---- Sidebar ----
.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
  }

  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;

      .session-actions {
        opacity: 1;
      }
    }

    &.active {
      background-color: #e6f7ff;
      border-right: 3px solid #409eff;
    }

    .session-name {
      flex: 1;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-actions {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
  }
}

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 16px;
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
  padding: 12px 16px;

  .el-input {
    flex: 1;
  }
}

.doc-upload-bar {
  padding: 0 16px 8px;
}

.doc-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  .doc-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;

      .doc-actions {
        opacity: 1;
      }
    }

    &.active {
      background-color: #e6f7ff;
      border-right: 3px solid #409eff;
    }

    .doc-name {
      flex: 1;
      font-size: 13px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .doc-actions {
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
  }
}

// ---- Main area ----
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #f5f5f5;
}

// ---- Header ----
.chat-header {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  gap: 16px;

  .header-left {
    flex-shrink: 0;
  }

  .chat-title {
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .header-right {
    flex-shrink: 0;

    .user-info {
      .user-avatar {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 12px;
        border-radius: 20px;
        transition: all 0.3s ease;

        &:hover {
          background-color: #f0f0f0;
        }

        .username {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
      }

      .user-detail {
        padding: 8px 0;

        p {
          margin: 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #666;

          .el-icon {
            color: #409eff;
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
  padding: 20px;

  .message {
    display: flex;
    margin-bottom: 20px;

    &.user {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;

        .message-bubble {
          border-radius: 16px 16px 0 16px;
        }

        .message-time {
          text-align: right;
        }
      }

      &.chat .message-bubble {
        background-color: #409eff;
        color: #fff;
      }

      &.agent .message-bubble {
        background-color: #67c23a;
        color: #fff;
      }
    }

    &.ai {
      .message-content {
        align-items: flex-start;

        .message-bubble {
          background-color: #fff;
          color: #333;
          border-radius: 16px 16px 16px 0;
        }
      }
    }

    .message-avatar {
      flex-shrink: 0;
      margin: 0 10px;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 70%;

      .message-bubble {
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;

        .message-line {
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .message-time {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
    }
  }
}

// ---- Typing animation ----
.typing {
  display: flex;
  gap: 4px;
  padding: 16px;

  .dot {
    animation: typing 1.4s infinite;
    font-size: 20px;
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
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

// ---- Input ----
.chat-input {
  padding: 20px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;

  .input-wrapper {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    background-color: #f7f7f8;
    border-radius: 16px;
    padding: 12px 16px;
    border: 1px solid #e5e5e5;
    transition: border-color 0.2s;

    &:focus-within {
      border-color: #10a37f;
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

        &::placeholder {
          color: #8e8ea0;
        }
      }
    }

    .send-button {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background-color: #10a37f;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;

      &:hover {
        background-color: #0e8b6d;
      }

      &:disabled {
        background-color: #d1d5db;
        cursor: not-allowed;
      }

      .el-icon {
        font-size: 18px;
        color: #fff;
      }
    }
  }
}
</style>
