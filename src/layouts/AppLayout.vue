<template>
  <div class="app-layout">
    <!-- ===== 左：常驻侧边栏 ===== -->
    <aside class="layout-sidebar">
      <!-- 上半部：品牌 + 新聊天 + 主导航 -->
      <div class="sidebar-top">
        <div class="brand">My Agent</div>
        <el-button class="new-chat-btn" :loading="chatStore.creatingNew" @click="chatStore.newChat()">
          <el-icon><Plus /></el-icon> 新聊天
        </el-button>
        <nav class="main-nav">
          <div class="nav-item" :class="{ active: route.name === 'Documents' }" @click="router.push('/documents')">
            <el-icon><Document /></el-icon><span>文档</span>
          </div>
          <div class="nav-item" :class="{ active: route.name === 'LlmConfig' }" @click="router.push('/llm-config')">
            <el-icon><Cpu /></el-icon><span>LLM 配置</span>
          </div>
          <div class="nav-item" :class="{ active: route.name === 'McpConfig' }" @click="router.push('/mcp-config')">
            <el-icon><SetUp /></el-icon><span>MCP 配置</span>
          </div>
        </nav>
      </div>

      <div class="nav-divider"></div>

      <!-- 下半部：历史会话列表 -->
      <div class="session-area">
        <div class="session-head">
          <span>历史会话</span>
        </div>
        <div class="session-list" v-loading="chatStore.loadingSessions">
          <div
            v-for="session in chatStore.sessions"
            :key="session.id"
            :class="['session-item', { active: session.id === chatStore.currentChatId }]"
            @click="chatStore.enterSession(session.id)"
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
                @confirm="chatStore.deleteSession(session.id)"
              >
                <template #reference>
                  <el-button link size="small" @click.stop>
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </span>
          </div>
          <el-empty
            v-if="!chatStore.loadingSessions && chatStore.sessions.length === 0"
            description="暂无历史会话"
            :image-size="60"
          />
        </div>
      </div>

      <!-- 底部：用户信息 + 退出 -->
      <div class="sidebar-footer" v-if="userStore.userInfo">
        <el-dropdown trigger="click" popper-class="glass-popper">
          <div class="user-avatar">
            <el-avatar :size="30" :icon="UserFilled" />
            <span class="username">{{ userStore.userInfo.username }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item divided @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <!-- ===== 右：内容区 ===== -->
    <main class="layout-main">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['ChatRoom']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Document,
  Cpu,
  SetUp,
  Edit,
  Delete,
  UserFilled,
  SwitchButton,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { logout } from '@/api/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const handleRename = async (session) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的会话名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: session.name,
    })
    if (value && value.trim()) {
      chatStore.renameSession(session.id, value.trim())
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重命名失败:', error)
    }
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    try {
      await logout()
    } catch (error) {
      console.error('登出请求失败', error)
    } finally {
      chatStore.reset()
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

onMounted(() => {
  chatStore.loadSessions()
})
</script>

<style scoped>
.main-nav .nav-item {
  cursor: pointer;
  user-select: none;
}
</style>
