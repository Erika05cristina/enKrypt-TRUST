import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SafeView from '../views/SafeView.vue'
import HighRiskView from '../views/HighRiskView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/safe',
      name: 'safe-demo',
      component: SafeView
    },
    {
      path: '/high-risk',
      name: 'high-risk-demo',
      component: HighRiskView
    }
  ]
})

export default router
