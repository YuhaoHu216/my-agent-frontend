import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/chat-room',
    name: 'ChatRoom',
    component: () => import('../views/ChatRoom.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const WHITE_LIST = ['/login', '/register']

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')

  // 白名单路由直接放行
  if (WHITE_LIST.includes(to.path)) {
    return true
  }

  // 无 token：重定向到登录页，携带目标路径用于登录后回跳
  if (!token) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  // 有 token 但访问根路径：重定向到 chat-room
  if (to.path === '/') {
    return '/chat-room'
  }

  // 有 token 访问受保护路由：放行
  return true
})

export default router
