import { defineConfig } from 'vite'
import Tov from './presets'

export default defineConfig({
  plugins: [Tov()],
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    strictPort: true,
    port: 5199, // 设置服务启动端口号
  },
  // to make use of `TAURI_PLATFORM`, `TAURI_ARCH`, `TAURI_FAMILY`,
  // `TAURI_PLATFORM_VERSION`, `TAURI_PLATFORM_TYPE` and `TAURI_DEBUG`
  // env variables
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    // eslint-disable-next-line node/prefer-global/process,eqeqeq
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    // eslint-disable-next-line node/prefer-global/process
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 为调试构建生成源代码映射 (sourcemap)
    // eslint-disable-next-line node/prefer-global/process
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
