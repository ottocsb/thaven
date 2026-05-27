<script lang="ts">
import type { LocalWallpaper } from '~/api/invoke'

interface LocalWallpaperCache {
  directory: string
  wallpapers: LocalWallpaper[]
  page: number
  lastPage: number
  total: number
}

let localWallpaperCache: LocalWallpaperCache | null = null
</script>

<script lang="ts" setup>
import { convertFileSrc } from '@tauri-apps/api/core'
import { confirm } from '@tauri-apps/plugin-dialog'
import { useMessage } from 'naive-ui'
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import PreviewInfoOverlay from '~/components/PreviewInfoOverlay.vue'
import {
  deleteLocalWallpaper,
  ensureDownloadDir,
  generateLocalThumbnail,
  getDefaultDownloadDir,
  openInFileManager,
  scanLocalWallpapers,
  setWallpaper,
} from '~/api/invoke'
import useAppSettings from '~/stores/useAppSettings'

defineOptions({
  name: 'LocalListPage',
})

const settings = useAppSettings()
const message = useMessage()
const cachedWallpapers = localWallpaperCache as LocalWallpaperCache | null
const directory = ref(cachedWallpapers?.directory || settings.downloadDir)
const wallpapers = ref<LocalWallpaper[]>(cachedWallpapers?.wallpapers || [])
const selectedWallpaper = ref<LocalWallpaper | null>(null)
const showPreview = ref(false)
const loading = ref(false)
const page = ref(cachedWallpapers?.page || 1)
const pageSize = 30
const lastPage = ref(cachedWallpapers?.lastPage || 1)
const total = ref(cachedWallpapers?.total || 0)
const renderCount = ref(0)
const displayedWallpapers = computed(() => wallpapers.value.slice(0, renderCount.value))
const thumbnails = ref<Record<string, string>>({})
const thumbnailFailed = ref<Record<string, boolean>>({})
const thumbnailConcurrency = 4
let loadId = 0
let thumbnailQueueId = 0
let isActive = true
let hasBeenDeactivated = false
let renderTimer: number | undefined
let thumbnailQueue: LocalWallpaper[] = []
let thumbnailWorkerCount = 0
const thumbnailLoading = new Set<string>()

function afterPagePaint(callback: () => void) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback)
  })
}

function stopRenderQueue() {
  if (renderTimer !== undefined) {
    window.clearTimeout(renderTimer)
    renderTimer = undefined
  }
}

function startRenderQueue() {
  stopRenderQueue()
  renderCount.value = Math.min(8, wallpapers.value.length)

  function renderMore() {
    renderCount.value = Math.min(renderCount.value + 8, wallpapers.value.length)

    if (renderCount.value < wallpapers.value.length)
      renderTimer = window.setTimeout(renderMore, 80)
  }

  if (renderCount.value < wallpapers.value.length)
    renderTimer = window.setTimeout(renderMore, 120)
}

function resetThumbnailQueue() {
  thumbnailQueue = []
  thumbnailLoading.clear()
  thumbnailQueueId += 1
}

function isThumbnailQueued(path: string) {
  return thumbnailQueue.some(item => item.path === path)
}

function enqueueDisplayedThumbnails() {
  for (const item of displayedWallpapers.value) {
    if (
      thumbnails.value[item.path]
      || thumbnailFailed.value[item.path]
      || thumbnailLoading.has(item.path)
      || isThumbnailQueued(item.path)
    ) {
      continue
    }

    thumbnailQueue.push(item)
  }

  processThumbnailQueue()
}

function processThumbnailQueue() {
  const queueId = thumbnailQueueId

  while (isActive && thumbnailWorkerCount < thumbnailConcurrency && thumbnailQueue.length) {
    const item = thumbnailQueue.shift()
    if (!item)
      return

    thumbnailWorkerCount += 1
    thumbnailLoading.add(item.path)
    void loadThumbnail(item, queueId)
  }
}

async function loadThumbnail(item: LocalWallpaper, queueId: number) {
  try {
    const result = await generateLocalThumbnail(item.path, item.modifiedAt)

    if (isActive && queueId === thumbnailQueueId)
      thumbnails.value[item.path] = convertFileSrc(result.path)
  }
  catch {
    if (isActive && queueId === thumbnailQueueId)
      thumbnailFailed.value[item.path] = true
  }
  finally {
    thumbnailLoading.delete(item.path)
    thumbnailWorkerCount -= 1

    if (queueId === thumbnailQueueId)
      processThumbnailQueue()
  }
}

function leaveLocalPage() {
  isActive = false
  hasBeenDeactivated = true
  loadId += 1
  resetThumbnailQueue()
  loading.value = false
  stopRenderQueue()
}

async function ensureCurrentDirectory() {
  const result = await ensureDownloadDir(directory.value || undefined)
  directory.value = result.path
  if (settings.downloadDir !== result.path)
    settings.setDownloadDir(result.path)
}

async function loadDefaultDirectory() {
  if (directory.value)
    return

  const result = await getDefaultDownloadDir()
  directory.value = result.path
}

async function loadWallpapers() {
  const currentLoadId = ++loadId
  loading.value = true

  try {
    await ensureCurrentDirectory()
    const result = await scanLocalWallpapers(directory.value, page.value, pageSize)
    if (currentLoadId !== loadId || !isActive)
      return

    wallpapers.value = result.data
    lastPage.value = result.lastPage
    total.value = result.total
    resetThumbnailQueue()
    startRenderQueue()
    enqueueDisplayedThumbnails()
    localWallpaperCache = {
      directory: directory.value,
      wallpapers: result.data,
      page: page.value,
      lastPage: result.lastPage,
      total: result.total,
    }
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '读取本地壁纸失败')
  }
  finally {
    if (currentLoadId === loadId && isActive)
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
    await openInFileManager(directory.value)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '打开目录失败')
  }
}

async function showInFolder(item: LocalWallpaper) {
  try {
    await openInFileManager(item.path)
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

function originalImageSrc(item: LocalWallpaper) {
  return convertFileSrc(item.path)
}

function thumbnailSrc(item: LocalWallpaper) {
  return thumbnails.value[item.path]
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

async function loadInitialWallpapers() {
  try {
    await loadDefaultDirectory()
    await loadWallpapers()
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '初始化本地壁纸失败')
  }
}

watch(page, () => {
  void loadWallpapers()
})

watch(displayedWallpapers, () => {
  enqueueDisplayedThumbnails()
}, { flush: 'post' })

onMounted(() => {
  startRenderQueue()
  enqueueDisplayedThumbnails()

  afterPagePaint(() => {
    void loadInitialWallpapers()
  })
})

onActivated(() => {
  isActive = true

  if (hasBeenDeactivated) {
    afterPagePaint(() => {
      void loadWallpapers()
    })
  }
})

onDeactivated(() => {
  leaveLocalPage()
})

onBeforeUnmount(() => {
  leaveLocalPage()
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
        <n-empty v-if="!loading && !wallpapers.length" description="没有本地壁纸" />

        <div v-else class="wallpaper-grid">
          <n-card
            v-for="item in displayedWallpapers"
            :key="item.path"
            class="wallpaper-card"
            content-style="padding: 0;"
            size="small"
          >
            <button class="thumb-button" type="button" @click="openPreview(item)">
              <img
                v-if="thumbnailSrc(item)"
                :alt="item.filename"
                class="thumb"
                decoding="async"
                loading="lazy"
                :src="thumbnailSrc(item)"
              >
              <div v-else class="thumb-placeholder" />
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
      <PreviewInfoOverlay
        v-if="selectedWallpaper"
        :alt="selectedWallpaper.filename"
        :src="originalImageSrc(selectedWallpaper)"
      >
        <template #info>
          <div class="preview-meta">
            <span class="preview-meta-item">
              <span class="preview-meta-label">文件名</span>
              <span class="preview-meta-value long">{{ selectedWallpaper.filename }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">尺寸</span>
              <span class="preview-meta-value">{{ imageSize(selectedWallpaper) }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">大小</span>
              <span class="preview-meta-value">{{ formatFileSize(selectedWallpaper.fileSize) }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">创建</span>
              <span class="preview-meta-value">{{ formatDate(selectedWallpaper.createdAt) }}</span>
            </span>
          </div>

          <n-space class="preview-actions">
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
        </template>
      </PreviewInfoOverlay>
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
  contain-intrinsic-size: 320px;
  content-visibility: auto;
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

.thumb-placeholder {
  background: var(--n-color-embedded);
  height: 100%;
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

@media (max-width: 900px) {
  .local-page {
    min-width: 0;
    padding: 12px 12px 24px;
  }
}
</style>
