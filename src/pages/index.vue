<script lang="ts" setup>
import { CloudDownload, Eye, Image as WallpaperIcon, Refresh, Search as SearchIcon } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { search } from '~/api/api'
import { setWallpaper as setSystemWallpaper } from '~/api/invoke'
import useDownloadTasks from '~/stores/useDownloadTasks'
import useAppSettings from '~/stores/useAppSettings'
import { formatFileSize } from '~/utils/format'
import type { SearchParams, SearchResponse, Wallpaper } from '~/plugins/type'

type Sorting = NonNullable<SearchParams['sorting']>
type Order = NonNullable<SearchParams['order']>
type TopRange = NonNullable<SearchParams['topRange']>

const settings = useAppSettings()
const downloadTasks = useDownloadTasks()
const message = useMessage()
const { runAsync: runSearch } = search()

const form = reactive({
  q: '',
  categories: ['general', 'anime', 'people'],
  purity: ['sfw'],
  sorting: 'date_added' as Sorting,
  order: 'desc' as Order,
  topRange: '1M' as TopRange,
  atleast: '',
  resolutions: '',
  ratios: '',
  colors: '',
  seed: '',
})

const wallpapers = ref<Wallpaper[]>([])
const selectedWallpaper = ref<Wallpaper | null>(null)
const showPreview = ref(false)
const loadingFirstPage = ref(false)
const loadingMore = ref(false)
const currentPage = ref(0)
const lastPage = ref(0)
const total = ref(0)
const randomSeed = ref('')
const lastError = ref('')
const sentinelRef = ref<HTMLElement | null>(null)
const downloadingIds = ref<string[]>([])
const settingWallpaperIds = ref<string[]>([])
const resolutionPreset = ref('')
const ratioPreset = ref('')
const colorPreset = ref('')
const thumbFailed = ref<Record<string, boolean>>({})
const filterStuck = ref(false)

let observer: IntersectionObserver | null = null
const LOAD_MORE_OFFSET = 360

const categoryOptions = [
  { label: '综合', value: 'general' },
  { label: '动漫', value: 'anime' },
  { label: '人物', value: 'people' },
]

const purityOptions = computed(() => [
  { label: 'SFW', value: 'sfw' },
  { label: 'Sketchy', value: 'sketchy' },
  { label: 'NSFW', value: 'nsfw', disabled: !settings.apikey },
])

const sortingOptions = [
  { label: '最新', value: 'date_added' },
  { label: '相关', value: 'relevance' },
  { label: '随机', value: 'random' },
  { label: '浏览', value: 'views' },
  { label: '收藏', value: 'favorites' },
  { label: '排行', value: 'toplist' },
] as Array<{ label: string, value: Sorting }>

const orderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
] as Array<{ label: string, value: Order }>

const topRangeOptions = [
  { label: '最近 1 天', value: '1d' },
  { label: '最近 3 天', value: '3d' },
  { label: '最近 1 周', value: '1w' },
  { label: '最近 1 月', value: '1M' },
  { label: '最近 3 月', value: '3M' },
  { label: '最近 6 月', value: '6M' },
  { label: '最近 1 年', value: '1y' },
] as Array<{ label: string, value: TopRange }>

const resolutionOptions = [
  { label: '分辨率', value: '' },
  { label: '至少 1280x720', value: 'atleast:1280x720' },
  { label: '至少 1600x900', value: 'atleast:1600x900' },
  { label: '至少 1920x1080', value: 'atleast:1920x1080' },
  { label: '至少 2560x1440', value: 'atleast:2560x1440' },
  { label: '至少 3840x2160', value: 'atleast:3840x2160' },
  { label: '精确 1280x720', value: 'exact:1280x720' },
  { label: '精确 1600x900', value: 'exact:1600x900' },
  { label: '精确 1920x1080', value: 'exact:1920x1080' },
  { label: '精确 2560x1440', value: 'exact:2560x1440' },
  { label: '精确 3840x2160', value: 'exact:3840x2160' },
  { label: '精确 3440x1440', value: 'exact:3440x1440' },
]

const ratioOptions = [
  { label: '比例', value: '' },
  { label: '横屏', value: 'landscape' },
  { label: '竖屏', value: 'portrait' },
  { label: '16x9', value: '16x9' },
  { label: '16x10', value: '16x10' },
  { label: '21x9', value: '21x9' },
  { label: '32x9', value: '32x9' },
  { label: '4x3', value: '4x3' },
  { label: '1x1', value: '1x1' },
]

const colorOptions = [
  { label: '颜色', value: '' },
  { label: '红色', value: 'cc0000' },
  { label: '粉色', value: 'ea4c88' },
  { label: '紫色', value: '993399' },
  { label: '蓝色', value: '0066cc' },
  { label: '青色', value: '66cccc' },
  { label: '绿色', value: '77cc33' },
  { label: '黄色', value: 'ffff00' },
  { label: '橙色', value: 'ff9900' },
  { label: '黑色', value: '000000' },
  { label: '白色', value: 'ffffff' },
]

const hasMore = computed(() => currentPage.value > 0 && currentPage.value < lastPage.value)
const isLoading = computed(() => loadingFirstPage.value || loadingMore.value)
const canShowEmpty = computed(() => !loadingFirstPage.value && !lastError.value && wallpapers.value.length === 0)

watch(
  () => settings.apikey,
  (apikey) => {
    if (!apikey && form.purity.includes('nsfw'))
      form.purity = form.purity.filter(item => item !== 'nsfw')
  },
)

watch(
  () => form.sorting,
  (sorting) => {
    if (sorting !== 'toplist')
      form.topRange = '1M'
  },
)

watch(resolutionPreset, (preset) => {
  form.atleast = ''
  form.resolutions = ''

  if (!preset)
    return

  const [mode, value] = preset.split(':')
  if (mode === 'atleast')
    form.atleast = value
  else
    form.resolutions = value
})

watch(ratioPreset, (preset) => {
  form.ratios = preset
})

watch(colorPreset, (preset) => {
  form.colors = preset
})

function toFlag(values: string[], keys: string[]) {
  const flag = keys.map(key => values.includes(key) ? '1' : '0').join('')
  return flag === '000' ? '100' : flag
}

function normalizeCsv(value: string) {
  return value
    .split(',')
    .map(item => item.trim().replace(/^#/, ''))
    .filter(Boolean)
    .join(',')
}

function buildQuery(page: number): SearchParams {
  const query: SearchParams = {
    q: form.q.trim(),
    categories: toFlag(form.categories, ['general', 'anime', 'people']),
    purity: toFlag(form.purity, ['sfw', 'sketchy', 'nsfw']),
    sorting: form.sorting,
    order: form.order,
    atleast: form.atleast.trim(),
    resolutions: normalizeCsv(form.resolutions),
    ratios: normalizeCsv(form.ratios),
    colors: normalizeCsv(form.colors),
    page,
  }

  if (form.sorting === 'toplist')
    query.topRange = form.topRange

  if (form.sorting === 'random') {
    const seed = page === 1 ? form.seed.trim() : randomSeed.value
    if (seed)
      query.seed = seed
  }

  return query
}

async function loadPage(page: number, append = false) {
  if (isLoading.value)
    return

  if (append && !hasMore.value)
    return

  lastError.value = ''
  loadingFirstPage.value = !append
  loadingMore.value = append
  let loaded = false

  try {
    const result = await runSearch(buildQuery(page)) as SearchResponse
    wallpapers.value = append
      ? wallpapers.value.concat(result.data)
      : result.data
    currentPage.value = result.meta.current_page
    lastPage.value = result.meta.last_page
    total.value = result.meta.total

    if (form.sorting === 'random' && result.meta.seed)
      randomSeed.value = result.meta.seed

    loaded = true
  }
  catch (err) {
    const fallback = '网络超时或请求失败，请稍后重试'
    lastError.value = err instanceof Error ? err.message : fallback
    message.error(lastError.value || fallback)
  }
  finally {
    loadingFirstPage.value = false
    loadingMore.value = false
    if (loaded) {
      await nextTick()
      checkLoadMore()
    }
  }
}

function submitSearch() {
  wallpapers.value = []
  currentPage.value = 0
  lastPage.value = 0
  total.value = 0
  randomSeed.value = form.sorting === 'random' ? form.seed.trim() : ''
  loadPage(1)
}

function loadMore() {
  if (hasMore.value)
    loadPage(currentPage.value + 1, true)
}

function isNearPageBottom() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight

  return scrollTop + viewportHeight + LOAD_MORE_OFFSET >= scrollHeight
}

function checkLoadMore() {
  if (isNearPageBottom())
    loadMore()
}

function handlePageScroll() {
  filterStuck.value = window.scrollY > 0
  checkLoadMore()
}

function openPreview(wallpaper: Wallpaper) {
  selectedWallpaper.value = wallpaper
  showPreview.value = true
}

function markThumbFailed(id: string) {
  thumbFailed.value[id] = true
}

function getFileExt(wallpaper: Wallpaper) {
  const extFromPath = new URL(wallpaper.path).pathname.split('.').pop()?.toLowerCase()
  if (extFromPath && ['jpg', 'jpeg', 'png', 'webp'].includes(extFromPath))
    return extFromPath

  if (wallpaper.file_type === 'image/png')
    return 'png'

  if (wallpaper.file_type === 'image/webp')
    return 'webp'

  return 'jpg'
}

function getDownloadFilename(wallpaper: Wallpaper) {
  try {
    const filename = new URL(wallpaper.path).pathname.split('/').pop()
    if (filename)
      return decodeURIComponent(filename)
  }
  catch {}

  return `${wallpaper.id}.${getFileExt(wallpaper)}`
}

function isDownloading(id: string) {
  return downloadingIds.value.includes(id)
}

function isSettingWallpaper(id: string) {
  return settingWallpaperIds.value.includes(id)
}

async function downloadToLocal(wallpaper: Wallpaper, showSuccess = true) {
  if (isDownloading(wallpaper.id))
    return null

  downloadingIds.value.push(wallpaper.id)

  try {
    const directory = settings.downloadDir || undefined
    const path = await downloadTasks.startDownload({
      url: wallpaper.path,
      filename: getDownloadFilename(wallpaper),
      thumbUrl: wallpaper.thumbs.small,
      directory,
    })
    if (showSuccess) {
      if (path.alreadyExists)
        message.warning(`已下载过：${path.path}`)
      else
        message.success(`已下载到：${path.path}`)
    }
    return path.path
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '下载失败')
    return null
  }
  finally {
    downloadingIds.value = downloadingIds.value.filter(id => id !== wallpaper.id)
  }
}

async function download(wallpaper: Wallpaper) {
  await downloadToLocal(wallpaper)
}

async function setWallpaper(wallpaper: Wallpaper) {
  if (isSettingWallpaper(wallpaper.id))
    return

  settingWallpaperIds.value.push(wallpaper.id)

  try {
    const path = await downloadToLocal(wallpaper, false)
    if (!path)
      return

    await setSystemWallpaper(path)
    message.success('已设置为壁纸')
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '设置壁纸失败')
  }
  finally {
    settingWallpaperIds.value = settingWallpaperIds.value.filter(id => id !== wallpaper.id)
  }
}

function chipClass(value: string) {
  return {
    success: value === 'sfw',
    warning: value === 'sketchy',
    danger: value === 'nsfw',
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting))
      loadMore()
  }, { rootMargin: '320px' })

  if (sentinelRef.value)
    observer.observe(sentinelRef.value)

  window.addEventListener('scroll', handlePageScroll, { passive: true })
  handlePageScroll()
  submitSearch()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', handlePageScroll)
})
</script>

<template>
  <div class="app-page online-page">
    <section class="app-panel online-filter" :class="{ stuck: filterStuck }">
      <div class="primary-search">
        <div class="search-input-wrap">
          <SearchIcon class="search-input-icon" />
          <input
            v-model="form.q"
            class="app-input search-keyword"
            placeholder="搜索关键词（英文）"
            type="search"
            @keyup.enter="submitSearch"
          >
        </div>
        <button class="app-button primary" :disabled="loadingFirstPage" type="button" @click="submitSearch">
          <Refresh class="app-icon" />
          <span>{{ loadingFirstPage ? '加载中' : '搜索' }}</span>
        </button>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">CAT</span>
          <label v-for="item in categoryOptions" :key="item.value" class="check-chip">
            <input v-model="form.categories" :value="item.value" type="checkbox">
            <span>{{ item.label }}</span>
          </label>
        </div>

        <div class="filter-group">
          <span class="filter-label">PURITY</span>
          <label v-for="item in purityOptions" :key="item.value" class="check-chip" :class="{ disabled: item.disabled }">
            <input v-model="form.purity" :disabled="item.disabled" :value="item.value" type="checkbox">
            <span>{{ item.label }}</span>
          </label>
        </div>

        <div class="filter-group sort-group">
          <span class="filter-label">SORT</span>
          <button
            v-for="item in sortingOptions"
            :key="item.value"
            class="segmented-button"
            :class="{ active: form.sorting === item.value }"
            type="button"
            @click="form.sorting = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="filter-row secondary">
        <select v-model="resolutionPreset" class="app-select compact-select">
          <option v-for="item in resolutionOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <select v-model="ratioPreset" class="app-select compact-select">
          <option v-for="item in ratioOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <select v-model="colorPreset" class="app-select compact-select">
          <option v-for="item in colorOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>

        <div class="segmented">
          <button
            v-for="item in orderOptions"
            :key="item.value"
            class="segmented-button"
            :class="{ active: form.order === item.value }"
            type="button"
            @click="form.order = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="form.sorting === 'toplist'" class="filter-group">
          <span class="filter-label">DATE</span>
          <select v-model="form.topRange" class="app-select compact-select">
            <option v-for="item in topRangeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <input
          v-if="form.sorting === 'random'"
          v-model="form.seed"
          class="app-input seed-input"
          placeholder="Seed"
        >

        <div class="result-meta">
          <span>共 {{ total }} 张</span>
          <span v-if="currentPage">第 {{ currentPage }} / {{ lastPage }} 页</span>
          <span v-if="randomSeed">Seed：{{ randomSeed }}</span>
        </div>
      </div>
    </section>

    <div v-if="!settings.apikey" class="api-hint app-panel">
      未设置 API Key，NSFW 会被禁用。
    </div>

    <section class="content-area">
      <div v-if="loadingFirstPage" class="app-empty">
        <span class="app-loading">加载壁纸中</span>
      </div>

      <div v-else-if="lastError && wallpapers.length === 0" class="app-empty error-state">
        <h2>加载失败</h2>
        <p>{{ lastError }}</p>
        <button class="app-button primary" type="button" @click="submitSearch">
          重试
        </button>
      </div>

      <div v-else-if="canShowEmpty" class="app-empty">
        没有找到壁纸
      </div>

      <div v-else class="wallpaper-grid">
        <article v-for="wallpaper in wallpapers" :key="wallpaper.id" class="wallpaper-card">
          <button class="thumb-button" type="button" @click="openPreview(wallpaper)">
            <img
              v-if="!thumbFailed[wallpaper.id]"
              :alt="wallpaper.resolution"
              class="thumb"
              decoding="async"
              loading="lazy"
              :src="wallpaper.thumbs.small"
              @error="markThumbFailed(wallpaper.id)"
            >
            <div v-else class="thumb-placeholder is-failed">
              加载失败
            </div>
          </button>

          <div class="wallpaper-overlay">
            <div class="overlay-top">
              <span class="app-chip">{{ wallpaper.resolution }}</span>
              <span class="status-dot" :class="wallpaper.purity" />
            </div>
            <div class="overlay-bottom">
              <div class="overlay-meta">
                <span>{{ formatFileSize(wallpaper.file_size) }}</span>
                <span>{{ wallpaper.file_type.replace('image/', '').toUpperCase() }}</span>
                <span>{{ wallpaper.category }}</span>
              </div>
              <div class="card-actions">
                <button class="app-icon-button" title="预览" type="button" @click="openPreview(wallpaper)">
                  <Eye class="app-icon" />
                </button>
                <button
                  class="app-icon-button primary-action"
                  :disabled="isDownloading(wallpaper.id)"
                  title="下载"
                  type="button"
                  @click="download(wallpaper)"
                >
                  <CloudDownload class="app-icon" />
                </button>
                <button
                  class="app-icon-button"
                  :disabled="isSettingWallpaper(wallpaper.id)"
                  title="设为壁纸"
                  type="button"
                  @click="setWallpaper(wallpaper)"
                >
                  <WallpaperIcon class="app-icon" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div ref="sentinelRef" class="load-sentinel">
        <span v-if="loadingMore" class="app-loading">加载更多</span>
        <span v-else-if="hasMore">继续向下滚动加载更多</span>
        <span v-else-if="wallpapers.length">已加载全部</span>
      </div>
    </section>

    <div v-if="showPreview && selectedWallpaper" class="app-modal-mask" @click.self="showPreview = false">
      <div class="preview-shell app-modal">
        <div class="preview-image-panel">
          <img :alt="selectedWallpaper.resolution" class="preview-image" :src="selectedWallpaper.path">
        </div>
        <aside class="preview-side">
          <header class="preview-header">
            <div>
              <h2>{{ selectedWallpaper.resolution }}</h2>
              <span class="app-muted app-mono">{{ selectedWallpaper.id }}</span>
            </div>
            <button class="app-icon-button" type="button" @click="showPreview = false">
              x
            </button>
          </header>

          <div class="preview-meta-grid">
            <div>
              <span>分辨率</span>
              <strong>{{ selectedWallpaper.resolution }}</strong>
            </div>
            <div>
              <span>大小</span>
              <strong>{{ formatFileSize(selectedWallpaper.file_size) }}</strong>
            </div>
            <div>
              <span>类型</span>
              <strong>{{ selectedWallpaper.file_type }}</strong>
            </div>
            <div>
              <span>纯度</span>
              <strong>{{ selectedWallpaper.purity }}</strong>
            </div>
            <div>
              <span>分类</span>
              <strong>{{ selectedWallpaper.category }}</strong>
            </div>
          </div>

          <div v-if="selectedWallpaper.tags?.length" class="tag-list">
            <span
              v-for="tag in selectedWallpaper.tags"
              :key="tag.id"
              class="app-chip"
              :class="chipClass(tag.purity)"
            >
              {{ tag.name }}
            </span>
          </div>

          <div class="preview-actions">
            <button
              class="app-button primary"
              :disabled="isDownloading(selectedWallpaper.id)"
              type="button"
              @click="download(selectedWallpaper)"
            >
              下载当前壁纸
            </button>
            <button
              class="app-button"
              :disabled="isSettingWallpaper(selectedWallpaper.id)"
              type="button"
              @click="setWallpaper(selectedWallpaper)"
            >
              设置当前壁纸
            </button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.online-page {
  display: grid;
  gap: 18px;
}

.online-filter {
  display: grid;
  gap: 14px;
  padding: 16px;
  position: sticky;
  top: var(--app-header-height);
  transition: border-color 0.16s ease, border-radius 0.16s ease, box-shadow 0.16s ease;
  z-index: 25;
}

.online-filter.stuck {
  border-left-color: transparent;
  border-radius: 0 0 var(--app-radius-lg) var(--app-radius-lg);
  border-right-color: transparent;
  border-top-color: transparent;
  box-shadow: 0 16px 34px rgb(0 0 0 / 22%);
}

.primary-search {
  display: flex;
  gap: 10px;
}

.search-input-wrap {
  flex: 1;
  position: relative;
}

.search-input-icon {
  color: var(--app-text-dim);
  height: 18px;
  left: 10px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
}

.search-keyword {
  padding-left: 36px;
  width: 100%;
}

.filter-row {
  align-items: center;
  border-top: 1px solid var(--app-border);
  display: flex;
  flex-wrap: wrap;
  gap: 12px 22px;
  padding-top: 14px;
}

.filter-row:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.filter-row.secondary {
  gap: 10px;
}

.filter-group,
.segmented {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sort-group {
  margin-left: auto;
}

.filter-label,
.result-meta {
  color: var(--app-text-dim);
  font-family: var(--app-font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
}

.check-chip {
  align-items: center;
  color: var(--app-text-muted);
  display: inline-flex;
  gap: 6px;
}

.check-chip input {
  accent-color: var(--app-primary-solid);
}

.check-chip.disabled {
  opacity: 0.45;
}

.segmented {
  background: var(--app-surface-highest);
  border-radius: var(--app-radius);
  padding: 2px;
}

.segmented-button {
  background: transparent;
  border: 0;
  border-radius: var(--app-radius);
  color: var(--app-text-muted);
  min-height: 28px;
  padding: 5px 10px;
}

.segmented-button.active {
  background: var(--app-surface);
  color: var(--app-primary);
}

.compact-select {
  width: 126px;
}

.seed-input {
  width: 120px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-left: auto;
}

.api-hint {
  color: var(--app-primary);
  padding: 12px 14px;
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

.overlay-bottom {
  align-items: flex-end;
}

.status-dot {
  background: var(--app-primary);
  border-radius: 999px;
  box-shadow: 0 0 8px currentcolor;
  color: var(--app-primary);
  height: 8px;
  width: 8px;
}

.status-dot.sfw {
  color: var(--app-success);
  background: var(--app-success);
}

.status-dot.sketchy {
  color: var(--app-warning);
  background: var(--app-warning);
}

.status-dot.nsfw {
  color: var(--app-danger);
  background: var(--app-danger);
}

.overlay-meta {
  color: var(--app-text-muted);
  display: grid;
  font-family: var(--app-font-mono);
  font-size: 11px;
  gap: 3px;
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

.load-sentinel {
  align-items: center;
  color: var(--app-text-muted);
  display: flex;
  justify-content: center;
  min-height: 72px;
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
  font-size: 18px;
  margin: 0 0 4px;
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

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow: auto;
  padding: 0 16px 16px;
}

.preview-actions {
  border-top: 1px solid var(--app-border);
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding: 16px;
}

@media (max-width: 900px) {
  .primary-search,
  .preview-shell {
    grid-template-columns: 1fr;
  }

  .primary-search {
    display: grid;
  }

  .sort-group,
  .result-meta {
    margin-left: 0;
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
