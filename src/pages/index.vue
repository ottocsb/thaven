<script lang="ts" setup>
import { Refresh, Search as SearchIcon } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { search } from '~/api/api'
import { setWallpaper as setSystemWallpaper } from '~/api/invoke'
import PreviewInfoOverlay from '~/components/PreviewInfoOverlay.vue'
import useDownloadTasks from '~/stores/useDownloadTasks'
import useAppSettings from '~/stores/useAppSettings'
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

let observer: IntersectionObserver | null = null

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
]

const orderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
]

const topRangeOptions = [
  { label: '1 天', value: '1d' },
  { label: '3 天', value: '3d' },
  { label: '1 周', value: '1w' },
  { label: '1 月', value: '1M' },
  { label: '3 月', value: '3M' },
  { label: '6 月', value: '6M' },
  { label: '1 年', value: '1y' },
]

const resolutionOptions = [
  { label: '分辨率', value: '' },
  {
    type: 'group',
    label: '至少',
    key: 'atleast',
    children: [
      { label: '至少 1280x720', value: 'atleast:1280x720' },
      { label: '至少 1600x900', value: 'atleast:1600x900' },
      { label: '至少 1920x1080', value: 'atleast:1920x1080' },
      { label: '至少 2560x1440', value: 'atleast:2560x1440' },
      { label: '至少 3840x2160', value: 'atleast:3840x2160' },
    ],
  },
  {
    type: 'group',
    label: '精确',
    key: 'exactly',
    children: [
      { label: '1280x720', value: 'exact:1280x720' },
      { label: '1600x900', value: 'exact:1600x900' },
      { label: '1920x1080', value: 'exact:1920x1080' },
      { label: '2560x1440', value: 'exact:2560x1440' },
      { label: '3840x2160', value: 'exact:3840x2160' },
      { label: '3440x1440', value: 'exact:3440x1440' },
    ],
  },
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
const categorySummary = computed(() => summarizeOptions(form.categories, categoryOptions, '分类'))
const puritySummary = computed(() => summarizeOptions(form.purity, purityOptions.value, '纯度'))

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

function summarizeOptions(values: string[], options: Array<{ label: string, value: string }>, label: string) {
  if (values.length === options.length)
    return `${label}：全部`

  if (values.length === 0)
    return `${label}：未选`

  return `${label}：${options.filter(item => values.includes(item.value)).map(item => item.label).join('/')}`
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
  }
  catch (err) {
    const fallback = '网络超时或请求失败，稍后重试'
    lastError.value = err instanceof Error ? err.message : fallback
    message.error(lastError.value || fallback)
  }
  finally {
    loadingFirstPage.value = false
    loadingMore.value = false
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

function openPreview(wallpaper: Wallpaper) {
  selectedWallpaper.value = wallpaper
  showPreview.value = true
}

function formatFileSize(size: number) {
  if (size < 1024)
    return `${size} B`

  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
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

function tagType(value: string) {
  if (value === 'sfw')
    return 'success'

  if (value === 'sketchy')
    return 'warning'

  if (value === 'nsfw')
    return 'error'

  return 'default'
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting))
      loadMore()
  }, { rootMargin: '320px' })

  if (sentinelRef.value)
    observer.observe(sentinelRef.value)

  submitSearch()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="online-page">
    <n-space vertical size="large">
      <n-card class="search-card" size="small" :bordered="false" content-style="padding: 0;">
        <div class="searchbar">
          <n-input
            v-model:value="form.q"
            class="search-keyword"
            clearable
            placeholder="搜索关键词（英文）"
            size="small"
            @keyup.enter="submitSearch"
          >
            <template #prefix>
              <n-icon>
                <SearchIcon />
              </n-icon>
            </template>
          </n-input>

          <n-popover trigger="click" placement="bottom-start">
            <template #trigger>
              <n-button class="search-filter-trigger" size="small">
                {{ categorySummary }}
              </n-button>
            </template>

            <div class="search-filter-panel">
              <div class="search-filter-title">
                分类
              </div>
              <n-checkbox-group v-model:value="form.categories" size="small">
                <n-space vertical size="small">
                  <n-checkbox
                    v-for="item in categoryOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </n-space>
              </n-checkbox-group>
            </div>
          </n-popover>

          <n-popover trigger="click" placement="bottom-start">
            <template #trigger>
              <n-button class="search-filter-trigger" size="small">
                {{ puritySummary }}
              </n-button>
            </template>

            <div class="search-filter-panel">
              <div class="search-filter-title">
                纯度
              </div>
              <n-checkbox-group v-model:value="form.purity" size="small">
                <n-space vertical size="small">
                  <n-checkbox
                    v-for="item in purityOptions"
                    :key="item.value"
                    :disabled="item.disabled"
                    :label="item.label"
                    :value="item.value"
                  />
                </n-space>
              </n-checkbox-group>
            </div>
          </n-popover>

          <n-select
            v-model:value="resolutionPreset"
            class="search-resolution"
            :consistent-menu-width="false"
            :options="resolutionOptions"
            size="small"
          />

          <n-select
            v-model:value="ratioPreset"
            class="search-ratio"
            :consistent-menu-width="false"
            :options="ratioOptions"
            size="small"
          />

          <n-select
            v-model:value="colorPreset"
            class="search-color"
            :consistent-menu-width="false"
            :options="colorOptions"
            size="small"
          />

          <n-select
            v-model:value="form.sorting"
            class="search-sort"
            :consistent-menu-width="false"
            :options="sortingOptions"
            size="small"
          />

          <n-radio-group v-model:value="form.order" class="search-order" size="small">
            <n-radio-button
              v-for="item in orderOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </n-radio-group>

          <n-select
            v-if="form.sorting === 'toplist'"
            v-model:value="form.topRange"
            class="search-top-range"
            :consistent-menu-width="false"
            :options="topRangeOptions"
            size="small"
          />

          <n-input
            v-if="form.sorting === 'random'"
            v-model:value="form.seed"
            class="search-seed"
            clearable
            placeholder="Seed"
            size="small"
          />

          <n-tooltip>
            <template #trigger>
              <n-button
                class="search-submit"
                circle
                type="primary"
                :loading="loadingFirstPage"
                size="small"
                @click="submitSearch"
              >
                <template #icon>
                  <n-icon>
                    <Refresh />
                  </n-icon>
                </template>
              </n-button>
            </template>
            搜索
          </n-tooltip>
        </div>
      </n-card>

      <n-alert v-if="!settings.apikey" type="info" closable>
        未设置 API Key，NSFW 会被禁用。
      </n-alert>

      <div class="toolbar-line">
        <span>共 {{ total }} 张</span>
        <span v-if="currentPage">第 {{ currentPage }} / {{ lastPage }} 页</span>
        <span v-if="randomSeed">Seed：{{ randomSeed }}</span>
      </div>

      <n-spin :show="loadingFirstPage">
        <n-result
          v-if="lastError && wallpapers.length === 0"
          status="error"
          title="加载失败"
          :description="lastError"
        >
          <template #footer>
            <n-button type="primary" @click="submitSearch">
              重试
            </n-button>
          </template>
        </n-result>

        <n-empty v-else-if="canShowEmpty" description="没有找到壁纸" />

        <div v-else class="wallpaper-grid">
          <n-card
            v-for="wallpaper in wallpapers"
            :key="wallpaper.id"
            class="wallpaper-card"
            content-style="padding: 0;"
            size="small"
          >
            <button class="thumb-button" type="button" @click="openPreview(wallpaper)">
              <img :alt="wallpaper.resolution" class="thumb" loading="lazy" :src="wallpaper.thumbs.small">
            </button>

            <div class="card-body">
              <div class="card-title">
                <span>{{ wallpaper.resolution }}</span>
              </div>

              <div class="card-info">
                <n-space size="small" :wrap="false">
                  <n-tag size="small" :type="tagType(wallpaper.category)">
                    {{ wallpaper.category }}
                  </n-tag>
                  <n-tag size="small" :type="tagType(wallpaper.purity)">
                    {{ wallpaper.purity }}
                  </n-tag>
                </n-space>

                <div class="card-meta">
                  <span>{{ formatFileSize(wallpaper.file_size) }}</span>
                  <span>{{ wallpaper.file_type.replace('image/', '').toUpperCase() }}</span>
                </div>
              </div>

              <n-space>
                <n-button size="small" @click="openPreview(wallpaper)">
                  预览
                </n-button>
                <n-button
                  size="small"
                  type="primary"
                  :loading="isDownloading(wallpaper.id)"
                  @click="download(wallpaper)"
                >
                  下载
                </n-button>
                <n-button
                  size="small"
                  :loading="isSettingWallpaper(wallpaper.id)"
                  @click="setWallpaper(wallpaper)"
                >
                  设为壁纸
                </n-button>
              </n-space>
            </div>
          </n-card>
        </div>
      </n-spin>

      <div ref="sentinelRef" class="load-sentinel">
        <n-spin v-if="loadingMore" size="small" />
        <span v-else-if="hasMore">继续向下滚动加载更多</span>
        <span v-else-if="wallpapers.length">已加载全部</span>
      </div>
    </n-space>

    <n-modal v-model:show="showPreview" preset="card" class="preview-modal" title="壁纸预览">
      <PreviewInfoOverlay
        v-if="selectedWallpaper"
        :alt="selectedWallpaper.resolution"
        :src="selectedWallpaper.path"
      >
        <template #info>
          <div class="preview-meta">
            <span class="preview-meta-item">
              <span class="preview-meta-label">分辨率</span>
              <span class="preview-meta-value">{{ selectedWallpaper.resolution }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">大小</span>
              <span class="preview-meta-value">{{ formatFileSize(selectedWallpaper.file_size) }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">类型</span>
              <span class="preview-meta-value">{{ selectedWallpaper.file_type }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">分类</span>
              <span class="preview-meta-value">{{ selectedWallpaper.category }}</span>
            </span>
            <span class="preview-meta-item">
              <span class="preview-meta-label">纯度</span>
              <span class="preview-meta-value">{{ selectedWallpaper.purity }}</span>
            </span>
          </div>

          <n-space v-if="selectedWallpaper.tags?.length" class="tag-list" size="small">
            <n-tag v-for="tag in selectedWallpaper.tags" :key="tag.id" size="small">
              {{ tag.name }}
            </n-tag>
          </n-space>

          <n-space class="preview-actions">
            <n-button
              type="primary"
              :loading="isDownloading(selectedWallpaper.id)"
              @click="download(selectedWallpaper)"
            >
              下载当前壁纸
            </n-button>
            <n-button
              :loading="isSettingWallpaper(selectedWallpaper.id)"
              @click="setWallpaper(selectedWallpaper)"
            >
              设置当前壁纸
            </n-button>
          </n-space>
        </template>
      </PreviewInfoOverlay>
    </n-modal>
  </div>
</template>

<style scoped>
.online-page {
  min-width: 720px;
  padding: 0 24px 32px;
}

.search-card {
  border-radius: 4px;
}

.searchbar {
  align-items: center;
  display: flex;
  font-size: 13px;
  gap: 4px;
  min-height: 44px;
  overflow-x: auto;
  padding: 8px 10px;
  scrollbar-width: thin;
  white-space: nowrap;
}

.search-keyword {
  flex: 0 0 230px;
}

.search-resolution {
  flex: 0 0 88px;
}

.search-ratio,
.search-color {
  flex: 0 0 68px;
}

.search-sort {
  flex: 0 0 72px;
}

.search-top-range,
.search-seed {
  flex: 0 0 96px;
}

.search-order {
  flex: 0 0 auto;
}

.search-filter-trigger {
  flex: 0 0 112px;
  justify-content: flex-start;
  overflow: hidden;
}

.search-submit {
  flex: 0 0 auto;
}

.searchbar :deep(.n-input),
.searchbar :deep(.n-base-selection) {
  border-radius: 2px;
}

.searchbar :deep(.n-radio-button) {
  border-radius: 2px;
}

.search-filter-trigger :deep(.n-button__content) {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-order :deep(.n-radio-button) {
  min-width: 40px;
}

.search-filter-panel {
  min-width: 120px;
}

.search-filter-title {
  color: var(--n-text-color-2);
  font-size: 12px;
  margin-bottom: 8px;
}

.toolbar-line {
  color: var(--n-text-color-3);
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  gap: 16px;
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

.card-title,
.card-info,
.card-meta {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.card-info {
  min-width: 0;
}

.card-info :deep(.n-space) {
  min-width: 0;
}

.card-title {
  font-weight: 600;
}

.card-title span:last-child,
.card-meta {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.load-sentinel {
  align-items: center;
  color: var(--n-text-color-3);
  display: flex;
  font-size: 13px;
  justify-content: center;
  min-height: 56px;
}

.preview-modal {
  max-width: 1100px;
  width: 88vw;
}

.tag-list {
  max-height: 160px;
  overflow: auto;
}

@media (max-width: 900px) {
  .online-page {
    min-width: 0;
    padding: 0 12px 24px;
  }

  .searchbar {
    padding: 8px;
  }
}
</style>
