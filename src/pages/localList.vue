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
import { Eye, FolderOpen, Image as WallpaperIcon, Refresh, Trash } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
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
import { formatFileSize } from '~/utils/format'

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

function thumbnailStatusText(item: LocalWallpaper) {
  return thumbnailFailed.value[item.path] ? '加载失败' : '加载中'
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
  <div class="app-page local-page">
    <section class="app-panel local-toolbar">
      <div class="directory-box">
        <FolderOpen class="directory-icon" />
        <input v-model="directory" class="app-input directory-input" placeholder="下载目录">
      </div>
      <div class="toolbar-actions">
        <button class="app-button" :disabled="loading" type="button" @click="refreshWallpapers">
          <Refresh class="app-icon" />
          {{ loading ? '扫描中' : '扫描' }}
        </button>
        <button class="app-button primary" type="button" @click="openDirectory">
          打开目录
        </button>
      </div>
    </section>

    <div class="local-summary app-mono">
      共 {{ total }} 张
      <span v-if="lastPage > 1">第 {{ page }} / {{ lastPage }} 页</span>
    </div>

    <div v-if="loading" class="app-empty">
      <span class="app-loading">读取本地壁纸中</span>
    </div>

    <div v-else-if="!wallpapers.length" class="app-empty">
      没有本地壁纸
    </div>

    <div v-else class="wallpaper-grid">
      <article v-for="item in displayedWallpapers" :key="item.path" class="wallpaper-card local-card">
        <button class="thumb-button" type="button" @click="openPreview(item)">
          <img
            v-if="thumbnailSrc(item)"
            :alt="item.filename"
            class="thumb"
            decoding="async"
            loading="lazy"
            :src="thumbnailSrc(item)"
          >
          <div
            v-else
            class="thumb-placeholder"
            :class="{ 'is-failed': thumbnailFailed[item.path] }"
          >
            {{ thumbnailStatusText(item) }}
          </div>
        </button>

        <div class="wallpaper-overlay">
          <div class="overlay-top">
            <span class="app-chip">{{ imageSize(item) }}</span>
          </div>
          <div class="overlay-bottom local-overlay-bottom">
            <div class="overlay-meta">
              <strong :title="item.filename">{{ item.filename }}</strong>
              <span>{{ formatFileSize(item.fileSize) }} · {{ formatDate(item.modifiedAt) }}</span>
            </div>
            <div class="card-actions">
              <button class="app-icon-button" title="预览" type="button" @click="openPreview(item)">
                <Eye class="app-icon" />
              </button>
              <button class="app-icon-button primary-action" title="设为壁纸" type="button" @click="applyWallpaper(item)">
                <WallpaperIcon class="app-icon" />
              </button>
              <button class="app-icon-button" title="显示位置" type="button" @click="showInFolder(item)">
                <FolderOpen class="app-icon" />
              </button>
              <button class="app-icon-button danger" title="删除" type="button" @click="removeWallpaper(item)">
                <Trash class="app-icon" />
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="lastPage > 1" class="pagination">
      <button class="app-icon-button" :disabled="page <= 1" type="button" @click="page -= 1">
        ‹
      </button>
      <button
        v-for="pageNumber in lastPage"
        :key="pageNumber"
        class="page-button"
        :class="{ active: page === pageNumber }"
        type="button"
        @click="page = pageNumber"
      >
        {{ pageNumber }}
      </button>
      <button class="app-icon-button" :disabled="page >= lastPage" type="button" @click="page += 1">
        ›
      </button>
    </div>

    <div v-if="showPreview && selectedWallpaper" class="app-modal-mask" @click.self="showPreview = false">
      <div class="preview-shell app-modal">
        <div class="preview-image-panel">
          <img :alt="selectedWallpaper.filename" class="preview-image" :src="originalImageSrc(selectedWallpaper)">
        </div>
        <aside class="preview-side">
          <header class="preview-header">
            <div>
              <h2 :title="selectedWallpaper.filename">
                {{ selectedWallpaper.filename }}
              </h2>
              <span class="app-muted app-mono">{{ selectedWallpaper.path }}</span>
            </div>
            <button class="app-icon-button" type="button" @click="showPreview = false">
              x
            </button>
          </header>

          <div class="preview-meta-grid">
            <div>
              <span>尺寸</span>
              <strong>{{ imageSize(selectedWallpaper) }}</strong>
            </div>
            <div>
              <span>大小</span>
              <strong>{{ formatFileSize(selectedWallpaper.fileSize) }}</strong>
            </div>
            <div>
              <span>创建</span>
              <strong>{{ formatDate(selectedWallpaper.createdAt) }}</strong>
            </div>
            <div>
              <span>修改</span>
              <strong>{{ formatDate(selectedWallpaper.modifiedAt) }}</strong>
            </div>
          </div>

          <div class="preview-actions">
            <button class="app-button primary" type="button" @click="applyWallpaper(selectedWallpaper)">
              设为壁纸
            </button>
            <button class="app-button" type="button" @click="showInFolder(selectedWallpaper)">
              显示位置
            </button>
            <button class="app-button danger" type="button" @click="removeWallpaper(selectedWallpaper)">
              删除
            </button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-page {
  display: grid;
  gap: 18px;
}

.local-toolbar {
  align-items: center;
  display: flex;
  gap: 14px;
  padding: 12px;
}

.directory-box {
  align-items: center;
  background: var(--app-surface-low);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  display: flex;
  flex: 1;
  gap: 8px;
  min-width: 0;
  padding-left: 10px;
}

.directory-icon {
  color: var(--app-text-muted);
  height: 18px;
  width: 18px;
}

.directory-input {
  background: transparent;
  border: 0;
  flex: 1;
  font-family: var(--app-font-mono);
  min-width: 0;
}

.directory-input:focus {
  box-shadow: none;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.local-summary {
  color: var(--app-text-muted);
  display: flex;
  gap: 16px;
}

.wallpaper-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.wallpaper-card {
  aspect-ratio: 16 / 10;
  background: var(--app-surface-low);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  contain-intrinsic-size: 260px;
  content-visibility: auto;
  overflow: hidden;
  position: relative;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.wallpaper-card:hover {
  border-color: rgb(165 231 255 / 55%);
  box-shadow: 0 0 16px rgb(0 210 255 / 12%);
  transform: translateY(-1px);
}

.thumb-button {
  background: transparent;
  border: 0;
  display: block;
  height: 100%;
  padding: 0;
  width: 100%;
}

.thumb,
.preview-image {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.thumb-placeholder {
  align-items: center;
  color: var(--app-text-muted);
  display: flex;
  height: 100%;
  justify-content: center;
}

.thumb-placeholder.is-failed {
  background: repeating-linear-gradient(45deg, rgb(244 63 94 / 12%), rgb(244 63 94 / 12%) 8px, transparent 8px, transparent 16px);
}

.wallpaper-overlay {
  background: linear-gradient(to top, rgb(0 0 0 / 88%), rgb(0 0 0 / 28%) 52%, transparent);
  display: flex;
  flex-direction: column;
  inset: 0;
  justify-content: space-between;
  opacity: 0;
  padding: 12px;
  pointer-events: none;
  position: absolute;
  transition: opacity 0.18s ease;
}

.wallpaper-card:hover .wallpaper-overlay {
  opacity: 1;
}

.overlay-top,
.overlay-bottom {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.local-overlay-bottom {
  align-items: flex-end;
}

.overlay-meta {
  color: var(--app-text-muted);
  display: grid;
  font-family: var(--app-font-mono);
  font-size: 11px;
  gap: 3px;
  min-width: 0;
}

.overlay-meta strong {
  color: var(--app-text);
  font-family: var(--app-font);
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.primary-action {
  background: var(--app-primary-solid);
  color: #001f28;
}

.pagination {
  align-items: center;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.page-button {
  background: transparent;
  border: 0;
  border-radius: var(--app-radius);
  color: var(--app-text-muted);
  height: 34px;
  min-width: 34px;
}

.page-button:hover,
.page-button.active {
  background: rgb(165 231 255 / 10%);
  color: var(--app-primary);
}

.preview-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  height: min(860px, calc(100vh - 48px));
  width: min(1380px, calc(100vw - 48px));
}

.preview-image-panel {
  align-items: center;
  background: #0e0e0f;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.preview-image-panel .preview-image {
  object-fit: contain;
}

.preview-side {
  background: rgb(19 19 20 / 72%);
  border-left: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-header {
  align-items: flex-start;
  border-bottom: 1px solid var(--app-border);
  display: flex;
  justify-content: space-between;
  padding: 16px;
}

.preview-header h2 {
  font-size: 16px;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 16px;
}

.preview-meta-grid div {
  background: var(--app-surface-low);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  display: grid;
  gap: 4px;
  padding: 10px;
}

.preview-meta-grid span {
  color: var(--app-text-dim);
  font-family: var(--app-font-mono);
  font-size: 11px;
}

.preview-meta-grid strong {
  font-weight: 500;
  overflow-wrap: anywhere;
}

.preview-actions {
  border-top: 1px solid var(--app-border);
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding: 16px;
}

@media (max-width: 900px) {
  .local-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .preview-shell {
    display: flex;
    flex-direction: column;
  }

  .preview-side {
    border-left: 0;
    border-top: 1px solid var(--app-border);
    max-height: 42vh;
  }
}
</style>
