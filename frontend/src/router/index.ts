import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/auth'
    },
    {
      path: '/auth',
      name: 'Auth',
      component: () => import('../views/AuthView.vue')
    },
    {
      path: '/plans/new',
      name: 'NewPlan',
      component: () => import('../views/FormView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/plans/:id',
      name: 'PlanDetail',
      component: () => import('../views/PlanView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/plans',
      name: 'History',
      component: () => import('../views/HistoryView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth && !token) {
    next('/auth')
  } else {
    next()
  }
})

export default router
