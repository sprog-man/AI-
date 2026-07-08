<template>
  <div class="history">
    <div class="history-header">
      <h1>我的旅行计划</h1>
      <router-link to="/plans/new" class="btn-create">+ 创建新计划</router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="plans.length === 0 && !loading" class="empty-state">
      <p>暂无旅行计划</p>
      <router-link to="/plans/new" class="btn-create">去创建一个吧</router-link>
    </div>

    <!-- Plan List -->
    <div v-else class="plan-list">
      <div v-for="plan in plans" :key="plan.id" class="plan-card">
        <div class="card-top">
          <h3>{{ plan.title }}</h3>
          <span class="badge" :class="statusClass(plan.status)">{{ statusText(plan.status) }}</span>
        </div>
        <div class="card-meta">
          <span>📍 {{ plan.departureCity }} → {{ plan.destinationCity }}</span>
          <span>📅 {{ plan.startDate }} ~ {{ plan.endDate }}</span>
          <span>{{ modeText(plan.travelMode) }}</span>
          <span>{{ budgetText(plan.budgetLevel) }}</span>
        </div>
        <div class="card-actions">
          <router-link :to="`/plans/${plan.id}`" class="btn-view">查看详情 →</router-link>
          <button @click="confirmDelete(plan)" class="btn-delete">删除</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">← 上一页</button>
      <span class="page-info">第 {{ page }} / {{ totalPages }} 页 (共 {{ totalElements }} 条)</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页 →</button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal">
        <h3>确认删除</h3>
        <p>确定要删除计划「{{ deletingPlan?.title }}」吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-secondary">取消</button>
          <button @click="deletePlan" class="btn-danger">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api/auth'

interface PlanItem {
  id: number
  title: string
  departureCity: string
  destinationCity: string
  startDate: string
  endDate: string
  travelMode: string
  budgetLevel: string
  status: string
}

const plans = ref<PlanItem[]>([])
const loading = ref(true)
const page = ref(1)
const size = ref(20)
const totalElements = ref(0)
const totalPages = ref(0)

const showDeleteModal = ref(false)
const deletingPlan = ref<PlanItem | null>(null)

async function loadPlans() {
  loading.value = true
  try {
    const res = await api.get(`/plans?page=${page.value}&size=${size.value}`)
    const data = res.data.data
    plans.value = data.content || []
    totalElements.value = data.totalElements || 0
    totalPages.value = data.totalPages || 0
  } catch (e: any) {
    console.error('加载计划列表失败:', e)
  } finally {
    loading.value = false
  }
}

function changePage(newPage: number) {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadPlans()
}

function statusClass(status: string): string {
  switch (status) {
    case 'GENERATING': return 'badge-generating'
    case 'COMPLETED': return 'badge-completed'
    case 'FAILED': return 'badge-failed'
    default: return ''
  }
}

function statusText(status: string): string {
  switch (status) {
    case 'GENERATING': return '⏳ 生成中'
    case 'COMPLETED': return '✅ 已完成'
    case 'FAILED': return '❌ 失败'
    default: return status
  }
}

function modeText(mode: string): string {
  const map: Record<string, string> = {
    FLIGHT: '✈ 飞机', HIGH_SPEED_RAIL: '🚄 高铁', BUS: '🚌 大巴', CAR: '🚗 自驾', BIKE: '🚲 骑行'
  }
  return map[mode] || mode
}

function budgetText(level: string): string {
  const map: Record<string, string> = { LOW: '💰 经济', MEDIUM: '💰💰 标准', HIGH: '💰💰💰 豪华' }
  return map[level] || level
}

function confirmDelete(plan: PlanItem) {
  deletingPlan.value = plan
  showDeleteModal.value = true
}

async function deletePlan() {
  if (!deletingPlan.value) return
  try {
    await api.delete(`/plans/${deletingPlan.value.id}`)
    plans.value = plans.value.filter(p => p.id !== deletingPlan.value!.id)
    totalElements.value--
    totalPages.value = Math.ceil(totalElements.value / size.value)
    showDeleteModal.value = false
    deletingPlan.value = null
  } catch (e: any) {
    alert('删除失败: ' + (e.response?.data?.message || e.message))
  }
}

onMounted(() => {
  loadPlans()
})
</script>

<style scoped>
.history { max-width: 900px; margin: 0 auto; padding: 1rem; }

.history-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem;
}
.history-header h1 { color: #333; margin: 0; }

.btn-create {
  display: inline-block; padding: 0.6rem 1.5rem; background: #667eea; color: white;
  border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s;
}
.btn-create:hover { background: #5a6fd6; }

/* Loading */
.loading-state { text-align: center; padding: 3rem; }
.spinner {
  width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #667eea;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.empty-state { text-align: center; padding: 3rem; color: #999; }
.empty-state p { margin-bottom: 1rem; font-size: 1.1rem; }

/* Card list */
.plan-card {
  background: white; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: box-shadow 0.2s;
}
.plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.card-top h3 { margin: 0; color: #333; }

.badge { padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.badge-generating { background: #fff3cd; color: #856404; }
.badge-completed { background: #d4edda; color: #155724; }
.badge-failed { background: #f8d7da; color: #721c24; }

.card-meta { display: flex; gap: 1rem; flex-wrap: wrap; color: #666; font-size: 0.85rem; margin-bottom: 0.75rem; }

.card-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-view {
  color: #667eea; text-decoration: none; font-size: 0.9rem; font-weight: 500;
}
.btn-view:hover { text-decoration: underline; }
.btn-delete {
  padding: 0.3rem 0.8rem; background: transparent; color: #dc3545; border: 1px solid #dc3545;
  border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
}
.btn-delete:hover { background: #dc3545; color: white; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
.pagination button {
  padding: 0.4rem 1rem; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer;
}
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.9rem; color: #666; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center; z-index: 100;
}
.modal {
  background: white; border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
.modal h3 { margin: 0 0 1rem; }
.modal p { color: #666; margin-bottom: 1.5rem; line-height: 1.5; }
.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.btn-secondary {
  padding: 0.5rem 1.25rem; background: #f0f0f0; border: none; border-radius: 6px;
  cursor: pointer; color: #333;
}
.btn-danger {
  padding: 0.5rem 1.25rem; background: #dc3545; color: white; border: none;
  border-radius: 6px; cursor: pointer;
}
.btn-danger:hover { background: #c82333; }
</style>
