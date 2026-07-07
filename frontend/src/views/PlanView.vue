<template>
  <div class="plan-detail">
    <h1>旅行计划</h1>
    <div class="loading" v-if="loading">正在加载计划...</div>
    <div v-else>
      <p>计划ID: {{ planId }}</p>
      <p>状态: 待实现</p>
    </div>
    <router-link to="/plans" class="back-link">← 返回历史列表</router-link>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const planId = route.params.id
const loading = ref(true)
</script>

<style scoped>
.plan-detail { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
.back-link { display: inline-block; margin-top: 1rem; color: #667eea; text-decoration: none; }
</style>
