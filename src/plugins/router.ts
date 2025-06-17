import { createRouter,createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
	// ...
	history: createWebHistory(),
	routes: setupLayouts(routes),
})

declare module 'vue-router' {
  // 在这里定义你的 meta 类型
  interface RouteMeta {
    title?: string
    layout?: string
  }
}


export default router
