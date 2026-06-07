import { defineConfig } from 'vite'
import Tov from './presets'

export default defineConfig({
  plugins: [Tov()],
  server: {
    strictPort: true,
    port: 5199,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  optimizeDeps: {
    include: [
      '@vicons/ionicons5',
      '@tauri-apps/api/app',
      '@tauri-apps/api/core',
      '@tauri-apps/api/event',
      '@tauri-apps/plugin-dialog',
      '@tauri-apps/plugin-http',
      '@tauri-apps/plugin-opener',
      'vue-request',
      'defu',
      'pinia-plugin-persistedstate',
    ],
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows'
        ? 'chrome105'
        : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
