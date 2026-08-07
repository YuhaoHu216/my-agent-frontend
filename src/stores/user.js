import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCurrentUser } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  function setToken(val) {
    token.value = val
  }

  function setUserInfo(obj) {
    userInfo.value = obj
  }

  function logout() {
    token.value = ''
    userInfo.value = null
  }

  async function fetchUserInfo() {
    const res = await getCurrentUser()
    userInfo.value = res.data
  }

  return { token, userInfo, isLoggedIn, setToken, setUserInfo, logout, fetchUserInfo }
}, {
  persist: {
    key: 'my-agent-user',
    pick: ['token'],
  },
})
