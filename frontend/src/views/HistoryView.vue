<template>
  <div class="history">
    <h1>历史计划</h1>
    <div class="empty" v-if="plans.length === 0">
      <p>暂无旅行计划</p>
      <router-link to="/plans/new" class="btn-create">去创建一个</router-link>
    </div>
    <div class="plan-list" v-else>
      <div v-for="plan in plans" :key="plan.id" class="plan-card">
        <h3>{{ plan.title }}</h3>
        <p>{{ plan.destinationCity }} | {{ plan.startDate }} ~ {{ plan.endDate }}</p>
        <router-link :to="`/plans/${plan.id}`">查看详情 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const plans = ref([])
</script>

<style scoped>
.history { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
.empty { text-align: center; padding: 3rem; }
.btn-create { display: inline-block; margin-top: 1rem; padding: 0.5rem 1.5rem; background: #667eea; color: white; border-radius: 6px; text-decoration: none; }
.plan-card { border: 1px solid #eee; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; }
</style>
