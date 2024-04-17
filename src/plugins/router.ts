import { createRouter, createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'

declare module 'vue-router' {
  // 在这里定义你的 meta 类型

  interface RouteMeta {
    title?: string
    layout?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  extendRoutes: routes => setupLayouts(routes),
})

export default router
