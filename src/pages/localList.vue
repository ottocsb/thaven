<script lang="ts" setup>
import { convertFileSrc } from '@tauri-apps/api/core'
import { confirm } from '@tauri-apps/plugin-dialog'
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener'
import { useMessage } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import {
  deleteLocalWallpaper,
  ensureDownloadDir,
  getDefaultDownloadDir,
  scanLocalWallpapers,
  setWallpaper,
} from '~/api/invoke'
import useAppSettings from '~/stores/useAppSettings'
import type { LocalWallpaper } from '~/api/invoke'

const settings = useAppSettings()
const message = useMessage()
const directory = ref(settings.downloadDir)
const wallpapers = ref<LocalWallpaper[]>([])
const selectedWallpaper = ref<LocalWallpaper | null>(null)
const showPreview = ref(false)
const loading = ref(false)
const page = ref(1)
const pageSize = 30
const lastPage = ref(1)
const total = ref(0)

async function ensureCurrentDirectory() {
  const result = await ensureDownloadDir(directory.value || undefined)
  directory.value = result.path
  if (!settings.downloadDir)
    settings.setDownloadDir(result.path)
}

async function loadDefaultDirectory() {
  if (directory.value)
    return

  const result = await getDefaultDownloadDir()
  directory.value = result.path
}

async function loadWallpapers() {
  loading.value = true

  try {
    await ensureCurrentDirectory()
    const result = await scanLocalWallpapers(directory.value, page.value, pageSize)
    wallpapers.value = result.data
    lastPage.value = result.lastPage
    total.value = result.total
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '读取本地壁纸失败')
  }
  finally {
    loading.value = false
  }
}

function refreshWallpapers() {
  if (page.value === 1)
    loadWallpapers()
  else
    page.value = 1
}

async function openDirectory() {
  try {
    await ensureCurrentDirectory()
    await openPath(directory.value)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '打开目录失败')
  }
}

async function showInFolder(item: LocalWallpaper) {
  try {
    await revealItemInDir(item.path)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '显示文件位置失败')
  }
}

async function applyWallpaper(item: LocalWallpaper) {
  try {
    await setWallpaper(item.path)
    message.success('已设置为壁纸')
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '设置壁纸失败')
  }
}

async function removeWallpaper(item: LocalWallpaper) {
  const confirmed = await confirm(`确定删除 ${item.filename}？`, {
    title: '删除本地壁纸',
    kind: 'warning',
    okLabel: '删除',
    cancelLabel: '取消',
  })

  if (!confirmed)
    return

  try {
    await deleteLocalWallpaper(item.path)
    message.success('已删除')
    showPreview.value = false

    if (wallpapers.value.length === 1 && page.value > 1)
      page.value -= 1
    else
      await loadWallpapers()
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '删除失败')
  }
}

function openPreview(item: LocalWallpaper) {
  selectedWallpaper.value = item
  showPreview.value = true
}

function imageSrc(item: LocalWallpaper) {
  return convertFileSrc(item.path)
}

function formatFileSize(size: number) {
  if (size < 1024)
    return `${size} B`

  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: number | null) {
  if (!value)
    return '未知'

  return new Date(value).toLocaleString()
}

function imageSize(item: LocalWallpaper) {
  if (!item.width || !item.height)
    return '未知尺寸'

  return `${item.width}x${item.height}`
}

watch(page, loadWallpapers)

onMounted(async () => {
  try {
    await loadDefaultDirectory()
    await loadWallpapers()
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '初始化本地壁纸失败')
  }
})
</script>

<template>
  <div class="local-page">
    <n-space vertical size="large">
      <n-card title="本地壁纸" size="small">
        <n-space vertical>
          <n-input-group>
            <n-input v-model:value="directory" placeholder="下载目录" />
            <n-button :loading="loading" @click="refreshWallpapers">
              扫描
            </n-button>
            <n-button @click="openDirectory">
              打开目录
            </n-button>
          </n-input-group>
          <div class="local-summary">
            共 {{ total }} 张
          </div>
        </n-space>
      </n-card>

      <n-spin :show="loading">
        <n-empty v-if="!wallpapers.length" description="没有本地壁纸" />

        <div v-else class="wallpaper-grid">
          <n-card
            v-for="item in wallpapers"
            :key="item.path"
            class="wallpaper-card"
            content-style="padding: 0;"
            size="small"
          >
            <button class="thumb-button" type="button" @click="openPreview(item)">
              <img :alt="item.filename" class="thumb" loading="lazy" :src="imageSrc(item)">
            </button>

            <div class="card-body">
              <div class="card-title">
                <strong :title="item.filename">{{ item.filename }}</strong>
              </div>

              <div class="card-meta">
                <span>{{ imageSize(item) }}</span>
                <span>{{ formatFileSize(item.fileSize) }}</span>
              </div>

              <div class="card-date">
                修改时间：{{ formatDate(item.modifiedAt) }}
              </div>

              <n-space>
                <n-button size="small" @click="openPreview(item)">
                  预览
                </n-button>
                <n-button size="small" type="primary" @click="applyWallpaper(item)">
                  设为壁纸
                </n-button>
                <n-button size="small" @click="showInFolder(item)">
                  显示位置
                </n-button>
                <n-button size="small" type="error" @click="removeWallpaper(item)">
                  删除
                </n-button>
              </n-space>
            </div>
          </n-card>
        </div>
      </n-spin>

      <n-pagination
        v-if="lastPage > 1"
        v-model:page="page"
        :page-count="lastPage"
      />
    </n-space>

    <n-modal v-model:show="showPreview" preset="card" class="preview-modal" title="本地预览">
      <div v-if="selectedWallpaper" class="preview-content">
        <n-image
          class="preview-image"
          object-fit="contain"
          :preview-disabled="true"
          :src="imageSrc(selectedWallpaper)"
        />

        <div class="preview-info">
          <n-descriptions bordered label-placement="left" :column="1" size="small">
            <n-descriptions-item label="文件名">
              {{ selectedWallpaper.filename }}
            </n-descriptions-item>
            <n-descriptions-item label="尺寸">
              {{ imageSize(selectedWallpaper) }}
            </n-descriptions-item>
            <n-descriptions-item label="大小">
              {{ formatFileSize(selectedWallpaper.fileSize) }}
            </n-descriptions-item>
            <n-descriptions-item label="创建时间">
              {{ formatDate(selectedWallpaper.createdAt) }}
            </n-descriptions-item>
            <n-descriptions-item label="修改时间">
              {{ formatDate(selectedWallpaper.modifiedAt) }}
            </n-descriptions-item>
            <n-descriptions-item label="路径">
              {{ selectedWallpaper.path }}
            </n-descriptions-item>
          </n-descriptions>

          <n-space>
            <n-button type="primary" @click="applyWallpaper(selectedWallpaper)">
              设为壁纸
            </n-button>
            <n-button @click="showInFolder(selectedWallpaper)">
              显示位置
            </n-button>
            <n-button type="error" @click="removeWallpaper(selectedWallpaper)">
              删除
            </n-button>
          </n-space>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.local-page {
  min-width: 720px;
  padding: 24px 24px 32px;
}

.local-summary {
  color: var(--n-text-color-3);
  font-size: 13px;
}

.wallpaper-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.wallpaper-card {
  overflow: hidden;
}

.thumb-button {
  aspect-ratio: 3 / 2;
  background: transparent;
  border: 0;
  cursor: pointer;
  display: block;
  padding: 0;
  width: 100%;
}

.thumb {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.card-body {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.card-title {
  min-width: 0;
}

.card-title strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  align-items: center;
  color: var(--n-text-color-3);
  display: flex;
  font-size: 12px;
  gap: 8px;
  justify-content: space-between;
}

.card-date {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.preview-modal {
  max-width: 1100px;
  width: 88vw;
}

.preview-content {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 340px;
}

.preview-image {
  max-height: 72vh;
  width: 100%;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (max-width: 900px) {
  .local-page {
    min-width: 0;
    padding: 12px 12px 24px;
  }

  .preview-content {
    grid-template-columns: 1fr;
  }
}
</style>
