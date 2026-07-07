import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('accessToken') || '')
  const isAuthenticated = ref(!!token.value)

  function setTokens(accessToken: string, refreshToken: string) {
    token.value = accessToken
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    isAuthenticated.value = true
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    isAuthenticated.value = false
  }

  return { token, isAuthenticated, setTokens, logout }
})
