<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>AI 旅行社</h1>
      <p class="subtitle">让 AI 为你规划完美旅程</p>

      <div class="tabs">
        <button :class="{ active: isLogin }" @click="isLogin = true">登录</button>
        <button :class="{ active: !isLogin }" @click="isLogin = false">注册</button>
      </div>

      <form @submit.prevent="isLogin ? handleLogin() : handleRegister()">
        <div v-if="!isLogin" class="form-group">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="3-50 个字符" required />
        </div>

        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" placeholder="your@email.com" required />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少 8 位" required />
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    if (!res.ok) throw new Error('登录失败')
    const data = await res.json()
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    router.push('/plans/new')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })
    if (!res.ok) throw new Error('注册失败')
    isLogin.value = true
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 400px;
}
.auth-card h1 { text-align: center; color: #333; }
.subtitle { text-align: center; color: #666; margin-bottom: 1.5rem; }
.tabs { display: flex; gap: 0; margin-bottom: 1.5rem; }
.tabs button {
  flex: 1; padding: 0.5rem; border: none; background: #f0f0f0; cursor: pointer;
  font-size: 1rem; transition: all 0.2s;
}
.tabs button.active { background: #667eea; color: white; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
.form-group input {
  width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;
}
.btn-primary {
  width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none;
  border-radius: 6px; font-size: 1rem; cursor: pointer; margin-top: 0.5rem;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: red; text-align: center; margin-top: 1rem; }
</style>
