import { utimes } from 'node:fs/promises'
import { argv } from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPackageExists } from 'local-pkg'
import { debounce } from 'perfect-debounce'
import UnoCss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import {
  AntDesignVueResolver,
  ArcoResolver,
  DevUiResolver,
  ElementPlusResolver,
  HeadlessUiResolver,
  IduxResolver,
  InklineResolver,
  LayuiVueResolver,
  NaiveUiResolver,
  PrimeVueResolver,
  QuasarResolver,
  TDesignResolver,
  VantResolver,
  VarletUIResolver,
  ViewUiResolver,
  VueUseComponentsResolver,
  Vuetify3Resolver,
} from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Router from 'unplugin-vue-router/vite'
import { loadEnv } from 'vite'
import { AutoGenerateImports, vue3Presets } from 'vite-auto-import-resolvers'
import Compression from 'vite-plugin-compression'
import EnvTypes from 'vite-plugin-env-types'
import Removelog from 'vite-plugin-removelog'
import Modules from 'vite-plugin-use-modules'
import Layouts from 'vite-plugin-vue-meta-layouts'
import { warmup as Warmup } from 'vite-plugin-warmup'

import I18N from '@intlify/unplugin-vue-i18n/vite'
import Legacy from '@vitejs/plugin-legacy'
import Vue from '@vitejs/plugin-vue'

import type { Plugin } from 'vite'
import type { ComponentResolver } from 'unplugin-vue-components/types'

export default function () {
  const env = useEnv()
  const plugins = [
    /**
     * 兼容不支持 esmModule 的浏览器
     * https://www.npmjs.com/package/@vitejs/plugin-legacy
     */
    Legacy(),
    /**
     * 环境变量类型提示
     * https://github.com/dishait/vite-plugin-env-types
     */
    EnvTypes({
      dts: 'presets/types/env.d.ts',
    }),
    /**
     * 依赖预热，加快渲染 (未来可能会内置到 vite 中)
     * https://github.com/bluwy/vite-plugin-warmup
     */
    Warmup({
      clientFiles: ['./src/**/*'],
    }),
    /**
     * 文件路由
     * https://github.com/posva/unplugin-vue-router
     */
    Router({
      routesFolder: 'src/pages',
      extensions: ['.vue'],
      dts: 'presets/types/type-router.d.ts',
    }),
    /**
     * 自动安装 vue 插件
     * https://github.com/dishait/vite-plugin-use-modules
     */
    Modules({
      auto: true,
      target: 'src/plugins',
    }),
    /**
     * vue 官方插件，用来解析 sfc 单文件组件
     * https://www.npmjs.com/package/@vitejs/plugin-vue
     */
    Vue({
      include: [/\.vue$/],
    }),
    /**
     * 布局系统
     * https://github.com/dishait/vite-plugin-vue-meta-layouts
     */
    Layouts(),
    /**
     * 组件自动按需引入
     * https://github.com/antfu/unplugin-vue-components
     */
    Components({
      directoryAsNamespace: true,
      include: [/\.vue$/, /\.vue\?vue/],
      extensions: ['vue'],
      dts: resolve(__dirname, './types/components.d.ts'),
      types: [
        {
          from: 'vue-router',
          names: ['RouterLink', 'RouterView'],
        },
      ],
      resolvers: normalizeResolvers({
        onlyExist: [
          [VantResolver(), 'vant'],
          [QuasarResolver(), 'quasar'],
          [DevUiResolver(), 'vue-devui'],
          [NaiveUiResolver(), 'naive-ui'],
          [Vuetify3Resolver(), 'vuetify'],
          [PrimeVueResolver(), 'primevue'],
          [ViewUiResolver(), 'view-design'],
          [LayuiVueResolver(), 'layui-vue'],
          [VarletUIResolver(), '@varlet/ui'],
          [IduxResolver(), '@idux/components'],
          [InklineResolver(), '@inkline/inkline'],
          [ElementPlusResolver(), 'element-plus'],
          [HeadlessUiResolver(), '@headlessui/vue'],
          [ArcoResolver(), '@arco-design/web-vue'],
          [AntDesignVueResolver(), 'ant-design-vue'],
          [VueUseComponentsResolver(), '@vueuse/components'],
          [TDesignResolver({ library: 'vue-next' }), 'tdesign-vue-next'],
        ],
      }),
    }),
    /**
     * i18n 国际化支持
     * https://www.npmjs.com/package/@intlify/unplugin-vue-i18n
     */
    I18N({
      runtimeOnly: false,
      compositionOnly: true,
      include: ['locales/**'],
    }),
    /**
     * 生产环境资源压缩
     * https://github.com/vbenjs/vite-plugin-compression
     */
    Compression({
      algorithm: 'gzip',
    }),
    /**
     * 生产环境下移除 console.log, console.warn, console.error
     * https://github.com/dishait/vite-plugin-removelog
     */
    // eslint-disable-next-line node/prefer-global/process
    process.env.NODE_ENV !== 'debug' && Removelog(),
    /**
     * 别名插件 (内置)
     * 支持 `~` 和 `@` 别名到 `src`
     */
    Alias(),
    /**
     * 强制重启 (内置)
     * 如果 package.json 或 pnpm-lock.yaml 更新的话，强制重启
     */
    ForceRestart(),
  ]

  if (env.VITE_APP_API_AUTO_IMPORT) {
    const dirs = env.VITE_APP_DIR_API_AUTO_IMPORT
      ? ['src/stores/**', 'src/composables/**', 'src/api/**']
      : undefined
    /**
     * api 自动按需引入
     * https://github.com/antfu/unplugin-auto-import
     */
    plugins.push(
      AutoImport({
        dirs,
        dts: './presets/types/auto-imports.d.ts',
        imports: [
          ...AutoGenerateImports({
            include: [...vue3Presets],
            exclude: ['vue-router'],
          }),
          VueRouterAutoImports,
        ],
        resolvers: normalizeResolvers({
          onlyExist: [
            [ElementPlusResolver(), 'element-plus'],
            [TDesignResolver({ library: 'vue-next' }), 'tdesign-vue-next'],
          ],
        }),
        eslintrc: {
          enabled: true,
          globalsPropValue: true,
          filepath: 'presets/eslint/.eslintrc-auto-import.json',
        },
      }),
    )
  }

  /**
   * css 原子引擎
   * https://github.com/unocss/unocss
   */
  plugins.push(
    UnoCss(),
  )

  return plugins
}

// 获取环境变量
function useEnv() {
  function detectMode() {
    // eslint-disable-next-line node/prefer-global/process
    const { NODE_ENV } = process.env
    const hasModeIndex = argv.findIndex(a => a === '--mode' || a === '-m')
    if (hasModeIndex !== -1)
      return argv[hasModeIndex + 1]

    return NODE_ENV || 'development'
  }

  const stringToBoolean = (v: string) => {
    return Boolean(v === 'true' || false)
  }

  const {
    VITE_APP_API_AUTO_IMPORT,
    VITE_APP_DIR_API_AUTO_IMPORT,
  } = loadEnv(detectMode(), '.')

  return {
    VITE_APP_API_AUTO_IMPORT: stringToBoolean(VITE_APP_API_AUTO_IMPORT),
    VITE_APP_DIR_API_AUTO_IMPORT: stringToBoolean(VITE_APP_DIR_API_AUTO_IMPORT),
  }
}

type Arrayable<T> = T | Array<T>

interface Options {
  onlyExist?: [Arrayable<ComponentResolver>, string][]
  include?: ComponentResolver[]
}

export function normalizeResolvers(options: Options = {}) {
  const { onlyExist = [], include = [] } = options

  const existedResolvers = []
  for (let i = 0; i < onlyExist.length; i++) {
    const [resolver, packageName] = onlyExist[i]
    if (isPackageExists(packageName))
      existedResolvers.push(resolver)
  }

  existedResolvers.push(...include)

  return existedResolvers
}

export const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))

/**
 * 别名插件
 * @description 支持 `~` 和 `@` 别名到 `src`
 */
function Alias(): Plugin {
  const src = resolve(_dirname, '../src')
  return {
    name: 'vite-alias',
    enforce: 'pre',
    config(config) {
      config.resolve ??= {}
      config.resolve.alias = [
        {
          find: /^~/,
          replacement: src,
        },
        {
          find: /^@\//,
          replacement: `${src}/`,
        },
      ]
    },
  }
}

/**
 * 强制重启
 * @description 如果 package.json 或 pnpm-lock.yaml 更新的话，强制重启项目
 */
function ForceRestart(paths = ['package.json', 'pnpm-lock.yaml']): Plugin {
  const restart = debounce(async () => {
    const time = new Date()
    await utimes('vite.config.ts', time, time)
  }, 1000)
  return {
    name: 'vite-plugin-force-restart',
    apply: 'serve',
    configureServer({ watcher }) {
      watcher.add(paths).on('all', async (_, path) => {
        if (paths.includes(path))
          await restart()
      })
    },
  }
}
