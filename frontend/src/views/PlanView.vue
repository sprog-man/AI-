<template>
  <div class="plan-detail">
    <!-- Header -->
    <div class="plan-header" v-if="plan">
      <h1>{{ plan.title }}</h1>
      <div class="meta">
        <span class="badge" :class="statusBadge">{{ statusText }}</span>
        <span>{{ plan.destinationCity }} | {{ plan.startDate }} ~ {{ plan.endDate }}</span>
        <span>{{ plan.travelMode === 'FLIGHT' ? '✈ 飞机' : plan.travelMode === 'HIGH_SPEED_RAIL' ? '🚄 高铁' : plan.travelMode === 'BUS' ? '🚌 大巴' : plan.travelMode === 'CAR' ? '🚗 自驾' : '🚲 骑行' }}</span>
        <span>{{ plan.budgetLevel === 'LOW' ? '💰 经济' : plan.budgetLevel === 'MEDIUM' ? '💰💰 标准' : '💰💰💰 豪华' }}</span>
      </div>
      <div class="actions">
        <button @click="goBack" class="btn-secondary">← 返回历史</button>
        <button v-if="plan.status === 'COMPLETED'" @click="toggleChat" class="btn-primary">💬 微调计划</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载计划...</p>
    </div>

    <!-- Error / Not Found -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <router-link to="/plans" class="btn-primary">返回历史列表</router-link>
    </div>

    <!-- Main Content -->
    <div v-if="plan && !loading" class="plan-content">
      <!-- Itinerary Section -->
      <section class="card" v-if="itinerary.length > 0">
        <h2>📋 行程安排</h2>
        <div v-for="(day, idx) in itinerary" :key="idx" class="day-card">
          <h3>第 {{ idx + 1 }} 天 — {{ day.date || `Day ${idx + 1}` }}</h3>
          <div v-if="day.activities && day.activities.length > 0">
            <div v-for="(act, aIdx) in day.activities" :key="aIdx" class="activity-item">
              <div class="time-badge">{{ act.time || '' }}</div>
              <div class="activity-info">
                <strong>{{ act.name }}</strong>
                <span class="type-tag" :class="act.type">{{ typeLabel(act.type) }}</span>
                <p v-if="act.description">{{ act.description }}</p>
                <p v-if="act.address" class="address">📍 {{ act.address }}</p>
              </div>
            </div>
          </div>
          <p v-else class="empty-hint">暂无行程安排，请尝试微调</p>
        </div>
      </section>

      <!-- Budget Section -->
      <section class="card" v-if="budgetSummary">
        <h2>💰 预算明细</h2>
        <table class="budget-table">
          <thead>
            <tr><th>类别</th><th>金额</th></tr>
          </thead>
          <tbody>
            <tr v-for="(val, key) in budgetSummary" :key="key">
              <td>{{ budgetLabel(key) }}</td>
              <td>¥{{ typeof val === 'number' ? val.toFixed(2) : val }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total"><td>总计</td><td>¥{{ budgetTotal }}</td></tr>
          </tfoot>
        </table>
      </section>
      <section class="card" v-else>
        <h2>💰 预算明细</h2>
        <p class="empty-hint">暂无预算信息</p>
      </section>

      <!-- Map Section -->
      <section class="card map-section" v-if="routes.length > 0">
        <h2>🗺️ 路线规划</h2>
        <div class="map-placeholder">
          <div v-for="(route, idx) in routes" :key="idx" class="route-item">
            <span>📍 {{ route.origin }} → 📍 {{ route.destination }}</span>
            <span v-if="route.distance">距离: {{ route.distance }}</span>
            <span v-if="route.duration">预计: {{ route.duration }}</span>
          </div>
        </div>
      </section>
      <section class="card map-section" v-else>
        <h2>🗺️ 路线规划</h2>
        <div class="map-placeholder">
          <p>路线规划不可用</p>
        </div>
      </section>

      <!-- Image Gallery -->
      <section class="card" v-if="images.length > 0">
        <h2>🖼️ 图片画廊</h2>
        <div class="image-grid">
          <div v-for="(img, idx) in images" :key="idx" class="image-item">
            <img :src="img.url" :alt="img.query || '景点图片'" @error="onImageError" />
            <span v-if="img.query" class="image-label">{{ img.query }}</span>
          </div>
        </div>
      </section>

      <!-- Weather -->
      <section class="card" v-if="weatherInfo">
        <h2>🌤️ 天气信息</h2>
        <p>{{ weatherInfo }}</p>
      </section>

      <!-- Chat Modification -->
      <section class="card chat-section" v-show="showChat">
        <h2>💬 微调计划</h2>
        <div class="chat-messages">
          <div v-for="(msg, idx) in chatMessages" :key="idx" class="chat-msg" :class="msg.role">
            <div class="msg-bubble">{{ msg.content }}</div>
          </div>
          <div v-if="chatLoading" class="chat-msg agent thinking">
            <div class="msg-bubble">AI 正在思考中... <button @click="cancelChat" class="btn-cancel">取消</button></div>
          </div>
        </div>
        <form @submit.prevent="sendChatMessage" class="chat-input-form">
          <input
            v-model="chatInput"
            type="text"
            placeholder="输入你的想法，如：第三天改成室内活动、预算太高了..."
            :disabled="chatLoading"
            ref="chatInputRef"
          />
          <button type="submit" :disabled="!chatInput.trim() || chatLoading">发送</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/auth'

const route = useRoute()
const router = useRouter()
const planId = computed(() => Number(route.params.id))

interface Plan {
  id: number
  title: string
  destinationCity: string
  departureCity: string
  startDate: string
  endDate: string
  travelMode: string
  budgetLevel: string
  preferences: string
  planData: string
  status: string
  createdAt: string
  updatedAt: string
}

const plan = ref<Plan | null>(null)
const loading = ref(true)
const error = ref('')
const showChat = ref(false)
const chatInput = ref('')
const chatMessages = ref<{ role: 'user' | 'agent'; content: string }[]>([])
const chatLoading = ref(false)
const chatAbortController: { current: AbortController | null } = { current: null }

// Parse planData JSON
const planDataParsed = computed(() => {
  if (!plan.value?.planData) return null
  try {
    return JSON.parse(plan.value.planData)
  } catch {
    return null
  }
})

const itinerary = computed(() => {
  const pd = planDataParsed.value
  return pd?.dailyItinerary || pd?.itinerary || []
})

const budgetSummary = computed(() => {
  const pd = planDataParsed.value
  return pd?.budgetBreakdown || pd?.budgetSummary || null
})

const budgetTotal = computed(() => {
  if (!budgetSummary.value) return '0.00'
  const vals = Object.values(budgetSummary.value)
  const total = vals.reduce((sum, v) => sum + (typeof v === 'number' ? v : parseFloat(String(v)) || 0), 0)
  return total.toFixed(2)
})

const routes = computed(() => {
  const pd = planDataParsed.value
  return pd?.routes || []
})

const images = computed(() => {
  const pd = planDataParsed.value
  if (pd?.imageGallery && Array.isArray(pd.imageGallery)) return pd.imageGallery
  if (pd?.poiList && Array.isArray(pd.poiList)) {
    return pd.poiList.filter((p: any) => p.imageUrl || p.photo).map((p: any) => ({
      url: p.imageUrl || p.photo,
      query: p.name
    })).filter((i: any) => i.url)
  }
  return []
})

const weatherInfo = computed(() => {
  const pd = planDataParsed.value
  if (pd?.weather) return typeof pd.weather === 'string' ? pd.weather : JSON.stringify(pd.weather)
  return null
})

const statusText = computed(() => {
  if (!plan.value) return ''
  switch (plan.value.status) {
    case 'GENERATING': return '⏳ 生成中'
    case 'COMPLETED': return '✅ 已完成'
    case 'FAILED': return '❌ 生成失败'
    default: return plan.value.status
  }
})

const statusBadge = computed(() => {
  if (!plan.value) return ''
  switch (plan.value.status) {
    case 'GENERATING': return 'badge-generating'
    case 'COMPLETED': return 'badge-completed'
    case 'FAILED': return 'badge-failed'
    default: return ''
  }
})

function typeLabel(type?: string): string {
  const labels: Record<string, string> = {
    POI_VISIT: '景点', TRANSPORT: '交通', FOOD: '餐饮',
    ACCOMMODATION: '住宿', ACTIVITY: '活动', FREE: '自由安排',
    SHOPPING: '购物', CULTURE: '文化'
  }
  return labels[type || ''] || (type || '其他')
}

function budgetLabel(key: string): string {
  const labels: Record<string, string> = {
    transport: '交通', accommodation: '住宿', food: '餐饮',
    attraction: '门票', shopping: '购物', other: '其他',
    flight: '机票', hotel: '酒店', train: '火车票'
  }
  return labels[key.toLowerCase()] || key
}

function onImageError(e: Event) {
  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23ddd" width="200" height="150"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}

async function toggleChat() {
  showChat.value = !showChat.value
  if (showChat.value && chatMessages.value.length === 0) {
    chatMessages.value.push({ role: 'agent', content: '你好！有什么想调整的计划吗？比如"把第二天改成室内活动"或"预算太高了"。' })
  }
}

async function sendChatMessage() {
  if (!chatInput.value.trim() || chatLoading.value) return

  const message = chatInput.value.trim()
  chatMessages.value.push({ role: 'user', content: message })
  chatInput.value = ''
  chatLoading.value = true

  // Create abort controller for timeout
  chatAbortController.current = new AbortController()

  try {
    const res = await api.post(`/plans/${planId.value}/chat`, { message }, {
      signal: chatAbortController.current.signal,
      timeout: 30000
    })
    const reply = res.data.data?.reply || res.data.data?.agentReply || '收到您的请求，已处理完成。'
    chatMessages.value.push({ role: 'agent', content: reply })
  } catch (e: any) {
    if (e.code === 'ERR_CANCELED' || e.name === 'CanceledError') {
      chatMessages.value.push({ role: 'agent', content: '已取消请求。' })
    } else {
      chatMessages.value.push({ role: 'agent', content: '抱歉，处理您的请求时出错了，请稍后重试。' })
    }
  } finally {
    chatLoading.value = false
    chatAbortController.current = null
    // Scroll to bottom
    setTimeout(() => {
      const container = document.querySelector('.chat-messages')
      if (container) container.scrollTop = container.scrollHeight
    }, 100)
  }
}

function cancelChat() {
  chatAbortController.current?.abort()
}

function goBack() {
  router.push('/plans')
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get(`/plans/${planId.value}`)
    plan.value = res.data.data
    // If plan is still generating, start SSE polling
    if (plan.value?.status === 'GENERATING') {
      startSSEProgress()
    }
  } catch (e: any) {
    if (e.response?.status === 404) {
      error.value = '计划不存在'
      setTimeout(() => router.push('/plans'), 3000)
    } else if (e.response?.status === 403) {
      error.value = '无权访问此计划'
      setTimeout(() => router.push('/plans'), 3000)
    } else {
      error.value = '加载计划失败'
    }
  } finally {
    loading.value = false
  }
})

// SSE progress polling for plans still generating
function startSSEProgress() {
  let lastEvent = Date.now()
  const evtSource = new EventSource(`/api/v1/plans/${planId.value}/sse/progress`)

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.step === 'completed') {
        // Refresh plan data
        loadPlan()
        evtSource.close()
      }
    } catch {}
    lastEvent = Date.now()
  }

  evtSource.onerror = () => {
    // Fallback polling if SSE fails
    evtSource.close()
    fallbackPolling()
  }

  // If no events for 60s, poll directly
  const idleCheck = setInterval(() => {
    if (Date.now() - lastEvent > 60000) {
      clearInterval(idleCheck)
      evtSource.close()
      fallbackPolling()
    }
  }, 30000)
}

async function fallbackPolling() {
  const poll = async () => {
    try {
      const res = await api.get(`/plans/${planId.value}`)
      plan.value = res.data.data
      if (plan.value?.status !== 'GENERATING') {
        return // Done
      }
    } catch {}
    setTimeout(poll, 5000)
  }
  poll()
}

async function loadPlan() {
  try {
    const res = await api.get(`/plans/${planId.value}`)
    plan.value = res.data.data
  } catch {}
}
</script>

<style scoped>
.plan-detail { max-width: 1000px; margin: 0 auto; padding: 1rem; }

/* Header */
.plan-header {
  background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.plan-header h1 { margin: 0 0 0.5rem; color: #333; }
.meta { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
.actions { display: flex; gap: 0.75rem; }
.badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.badge-generating { background: #fff3cd; color: #856404; }
.badge-completed { background: #d4edda; color: #155724; }
.badge-failed { background: #f8d7da; color: #721c24; }

.btn-primary, .btn-secondary {
  padding: 0.5rem 1.25rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;
}
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover { background: #5a6fd6; }
.btn-secondary { background: #f0f0f0; color: #333; }
.btn-secondary:hover { background: #e0e0e0; }

/* Cards */
.card {
  background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.card h2 { margin: 0 0 1rem; color: #333; font-size: 1.2rem; }

/* Day card */
.day-card {
  border-left: 3px solid #667eea; padding: 0.75rem 1rem; margin-bottom: 1rem;
  background: #f8f9ff; border-radius: 0 8px 8px 0;
}
.day-card h3 { margin: 0 0 0.75rem; color: #444; font-size: 1rem; }

.activity-item { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; align-items: flex-start; }
.time-badge {
  min-width: 60px; padding: 0.2rem 0.5rem; background: #667eea; color: white;
  border-radius: 4px; font-size: 0.8rem; text-align: center;
}
.activity-info strong { display: block; margin-bottom: 0.2rem; }
.activity-info p { margin: 0.2rem 0; color: #666; font-size: 0.9rem; }
.address { color: #888; font-size: 0.85rem; }

.type-tag {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 4px;
  font-size: 0.75rem; background: #e9ecef; color: #495057; margin-left: 0.5rem;
}

.empty-hint { color: #999; font-style: italic; padding: 0.5rem 0; }

/* Budget table */
.budget-table { width: 100%; border-collapse: collapse; }
.budget-table th, .budget-table td { padding: 0.6rem 1rem; text-align: left; border-bottom: 1px solid #eee; }
.budget-table th { background: #f8f9fa; font-weight: 600; }
.budget-table tfoot tr.total { background: #f0f7ff; font-weight: 700; font-size: 1.05rem; }

/* Map */
.map-placeholder {
  background: #f0f0f0; border-radius: 8px; padding: 2rem; min-height: 200px;
  display: flex; flex-direction: column; gap: 0.5rem; justify-content: center; align-items: center;
}
.route-item {
  background: white; padding: 0.5rem 1rem; border-radius: 6px; width: 100%;
  display: flex; justify-content: space-between; font-size: 0.9rem;
}

/* Image gallery */
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.image-item { border-radius: 8px; overflow: hidden; position: relative; }
.image-item img { width: 100%; height: 150px; object-fit: cover; display: block; }
.image-label {
  position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6);
  color: white; padding: 0.25rem 0.5rem; font-size: 0.8rem; text-align: center;
}

/* Chat */
.chat-section { position: sticky; bottom: 0; z-index: 10; }
.chat-messages {
  max-height: 300px; overflow-y: auto; margin-bottom: 1rem; padding: 0.5rem;
  background: #f8f9fa; border-radius: 8px;
}
.chat-msg { margin-bottom: 0.5rem; }
.chat-msg.user { text-align: right; }
.msg-bubble {
  display: inline-block; max-width: 80%; padding: 0.5rem 1rem; border-radius: 12px;
  font-size: 0.9rem; word-break: break-word;
}
.chat-msg.user .msg-bubble { background: #667eea; color: white; }
.chat-msg.agent .msg-bubble { background: white; border: 1px solid #ddd; color: #333; }
.chat-msg.thinking .msg-bubble { font-style: italic; color: #888; }

.chat-input-form { display: flex; gap: 0.5rem; }
.chat-input-form input {
  flex: 1; padding: 0.6rem 1rem; border: 1px solid #ddd; border-radius: 20px; font-size: 0.9rem;
}
.chat-input-form button {
  padding: 0.6rem 1.5rem; background: #667eea; color: white; border: none;
  border-radius: 20px; cursor: pointer; font-size: 0.9rem;
}
.chat-input-form button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { margin-left: 0.5rem; padding: 0.1rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }

/* Loading/Error */
.loading-state, .error-state {
  text-align: center; padding: 4rem 2rem;
}
.spinner {
  width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #667eea;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state p { color: #dc3545; margin-bottom: 1rem; }

@media (max-width: 600px) {
  .plan-header .meta { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .image-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
</style>
