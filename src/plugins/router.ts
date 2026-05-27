import { createRouter, createWebHashHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'

const router = createRouter({
	// ...
	history: createWebHashHistory(),
	routes: setupLayouts([...routes]),
})

if (import.meta.env.DEV) {
  let routeStart = 0

  router.beforeEach(() => {
    routeStart = performance.now()
  })

  router.afterEach((to) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const paintedMs = performance.now() - routeStart
        const frames: number[] = []
        let lastFrame = performance.now()
        const sampleStart = lastFrame

        function sampleFrame(now: number) {
          frames.push(now - lastFrame)
          lastFrame = now

          if (now - sampleStart < 600) {
            requestAnimationFrame(sampleFrame)
            return
          }

          const maxFrameMs = Math.max(...frames)
          console.log('[perf:route]', {
            path: to.fullPath,
            paintedMs: Number(paintedMs.toFixed(1)),
            maxFrameMs: Number(maxFrameMs.toFixed(1)),
            longFrames: frames.filter(frame => frame > 50).length,
            minFps: Number((1000 / Math.max(maxFrameMs, 16.7)).toFixed(1)),
          })
        }

        requestAnimationFrame(sampleFrame)
      })
    })
  })
}

declare module 'vue-router' {
  // 在这里定义你的 meta 类型
  interface RouteMeta {
    title?: string
    layout?: string
  }
}


export default router
