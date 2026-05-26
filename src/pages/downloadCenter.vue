<script lang="ts" setup>
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { useMessage } from 'naive-ui'
import useDownloadTasks from '~/stores/useDownloadTasks'
import type { DownloadTask, DownloadTaskStatus } from '~/stores/useDownloadTasks'

const downloadTasks = useDownloadTasks()
const message = useMessage()

function statusText(status: DownloadTaskStatus) {
  if (status === 'downloading')
    return '下载中'

  if (status === 'completed')
    return '已完成'

  return '失败'
}

function statusType(status: DownloadTaskStatus) {
  if (status === 'downloading')
    return 'info'

  if (status === 'completed')
    return 'success'

  return 'error'
}

function formatDate(value: number | null) {
  if (!value)
    return '-'

  return new Date(value).toLocaleString()
}

function displayPath(task: DownloadTask) {
  return task.localPath || task.directory || '尚未生成文件'
}

async function showInFolder(task: DownloadTask) {
  if (!task.localPath) {
    message.warning('文件尚未下载完成')
    return
  }

  try {
    await revealItemInDir(task.localPath)
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
</script>

<template>
  <div class="download-page">
    <n-space vertical size="large">
      <n-card title="下载中心" size="small">
        <n-space align="center" justify="space-between">
          <div class="download-summary">
            下载中 {{ downloadTasks.downloadingTasks.length }} 个，已完成 {{ downloadTasks.completedTasks.length }} 个，失败 {{ downloadTasks.failedTasks.length }} 个
          </div>

          <n-button
            :disabled="!downloadTasks.finishedTasks.length"
            size="small"
            @click="downloadTasks.clearFinishedTasks()"
          >
            清理已结束
          </n-button>
        </n-space>
      </n-card>

      <n-empty v-if="!downloadTasks.tasks.length" description="暂无下载记录" />

      <n-list v-else bordered>
        <n-list-item v-for="task in downloadTasks.tasks" :key="task.id">
          <div class="task-row">
            <div class="task-info">
              <div class="task-title">
                <strong :title="task.filename">{{ task.filename }}</strong>
                <n-tag size="small" :type="statusType(task.status)">
                  {{ statusText(task.status) }}
                </n-tag>
              </div>

              <div class="task-meta">
                <span>开始：{{ formatDate(task.startedAt) }}</span>
                <span>结束：{{ formatDate(task.finishedAt) }}</span>
              </div>

              <div class="task-path" :title="displayPath(task)">
                {{ displayPath(task) }}
              </div>

              <div v-if="task.error" class="task-error">
                {{ task.error }}
              </div>
            </div>

            <n-space>
              <n-button
                size="small"
                :disabled="task.status !== 'completed'"
                @click="showInFolder(task)"
              >
                打开位置
              </n-button>
              <n-button
                v-if="task.status === 'failed'"
                size="small"
                type="primary"
                @click="retry(task)"
              >
                重试
              </n-button>
              <n-button
                v-if="task.status !== 'downloading'"
                size="small"
                @click="downloadTasks.removeTask(task.id)"
              >
                移除
              </n-button>
            </n-space>
          </div>
        </n-list-item>
      </n-list>
    </n-space>
  </div>
</template>

<style scoped>
.download-page {
  min-width: 720px;
  padding: 24px 24px 32px;
}

.download-summary,
.task-meta,
.task-path {
  color: var(--n-text-color-3);
  font-size: 13px;
}

.task-row {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.task-info {
  display: grid;
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

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.task-error {
  color: #d03050;
  font-size: 13px;
}

@media (max-width: 900px) {
  .download-page {
    min-width: 0;
    padding: 12px 12px 24px;
  }

  .task-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
