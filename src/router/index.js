import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/chat-room',
  },
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

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')
  const isAuthPage = to.path === '/login' || to.path === '/register'

  if (!token && !isAuthPage) {
    return '/login'
  }
  if (token && isAuthPage) {
    return '/chat-room'
  }
})

export default router
