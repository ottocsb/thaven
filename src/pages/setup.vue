<script lang="ts" setup>
import { open, confirm } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { ensureDownloadDir, getDefaultDownloadDir } from '~/api/invoke'
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
    await openPath(result.path)
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
  <div class="settings-page">
    <n-space vertical size="large">
      <n-card title="设置" size="small">
        <n-form label-placement="top">
          <n-form-item label="API Key">
            <n-input
              v-model:value="apikey"
              clearable
              placeholder="wallhaven apikey"
              show-password-on="click"
              type="password"
            />
          </n-form-item>
          <n-button type="primary" @click="saveApikey">
            保存 API Key
          </n-button>

          <n-divider />

          <n-form-item label="下载目录">
            <n-input
              v-model:value="downloadDir"
              clearable
              :placeholder="defaultDownloadDir || '选择下载目录'"
            />
          </n-form-item>
          <n-space>
            <n-button @click="chooseDownloadDir">
              选择目录
            </n-button>
            <n-button @click="openDownloadDir">
              打开目录
            </n-button>
            <n-button type="primary" @click="saveDownloadDir">
              保存下载目录
            </n-button>
          </n-space>

          <n-divider />

          <n-form-item label="重置应用数据">
            <n-button type="error" @click="resetAppData">
              重置
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>
    </n-space>
  </div>
</template>

<style scoped>
.settings-page {
  min-width: 720px;
  padding: 24px 24px 32px;
}

@media (max-width: 900px) {
  .settings-page {
    min-width: 0;
    padding: 12px 12px 24px;
  }
}
</style>
