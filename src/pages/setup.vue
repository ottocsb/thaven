<script lang="ts" setup>
import { open, confirm } from '@tauri-apps/plugin-dialog'
import { FolderOpen, Key, Refresh, Save, Warning } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { ensureDownloadDir, getDefaultDownloadDir, openInFileManager } from '~/api/invoke'
import useAppSettings from '~/stores/useAppSettings'
import useDownloadTasks from '~/stores/useDownloadTasks'

const settings = useAppSettings()
const downloadTasks = useDownloadTasks()
const message = useMessage()
const apikey = ref(settings.apikey)
const downloadDir = ref(settings.downloadDir)
const defaultDownloadDir = ref('')

function saveApikey() {
  settings.setApikey(apikey.value)
  message.success('API Key 已保存')
}

async function loadDefaultDownloadDir() {
  try {
    const result = await getDefaultDownloadDir()
    defaultDownloadDir.value = result.path
    if (!downloadDir.value)
      downloadDir.value = result.path
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '读取默认下载目录失败')
  }
}

async function chooseDownloadDir() {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: downloadDir.value || defaultDownloadDir.value,
  })

  if (typeof selected === 'string')
    downloadDir.value = selected
}

async function saveDownloadDir() {
  try {
    const result = await ensureDownloadDir(downloadDir.value)
    downloadDir.value = result.path
    settings.setDownloadDir(result.path)
    message.success('下载目录已保存')
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '保存下载目录失败')
  }
}

async function openDownloadDir() {
  try {
    const result = await ensureDownloadDir(downloadDir.value)
    downloadDir.value = result.path
    settings.setDownloadDir(result.path)
    await openInFileManager(result.path)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '打开下载目录失败')
  }
}

async function resetAppData() {
  const confirmed = await confirm('确定重置应用数据？API Key、下载目录和下载记录会被清空，已下载文件不会删除。', {
    title: '重置应用数据',
    kind: 'warning',
    okLabel: '重置',
    cancelLabel: '取消',
  })

  if (!confirmed)
    return

  settings.resetSettings()
  downloadTasks.resetTasks()
  apikey.value = ''
  downloadDir.value = defaultDownloadDir.value
  message.success('应用数据已重置')
}

onMounted(loadDefaultDownloadDir)
</script>

<template>
  <div class="app-page settings-page app-page-narrow">
    <header class="page-header">
      <h1 class="app-section-title">
        设置
      </h1>
      <p class="app-section-subtitle">
        管理应用配置和本地数据。
      </p>
    </header>

    <section class="settings-card app-panel">
      <div class="settings-card-header">
        <div class="settings-icon">
          <Key />
        </div>
        <div>
          <h2>API Configuration</h2>
          <p>设置后可访问账号允许的内容，NSFW 依赖 API Key。</p>
        </div>
      </div>

      <label class="field-label" for="api-key">Service API Key</label>
      <input id="api-key" v-model="apikey" class="app-input mono-input" placeholder="wallhaven apikey" type="password">
      <div class="card-actions">
        <button class="app-button primary" type="button" @click="saveApikey">
          <Save class="app-icon" />
          保存 API Key
        </button>
      </div>
    </section>

    <section class="settings-card app-panel">
      <div class="settings-card-header">
        <div class="settings-icon">
          <FolderOpen />
        </div>
        <div>
          <h2>Download Directory</h2>
          <p>选择高分辨率壁纸保存的位置。</p>
        </div>
      </div>

      <label class="field-label" for="download-dir">Storage Location</label>
      <input
        id="download-dir"
        v-model="downloadDir"
        class="app-input mono-input"
        :placeholder="defaultDownloadDir || '选择下载目录'"
      >
      <div class="card-actions wrap">
        <button class="app-button" type="button" @click="chooseDownloadDir">
          选择目录
        </button>
        <button class="app-button" type="button" @click="openDownloadDir">
          打开目录
        </button>
        <button class="app-button primary" type="button" @click="saveDownloadDir">
          保存下载目录
        </button>
      </div>
    </section>

    <section class="settings-card danger-card app-panel">
      <div class="settings-card-header">
        <div class="settings-icon danger">
          <Warning />
        </div>
        <div>
          <h2>Application Data</h2>
          <p>重置会清空 API Key、下载目录和下载记录，不会删除已下载文件。</p>
        </div>
      </div>
      <button class="app-button danger" type="button" @click="resetAppData">
        <Refresh class="app-icon" />
        重置
      </button>
    </section>
  </div>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
}

.page-header {
  padding-top: 12px;
}

.settings-card {
  display: grid;
  gap: 14px;
  padding: 22px;
}

.settings-card-header {
  align-items: flex-start;
  display: flex;
  gap: 14px;
}

.settings-card-header h2 {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 4px;
}

.settings-card-header p {
  color: var(--app-text-muted);
  margin: 0;
}

.settings-icon {
  align-items: center;
  background: var(--app-surface-high);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  color: var(--app-primary);
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.settings-icon svg {
  height: 22px;
  width: 22px;
}

.settings-icon.danger {
  background: rgb(244 63 94 / 10%);
  border-color: rgb(244 63 94 / 24%);
  color: var(--app-danger);
}

.danger-card {
  border-color: rgb(244 63 94 / 24%);
}

.field-label {
  color: var(--app-text-dim);
  font-family: var(--app-font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.mono-input {
  font-family: var(--app-font-mono);
  width: 100%;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.card-actions.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 700px) {
  .card-actions {
    justify-content: stretch;
  }

  .card-actions .app-button {
    flex: 1;
  }
}
</style>
