<template>
  <div class="home-layout">
    <div class="sidebar">
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
          class="session-item"
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
    </div>

    <div class="home">
      <div class="header">
        <div class="header-top">
          <h1>应用中心</h1>
          <div class="user-info" v-if="userInfo">
            <el-dropdown trigger="click">
              <div class="user-avatar">
                <el-avatar :size="40" :icon="UserFilled" />
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
        <p class="subtitle">请选择您要使用的应用</p>
      </div>

      <div class="app-list">
        <div class="app-card" @click="navigateTo('/chat-room')">
          <div class="app-icon">
            <el-icon :size="48"><ChatDotRound /></el-icon>
          </div>
          <h2 class="app-name">AI 助手</h2>
          <p class="app-description">智能对话助手，随时为您解答问题</p>
          <div class="app-enter">
            <span>进入应用</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="app-card" @click="navigateTo('/manus-chat')">
          <div class="app-icon">
            <el-icon :size="48"><Cpu /></el-icon>
          </div>
          <h2 class="app-name">AI 超级智能体</h2>
          <p class="app-description">强大的 AI 智能体，处理复杂任务</p>
          <div class="app-enter">
            <span>进入应用</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Cpu,
  ArrowRight,
  UserFilled,
  User,
  Message,
  Phone,
  Calendar,
  SwitchButton,
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { userApi } from '../api/user'
import { chatMemoryApi } from '../api/chatMemory'

const router = useRouter()
const userInfo = ref(null)
const sessions = ref([])
const loadingSessions = ref(false)
const creatingNew = ref(false)

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
      router.push({ path: '/chat-room', query: { conversationId: res.data } })
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('创建会话失败')
  } finally {
    creatingNew.value = false
  }
}

const enterSession = (conversationId) => {
  router.push({ path: '/chat-room', query: { conversationId } })
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

const handleDelete = async (conversationId) => {
  try {
    const res = await chatMemoryApi.deleteConversation(conversationId)
    if (res.code === 200) {
      sessions.value = sessions.value.filter(s => s.id !== conversationId)
      ElMessage.success('删除成功')
    }
  } catch (error) {
    console.error('删除会话失败:', error)
    ElMessage.error('删除会话失败')
  }
}

const navigateTo = (path) => {
  router.push(path)
}

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

onMounted(() => {
  loadUserInfo()
  loadSessions()
})
</script>

<style scoped lang="scss">
.home-layout {
  display: flex;
  height: 100vh;
}

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

.home {
  flex: 1;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  overflow-y: auto;
}

.header {
  text-align: center;
  color: #fff;
  margin-bottom: 40px;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    h1 {
      font-size: 36px;
      font-weight: 600;
    }
  }

  .subtitle {
    font-size: 16px;
    opacity: 0.9;
  }

  .user-info {
    .user-avatar {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .username {
        font-size: 14px;
        font-weight: 500;
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

.app-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.app-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .app-icon {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;

    &:first-child {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }

    &:nth-child(2) {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: #fff;
    }
  }

  .app-name {
    font-size: 24px;
    color: #333;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .app-description {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .app-enter {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #409eff;
    font-size: 14px;
    font-weight: 500;

    .el-icon {
      transition: transform 0.3s ease;
    }

    &:hover {
      .el-icon {
        transform: translateX(4px);
      }
    }
  }
}
</style>
