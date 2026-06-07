<script lang="ts" setup>
import { convertFileSrc } from '@tauri-apps/api/core'
import { FolderOpen, Refresh, Trash } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { ensureDownloadDir, openInFileManager } from '~/api/invoke'
import useDownloadTasks from '~/stores/useDownloadTasks'
import { formatFileSize } from '~/utils/format'
import type { DownloadTask, DownloadTaskStatus } from '~/stores/useDownloadTasks'

const downloadTasks = useDownloadTasks()
const message = useMessage()
const thumbnailFailed = ref<Record<string, boolean>>({})

function statusText(status: DownloadTaskStatus) {
  if (status === 'downloading')
    return '下载中'

  if (status === 'completed')
    return '已完成'

  return '失败'
}

function taskProgress(task: DownloadTask) {
  if (task.status === 'completed')
    return 100

  const progress = Number.isFinite(task.progress) ? task.progress : 0
  return Math.max(0, Math.min(100, Math.round(progress)))
}

function progressText(task: DownloadTask) {
  const downloaded = task.downloadedBytes || 0
  const total = task.totalBytes || 0

  if (total)
    return `${formatFileSize(downloaded)} / ${formatFileSize(total)}`

  if (downloaded)
    return formatFileSize(downloaded)

  return '等待开始'
}

function formatDate(value: number | null) {
  if (!value)
    return '-'

  return new Date(value).toLocaleString()
}

function displayPath(task: DownloadTask) {
  return task.localPath || task.directory || '尚未生成文件'
}

function thumbnailSrc(task: DownloadTask) {
  if (thumbnailFailed.value[task.id])
    return ''

  if (task.localPath)
    return convertFileSrc(task.localPath)

  if (task.thumbUrl)
    return task.thumbUrl

  return ''
}

function markThumbnailFailed(taskId: string) {
  thumbnailFailed.value[taskId] = true
}

function taskDirectory(task: DownloadTask) {
  if (task.directory)
    return task.directory

  return task.localPath.split(/[\\/]/).slice(0, -1).join('\\') || undefined
}

async function allowDownloadedImages() {
  const directories = Array.from(new Set(
    downloadTasks.tasks
      .filter(task => task.localPath)
      .map(taskDirectory),
  ))

  await Promise.all(directories.map(directory => ensureDownloadDir(directory)))
}

async function showInFolder(task: DownloadTask) {
  if (!task.localPath) {
    message.warning('文件尚未下载完成')
    return
  }

  try {
    await openInFileManager(task.localPath)
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '显示文件位置失败')
  }
}

async function retry(task: DownloadTask) {
  try {
    await downloadTasks.retryTask(task.id)
    message.success('下载完成')
  }
  catch (err) {
    message.error(err instanceof Error ? err.message : '下载失败')
  }
}

onMounted(() => {
  allowDownloadedImages().catch((err) => {
    message.error(err instanceof Error ? err.message : '读取下载缩略图失败')
  })
})
</script>

<template>
  <div class="app-page download-page">
    <section class="download-header">
      <div>
        <h1 class="app-section-title">
          下载中心
        </h1>
        <p class="app-section-subtitle">
          管理高分辨率壁纸下载任务。
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-card app-panel">
          <span>DOWNLOADING</span>
          <strong>{{ downloadTasks.downloadingTasks.length }}</strong>
        </div>
        <div class="stat-card app-panel success">
          <span>COMPLETED</span>
          <strong>{{ downloadTasks.completedTasks.length }}</strong>
        </div>
        <div class="stat-card app-panel danger">
          <span>FAILED</span>
          <strong>{{ downloadTasks.failedTasks.length }}</strong>
        </div>
      </div>
    </section>

    <div class="download-actions">
      <button
        class="app-button danger"
        :disabled="!downloadTasks.finishedTasks.length"
        type="button"
        @click="downloadTasks.clearFinishedTasks()"
      >
        清理已结束
      </button>
    </div>

    <div v-if="!downloadTasks.tasks.length" class="app-empty">
      暂无下载记录
    </div>

    <div v-else class="task-list">
      <article v-for="task in downloadTasks.tasks" :key="task.id" class="task-row app-panel" :class="task.status">
        <div class="task-thumb">
          <img
            v-if="thumbnailSrc(task)"
            :alt="task.filename"
            decoding="async"
            loading="lazy"
            :src="thumbnailSrc(task)"
            @error="markThumbnailFailed(task.id)"
          >
          <span v-else>{{ thumbnailFailed[task.id] ? '加载失败' : '无图' }}</span>
        </div>

        <div class="task-info">
          <div class="task-title">
            <strong :title="task.filename">{{ task.filename }}</strong>
            <span class="app-chip" :class="{ success: task.status === 'completed', danger: task.status === 'failed' }">
              {{ statusText(task.status) }}
            </span>
            <span v-if="task.alreadyExists" class="app-chip warning">已存在</span>
          </div>

          <div class="task-meta">
            <span>开始：{{ formatDate(task.startedAt) }}</span>
            <span>结束：{{ formatDate(task.finishedAt) }}</span>
          </div>

          <div class="task-progress">
            <div class="progress-track">
              <span
                class="progress-bar"
                :class="task.status"
                :style="{ width: `${taskProgress(task)}%` }"
              />
            </div>
            <span>{{ progressText(task) }}</span>
          </div>

          <div class="task-path" :title="displayPath(task)">
            {{ displayPath(task) }}
          </div>

          <div v-if="task.error" class="task-error">
            {{ task.error }}
          </div>
        </div>

        <div class="task-actions">
          <button
            class="app-icon-button"
            :disabled="task.status !== 'completed'"
            title="打开位置"
            type="button"
            @click="showInFolder(task)"
          >
            <FolderOpen class="app-icon" />
          </button>
          <button
            v-if="task.status === 'failed'"
            class="app-icon-button"
            title="重试"
            type="button"
            @click="retry(task)"
          >
            <Refresh class="app-icon" />
          </button>
          <button
            v-if="task.status !== 'downloading'"
            class="app-icon-button danger"
            title="移除"
            type="button"
            @click="downloadTasks.removeTask(task.id)"
          >
            <Trash class="app-icon" />
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.download-page {
  display: grid;
  gap: 18px;
}

.download-header {
  align-items: end;
  display: flex;
  gap: 24px;
  justify-content: space-between;
}

.stats-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(112px, 1fr));
}

.stat-card {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
}

.stat-card span {
  color: var(--app-primary);
  font-family: var(--app-font-mono);
  font-size: 11px;
}

.stat-card.success span {
  color: var(--app-success);
}

.stat-card.danger span {
  color: var(--app-danger);
}

.stat-card strong {
  font-size: 20px;
}

.download-actions {
  display: flex;
  justify-content: flex-end;
}

.task-list {
  display: grid;
  gap: 12px;
}

.task-row {
  align-items: center;
  display: flex;
  gap: 14px;
  padding: 12px;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.task-row.failed {
  border-color: rgb(244 63 94 / 26%);
}

.task-thumb {
  align-items: center;
  aspect-ratio: 3 / 2;
  background: var(--app-surface-high);
  border-radius: var(--app-radius);
  color: var(--app-text-muted);
  display: flex;
  flex: 0 0 116px;
  font-size: 12px;
  justify-content: center;
  overflow: hidden;
}

.task-thumb img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.task-info {
  display: grid;
  flex: 1;
  gap: 6px;
  min-width: 0;
}

.task-title {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.task-title strong,
.task-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta,
.task-path,
.task-progress span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.task-progress {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(140px, 1fr) auto;
}

.progress-track {
  background: var(--app-surface-highest);
  border-radius: 999px;
  height: 5px;
  overflow: hidden;
}

.progress-bar {
  background: var(--app-primary-solid);
  display: block;
  height: 100%;
  transition: width 0.2s ease;
}

.progress-bar.completed {
  background: var(--app-success);
}

.progress-bar.failed {
  background: var(--app-danger);
}

.task-error {
  color: var(--app-danger);
}

.task-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 900px) {
  .download-header,
  .task-row {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .task-thumb {
    flex-basis: auto;
    width: 160px;
  }

  .task-progress {
    grid-template-columns: 1fr;
  }
}
</style>
