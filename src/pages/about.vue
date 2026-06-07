<script lang="ts" setup>
import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Code, InformationCircle, Link as LinkIcon } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'

const message = useMessage()
const version = ref('0.1.0')

const links = [
  { label: '项目仓库', url: 'https://github.com/ottocsb/thaven', icon: Code },
  { label: 'Wallhaven API 文档', url: 'https://wallhaven.cc/help/api', icon: LinkIcon },
]

async function openExternal(url: string) {
  try {
    await openUrl(url)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : String(err || '打开链接失败'))
  }
}

onMounted(async () => {
  try {
    version.value = await getVersion()
  }
  catch {}
})
</script>

<template>
  <div class="app-page about-page">
    <div class="about-grid">
      <section class="about-main app-panel">
        <div class="app-mark">
          <InformationCircle />
        </div>
        <div>
          <h1>thaven</h1>
          <span class="app-chip">v{{ version }}</span>
        </div>
        <p>
          thaven 是基于 Tauri 的 Wallhaven 壁纸工具，用于浏览在线壁纸、下载图片，并管理本地壁纸。
        </p>
      </section>

      <section class="links-column">
        <button
          v-for="link in links"
          :key="link.url"
          class="link-card app-panel"
          type="button"
          @click="openExternal(link.url)"
        >
          <component :is="link.icon" class="link-icon" />
          <span>{{ link.label }}</span>
          <small>{{ link.url }}</small>
        </button>
      </section>

      <section class="license-card app-panel">
        <span class="app-muted app-mono">LICENSE</span>
        <strong>MIT License</strong>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - var(--app-header-height));
}

.about-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr);
  max-width: 920px;
  width: 100%;
}

.about-main {
  display: grid;
  gap: 18px;
  padding: 28px;
}

.app-mark {
  align-items: center;
  background: var(--app-surface-high);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  color: var(--app-primary);
  display: flex;
  height: 64px;
  justify-content: center;
  width: 64px;
}

.app-mark svg {
  height: 34px;
  width: 34px;
}

.about-main h1 {
  font-size: 28px;
  line-height: 34px;
  margin: 0 0 8px;
}

.about-main p {
  color: var(--app-text-muted);
  font-size: 15px;
  line-height: 1.7;
  margin: 0;
  max-width: 560px;
}

.links-column {
  display: grid;
  gap: 18px;
}

.link-card {
  align-items: flex-start;
  background: var(--app-surface-acrylic);
  color: var(--app-text);
  display: grid;
  gap: 8px;
  padding: 22px;
  text-align: left;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.link-card:hover {
  background: var(--app-surface-high);
  border-color: var(--app-primary);
}

.link-icon {
  color: var(--app-primary);
  height: 24px;
  width: 24px;
}

.link-card span {
  font-size: 16px;
  font-weight: 600;
}

.link-card small {
  color: var(--app-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.license-card {
  align-items: center;
  display: flex;
  grid-column: 1 / -1;
  justify-content: space-between;
  padding: 18px 22px;
}

@media (max-width: 760px) {
  .about-page {
    align-items: stretch;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
