import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { injectRouter } from '@/utils/request'

const routes = [
  {
    path: '/',
    redirect: '/chat-room',
  },
  {
    path: '/home',
    redirect: '/chat-room',
  },
  {
    path: '/chat-room',
    name: 'ChatRoom',
    component: () => import('../views/ChatRoom.vue'),
    meta: { title: 'AI 助手', auth: true },
  },
  {
    path: '/mcp-config',
    name: 'McpConfig',
    component: () => import('../views/McpConfig.vue'),
    meta: { title: 'MCP 配置', auth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/chat-room',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 将 router 注入 request.js，使 401 拦截器能跳转登录页
injectRouter(router)

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - My Agent` : 'My Agent'

  const userStore = useUserStore()

  // 有 token 但无 userInfo，先获取用户信息（无论目标页面是否需要认证）
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch {
      userStore.logout()
      // 仅当目标页面需要认证时才拦截跳转登录页
      if (to.meta.auth) {
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }
    }
  }

  // 需要认证的页面：检查 token
  if (to.meta.auth) {
    if (!userStore.token) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
  }

  // 已登录用户访问登录/注册页 → 跳聊天页
  if ((to.name === 'Login' || to.name === 'Register') && userStore.token) {
    return next({ path: '/chat-room' })
  }

  next()
})

export default router
