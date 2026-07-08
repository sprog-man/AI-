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
          <input v-model="username" type="text" placeholder="3-50 个字符，仅字母数字下划线" required />
          <small v-if="errors.username" class="error-msg">{{ errors.username }}</small>
        </div>

        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" placeholder="your@email.com" required />
          <small v-if="errors.email" class="error-msg">{{ errors.email }}</small>
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少 8 位，含大小写字母+数字+特殊字符" required />
          <div v-if="!isLogin" class="password-strength">
            <div class="strength-bar" :class="strengthClass"></div>
            <span class="strength-text">{{ strengthText }}</span>
          </div>
          <small v-if="errors.password" class="error-msg">{{ errors.password }}</small>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const errors = ref<Record<string, string>>({})

// Password strength checker
const strengthClass = computed(() => {
  if (!password.value) return ''
  const p = password.value
  let score = 0
  if (p.length >= 8) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^a-zA-Z0-9]/.test(p)) score++
  switch (score) {
    case 0: case 1: return 'weak'
    case 2: return 'fair'
    case 3: return 'good'
    case 4: return 'strong'
    default: return ''
  }
})

const strengthText = computed(() => {
  switch (strengthClass.value) {
    case 'weak': return '弱 — 请增加长度和复杂度'
    case 'fair': return '一般 — 建议添加特殊字符'
    case 'good': return '良好'
    case 'strong': return '强'
    default: return ''
  }
})

function validateAuthForm(): boolean {
  const errs: Record<string, string> = {}

  if (!isLogin.value) {
    // Username validation
    if (!username.value || username.value.trim().length < 3) {
      errs.username = '用户名至少 3 个字符'
    } else if (username.value.length > 50) {
      errs.username = '用户名不能超过 50 个字符'
    } else if (/[^a-zA-Z0-9_一-龥]/.test(username.value)) {
      errs.username = '用户名不能包含特殊字符'
    }

    // Password validation
    if (!password.value || password.value.length < 8) {
      errs.password = '密码至少 8 位'
    } else if (!/[a-z]/.test(password.value) || !/[A-Z]/.test(password.value)) {
      errs.password = '密码需包含大小写字母'
    } else if (!/\d/.test(password.value)) {
      errs.password = '密码需包含数字'
    } else if (!/[^a-zA-Z0-9]/.test(password.value)) {
      errs.password = '密码需包含特殊字符'
    }
  }

  // Email validation (both login and register)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value || !emailRegex.test(email.value)) {
    errs.email = '请输入有效的邮箱地址'
  }

  errors.value = errs
  return Object.keys(errs).length === 0
}

async function handleLogin() {
  loading.value = true
  error.value = ''
  errors.value = {}

  if (!validateAuthForm()) {
    loading.value = false
    return
  }

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || '登录失败')
    }
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
  errors.value = {}

  if (!validateAuthForm()) {
    loading.value = false
    return
  }

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value
      })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || '注册失败')
    }
    // Registration successful, switch to login tab
    isLogin.value = true
    error.value = '注册成功，请登录'
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
  max-width: 420px;
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
.form-group input:focus {
  outline: none; border-color: #667eea; box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
.form-group small { display: block; margin-top: 0.25rem; color: #999; font-size: 0.8rem; }
.error-msg { color: #dc3545 !important; }

/* Password strength */
.password-strength { margin-top: 0.25rem; }
.strength-bar {
  height: 4px; border-radius: 2px; transition: all 0.3s; width: 0;
}
.strength-bar.weak { width: 25%; background: #dc3545; }
.strength-bar.fair { width: 50%; background: #ffc107; }
.strength-bar.good { width: 75%; background: #17a2b8; }
.strength-bar.strong { width: 100%; background: #28a745; }
.strength-text { font-size: 0.75rem; margin-top: 0.15rem; display: block; }
.strength-text.weak { color: #dc3545; }
.strength-text.fair { color: #ffc107; }
.strength-text.good { color: #17a2b8; }
.strength-text.strong { color: #28a745; }

.btn-primary {
  width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none;
  border-radius: 6px; font-size: 1rem; cursor: pointer; margin-top: 0.5rem;
}
.btn-primary:hover:not(:disabled) { background: #5a6fd6; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: red; text-align: center; margin-top: 1rem; }
</style>
