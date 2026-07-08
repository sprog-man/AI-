<template>
  <div class="form-container">
    <h1>创建旅行计划</h1>
    <form @submit.prevent="handleSubmit" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label>计划名称</label>
          <input v-model="form.title" type="text" placeholder="如：杭州3日游" required />
          <small v-if="errors.title" class="error-msg">{{ errors.title }}</small>
        </div>
        <div class="form-group">
          <label>出发地</label>
          <input v-model="form.departureCity" type="text" placeholder="如：上海市" required />
          <small v-if="errors.departureCity" class="error-msg">{{ errors.departureCity }}</small>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>目的地</label>
          <input v-model="form.destinationCity" type="text" placeholder="如：杭州市" required />
          <small v-if="errors.destinationCity" class="error-msg">{{ errors.destinationCity }}</small>
        </div>
        <div class="form-group">
          <label>出发日期</label>
          <input v-model="form.startDate" type="date" :min="today" required />
          <small v-if="errors.startDate" class="error-msg">{{ errors.startDate }}</small>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>返程日期</label>
          <input v-model="form.endDate" type="date" :min="form.startDate || today" required />
          <small v-if="errors.endDate" class="error-msg">{{ errors.endDate }}</small>
        </div>
        <div class="form-group">
          <label>出行方式</label>
          <select v-model="form.travelMode" required>
            <option value="">请选择</option>
            <option value="HIGH_SPEED_RAIL">高铁</option>
            <option value="FLIGHT">飞机</option>
            <option value="BUS">大巴</option>
            <option value="CAR">自驾</option>
            <option value="BIKE">骑行</option>
          </select>
          <small v-if="errors.travelMode" class="error-msg">{{ errors.travelMode }}</small>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>预算范围</label>
          <select v-model="form.budgetLevel" required>
            <option value="">请选择</option>
            <option value="LOW">低 (&lt;1000/天)</option>
            <option value="MEDIUM">中 (1000-3000/天)</option>
            <option value="HIGH">高 (&gt;3000/天)</option>
          </select>
          <small v-if="errors.budgetLevel" class="error-msg">{{ errors.budgetLevel }}</small>
        </div>
      </div>
      <div class="form-group">
        <label>特殊偏好（选填）</label>
        <textarea v-model="form.preferences" placeholder="如：喜欢历史文化，不吃辣" rows="3" maxlength="500"></textarea>
        <small>{{ form.preferences.length }}/500</small>
      </div>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? '生成中...' : '生成旅行计划' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const today = computed(() => new Date().toISOString().split('T')[0])

const form = ref({
  title: '',
  departureCity: '',
  destinationCity: '',
  startDate: '',
  endDate: '',
  travelMode: '',
  budgetLevel: '',
  preferences: ''
})

const errors = ref<Record<string, string>>({})

// City alias normalization map
const CITY_ALIASES: Record<string, string> = {
  '魔都': '上海市', '北京': '北京市', '帝都': '北京市',
  '广州': '广州市', '羊城': '广州市', '深圳': '深圳市', '蓉城': '成都市',
  '成都': '成都市', '杭州': '杭州市', '西湖': '杭州市',
  '南京': '南京市', '金陵': '南京市', '武汉': '武汉市', '江城': '武汉市',
  '重庆': '重庆市', '山城': '重庆市', '西安': '西安市', '长安': '西安市',
  '长沙': '长沙市', '昆明': '昆明市', '春城': '昆明市',
  '厦门': '厦门市', '鼓浪屿': '厦门市', '青岛': '青岛市',
  '大连': '大连市', '三亚': '三亚市', '哈尔滨': '哈尔滨市',
  '桂林': '桂林市', '阳朔': '桂林市', '苏州': '苏州市',
  '上海': '上海市', '天津': '天津市', '郑': '郑州市',
  '石家庄': '石家庄市', '太原': '太原市', '济南': '济南市',
  '合肥': '合肥市', '福州': '福州市', '南昌': '南昌市',
  '贵阳': '贵阳市', '南宁': '南宁市', '兰州': '兰州市',
  '乌鲁木齐': '乌鲁木齐市', '拉萨': '拉萨市', '海口': '海口市',
}

function normalizeCity(name: string): string {
  const trimmed = name.trim()
  // Direct alias lookup
  if (CITY_ALIASES[trimmed]) return CITY_ALIASES[trimmed]
  // Check if it already ends with a city suffix
  if (trimmed.endsWith('市') || trimmed.endsWith('省')) return trimmed
  // Try partial match
  for (const [alias, standard] of Object.entries(CITY_ALIASES)) {
    if (trimmed.includes(alias) || alias.includes(trimmed)) {
      return standard
    }
  }
  // Return as-is, let backend handle validation
  return trimmed
}

function validate(): boolean {
  const errs: Record<string, string> = {}
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Title
  if (!form.value.title || form.value.title.trim().length < 1) {
    errs.title = '请输入计划名称'
  } else if (form.value.title.trim().length > 100) {
    errs.title = '计划名称不能超过 100 个字符'
  }

  // Departure city
  if (!form.value.departureCity || form.value.departureCity.trim().length < 2) {
    errs.departureCity = '请输入有效的出发地'
  }

  // Destination city
  if (!form.value.destinationCity || form.value.destinationCity.trim().length < 2) {
    errs.destinationCity = '请输入有效的目的地'
  }

  // Start date
  if (!form.value.startDate) {
    errs.startDate = '请选择出发日期'
  } else {
    const start = new Date(form.value.startDate)
    if (start < now) {
      errs.startDate = '出发日期不能是过去的时间'
    }
  }

  // End date
  if (!form.value.endDate) {
    errs.endDate = '请选择返程日期'
  } else if (form.value.startDate && form.value.endDate) {
    const start = new Date(form.value.startDate)
    const end = new Date(form.value.endDate)
    if (end < start) {
      errs.endDate = '返程日期不能早于出发日期'
    }
    // Check date range <= 180 days
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 180) {
      errs.endDate = '日期跨度不能超过 180 天'
    }
  }

  // Travel mode
  if (!form.value.travelMode) {
    errs.travelMode = '请选择出行方式'
  }

  // Budget level
  if (!form.value.budgetLevel) {
    errs.budgetLevel = '请选择预算范围'
  }

  errors.value = errs
  return Object.keys(errs).length === 0
}

async function handleSubmit() {
  loading.value = true
  errors.value = {}

  if (!validate()) {
    loading.value = false
    return
  }

  try {
    // Normalize cities
    const payload = {
      ...form.value,
      title: form.value.title.trim(),
      departureCity: normalizeCity(form.value.departureCity),
      destinationCity: normalizeCity(form.value.destinationCity),
      preferences: form.value.preferences?.trim() || ''
    }

    const token = localStorage.getItem('accessToken')
    const res = await fetch('/api/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || '生成失败')
    }

    const data = await res.json()
    router.push(`/plans/${data.data.id}`)
  } catch (e: any) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-container { max-width: 700px; margin: 2rem auto; padding: 0 1rem; }
.form-container h1 { text-align: center; margin-bottom: 2rem; color: #333; }
.form-row { display: flex; gap: 1rem; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none; border-color: #667eea; box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}
.form-group small { display: block; margin-top: 0.25rem; color: #999; font-size: 0.8rem; }
.error-msg { color: #dc3545 !important; }
.btn-primary {
  width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none;
  border-radius: 6px; font-size: 1.1rem; cursor: pointer; margin-top: 1rem;
}
.btn-primary:hover:not(:disabled) { background: #5a6fd6; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
