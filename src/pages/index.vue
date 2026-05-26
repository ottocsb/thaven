<script lang="ts" setup>
import { useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { search } from '~/api/api'
import { setWallpaper as setSystemWallpaper } from '~/api/invoke'
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
      directory,
    })
    if (showSuccess)
      message.success(`已下载到：${path}`)
    return path
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
    <Navigation />

    <n-space vertical size="large">
      <n-card size="small" title="在线壁纸">
        <n-form label-placement="top">
          <n-grid cols="1 s:2 m:3 l:4" responsive="screen" :x-gap="12" :y-gap="8">
            <n-form-item-gi label="关键词">
              <n-input
                v-model:value="form.q"
                clearable
                placeholder="输入关键词"
                @keyup.enter="submitSearch"
              />
            </n-form-item-gi>

            <n-form-item-gi label="分类">
              <n-checkbox-group v-model:value="form.categories">
                <n-space>
                  <n-checkbox
                    v-for="item in categoryOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </n-space>
              </n-checkbox-group>
            </n-form-item-gi>

            <n-form-item-gi label="纯度">
              <n-checkbox-group v-model:value="form.purity">
                <n-space>
                  <n-checkbox
                    v-for="item in purityOptions"
                    :key="item.value"
                    :disabled="item.disabled"
                    :label="item.label"
                    :value="item.value"
                  />
                </n-space>
              </n-checkbox-group>
            </n-form-item-gi>

            <n-form-item-gi label="排序">
              <n-select v-model:value="form.sorting" :options="sortingOptions" />
            </n-form-item-gi>

            <n-form-item-gi label="顺序">
              <n-select v-model:value="form.order" :options="orderOptions" />
            </n-form-item-gi>

            <n-form-item-gi label="排行范围">
              <n-select
                v-model:value="form.topRange"
                :disabled="form.sorting !== 'toplist'"
                :options="topRangeOptions"
              />
            </n-form-item-gi>

            <n-form-item-gi label="最小分辨率">
              <n-input v-model:value="form.atleast" clearable placeholder="1920x1080" />
            </n-form-item-gi>

            <n-form-item-gi label="精确分辨率">
              <n-input v-model:value="form.resolutions" clearable placeholder="1920x1080,2560x1440" />
            </n-form-item-gi>

            <n-form-item-gi label="比例">
              <n-input v-model:value="form.ratios" clearable placeholder="16x9,16x10" />
            </n-form-item-gi>

            <n-form-item-gi label="颜色">
              <n-input v-model:value="form.colors" clearable placeholder="660000 或 #660000" />
            </n-form-item-gi>

            <n-form-item-gi label="随机 Seed">
              <n-input
                v-model:value="form.seed"
                :disabled="form.sorting !== 'random'"
                clearable
                placeholder="random 时可用"
              />
            </n-form-item-gi>

            <n-form-item-gi label="操作">
              <n-button type="primary" block :loading="loadingFirstPage" @click="submitSearch">
                搜索
              </n-button>
            </n-form-item-gi>
          </n-grid>
        </n-form>
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
              <img :alt="wallpaper.id" class="thumb" loading="lazy" :src="wallpaper.thumbs.small">
            </button>

            <div class="card-body">
              <div class="card-title">
                <span>{{ wallpaper.resolution }}</span>
                <span>{{ wallpaper.id }}</span>
              </div>

              <n-space size="small">
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
      <div v-if="selectedWallpaper" class="preview-content">
        <n-image
          class="preview-image"
          object-fit="contain"
          :src="selectedWallpaper.path"
          :preview-disabled="true"
        />

        <div class="preview-info">
          <n-descriptions bordered label-placement="left" :column="1" size="small">
            <n-descriptions-item label="ID">
              {{ selectedWallpaper.id }}
            </n-descriptions-item>
            <n-descriptions-item label="分辨率">
              {{ selectedWallpaper.resolution }}
            </n-descriptions-item>
            <n-descriptions-item label="大小">
              {{ formatFileSize(selectedWallpaper.file_size) }}
            </n-descriptions-item>
            <n-descriptions-item label="类型">
              {{ selectedWallpaper.file_type }}
            </n-descriptions-item>
            <n-descriptions-item label="上传者">
              {{ selectedWallpaper.uploader?.username || '未知' }}
            </n-descriptions-item>
            <n-descriptions-item label="来源">
              {{ selectedWallpaper.source || '无' }}
            </n-descriptions-item>
          </n-descriptions>

          <n-space v-if="selectedWallpaper.tags?.length" class="tag-list" size="small">
            <n-tag v-for="tag in selectedWallpaper.tags" :key="tag.id" size="small">
              {{ tag.name }}
            </n-tag>
          </n-space>

          <n-space>
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
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.online-page {
  min-width: 720px;
  padding: 0 24px 32px;
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
.card-meta {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
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

.preview-content {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) 320px;
}

.preview-image {
  max-height: 72vh;
  width: 100%;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

  .preview-content {
    grid-template-columns: 1fr;
  }
}
</style>
