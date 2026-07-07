import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlanStore = defineStore('plan', () => {
  const currentPlan = ref<any>(null)
  const loading = ref(false)

  function setPlan(plan: any) {
    currentPlan.value = plan
  }

  function setLoading(val: boolean) {
    loading.value = val
  }

  return { currentPlan, loading, setPlan, setLoading }
})
