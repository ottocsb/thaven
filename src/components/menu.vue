<script lang="ts" setup>
import { computed } from 'vue'
import {
  Albums as AlbumsIcon,
  Apps as AppsIcon,
  Archive as ArchiveIcon,
  Fish as FishIcon,
  Settings as SettingsIcon,
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const menuOptions = computed(() => [
  {
    label: t('onlineList'),
    key: '/',
    icon: AppsIcon,
  },
  {
    label: t('localList'),
    key: '/localList',
    icon: AlbumsIcon,
  },
  {
    label: t('downloadCenter'),
    key: '/downloadCenter',
    icon: ArchiveIcon,
  },
  {
    label: t('setup'),
    key: '/setup',
    icon: SettingsIcon,
  },
  {
    label: t('about'),
    key: '/about',
    icon: FishIcon,
  },
])

const activeMenuKey = computed(() => {
  if (menuOptions.value.some(item => item.key === route.path))
    return route.path

  return null
})

function navigate(path: string) {
  if (path !== route.path)
    router.push({ path })
}
</script>

<template>
  <nav class="app-sidebar" aria-label="Main navigation">
    <div class="sidebar-brand">
      <div class="sidebar-brand-name">
        THAVEN
      </div>
      <div class="sidebar-brand-meta">
        LIGHT TECH
      </div>
    </div>

    <div class="sidebar-list">
      <button
        v-for="item in menuOptions"
        :key="item.key"
        class="sidebar-item"
        :class="{ active: activeMenuKey === item.key }"
        type="button"
        @click="navigate(item.key)"
      >
        <component :is="item.icon" class="sidebar-icon" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>

  <nav class="app-bottom-nav" aria-label="Mobile navigation">
    <button
      v-for="item in menuOptions"
      :key="item.key"
      class="bottom-nav-item"
      :class="{ active: activeMenuKey === item.key }"
      :title="item.label"
      type="button"
      @click="navigate(item.key)"
    >
      <component :is="item.icon" class="bottom-nav-icon" />
    </button>
  </nav>
</template>

<style scoped>
.app-sidebar {
  backdrop-filter: blur(20px);
  background: var(--app-surface-acrylic);
  border-right: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  left: 0;
  padding: 24px 0;
  position: fixed;
  top: 0;
  width: var(--app-sidebar-width);
  z-index: 40;
}

.sidebar-brand {
  padding: 0 24px 28px;
}

.sidebar-brand-name {
  color: var(--app-primary);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 32px;
}

.sidebar-brand-meta {
  color: var(--app-text-dim);
  font-family: var(--app-font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.sidebar-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.sidebar-item {
  align-items: center;
  background: transparent;
  border: 0;
  border-left: 2px solid transparent;
  color: var(--app-text-muted);
  display: flex;
  gap: 12px;
  min-height: 44px;
  padding: 0 22px;
  text-align: left;
  transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
  width: 100%;
}

.sidebar-item:nth-last-child(2) {
  margin-top: auto;
}

.sidebar-item:hover {
  background: var(--app-surface-high);
  color: var(--app-text);
}

.sidebar-item.active {
  background: rgb(165 231 255 / 10%);
  border-left-color: var(--app-primary);
  color: var(--app-primary);
}

.sidebar-icon {
  flex: 0 0 auto;
  height: 20px;
  width: 20px;
}

.app-bottom-nav {
  backdrop-filter: blur(20px);
  background: var(--app-surface-acrylic);
  border-top: 1px solid var(--app-border);
  bottom: 0;
  display: none;
  height: 64px;
  justify-content: space-around;
  left: 0;
  position: fixed;
  right: 0;
  z-index: 50;
}

.bottom-nav-item {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--app-text-muted);
  display: inline-flex;
  flex: 1;
  justify-content: center;
}

.bottom-nav-item.active {
  color: var(--app-primary);
}

.bottom-nav-icon {
  height: 23px;
  width: 23px;
}

@media (max-width: 900px) {
  .app-sidebar {
    display: none;
  }

  .app-bottom-nav {
    display: flex;
  }
}
</style>
