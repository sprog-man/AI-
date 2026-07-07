import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<any[]>([])

  function addMessage(role: 'USER' | 'AGENT', content: string) {
    messages.value.push({ role, content, timestamp: new Date() })
  }

  function clearMessages() {
    messages.value = []
  }

  return { messages, addMessage, clearMessages }
})
