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

const WHITE_LIST = ['/login', '/register']

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')

  if (WHITE_LIST.includes(to.path)) {
    return
  }

  if (!token) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }
})

export default router
