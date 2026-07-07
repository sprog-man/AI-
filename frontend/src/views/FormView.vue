<template>
  <div class="form-container">
    <h1>创建旅行计划</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-row">
        <div class="form-group">
          <label>计划名称</label>
          <input v-model="form.title" type="text" placeholder="如：杭州3日游" required />
        </div>
        <div class="form-group">
          <label>出发地</label>
          <input v-model="form.departureCity" type="text" placeholder="如：上海市" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>目的地</label>
          <input v-model="form.destinationCity" type="text" placeholder="如：杭州市" required />
        </div>
        <div class="form-group">
          <label>出发日期</label>
          <input v-model="form.startDate" type="date" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>返程日期</label>
          <input v-model="form.endDate" type="date" required />
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
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

async function handleSubmit() {
  loading.value = true
  try {
    const token = localStorage.getItem('accessToken')
    const res = await fetch('/api/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form.value)
    })
    if (!res.ok) throw new Error('生成失败')
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
.form-container h1 { text-align: center; margin-bottom: 2rem; }
.form-row { display: flex; gap: 1rem; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;
}
.btn-primary {
  width: 100%; padding: 0.75rem; background: #667eea; color: white; border: none;
  border-radius: 6px; font-size: 1.1rem; cursor: pointer; margin-top: 1rem;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
