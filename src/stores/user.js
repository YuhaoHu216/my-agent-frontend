import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref('')

  function setToken(val) {
    token.value = val
  }

  function logout() {
    token.value = ''
  }

  return { token, setToken, logout }
}, {
  persist: true,
})
