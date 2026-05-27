import { defineStore } from 'pinia'
import { listen } from '@tauri-apps/api/event'
import { downloadWallpaperFile } from '~/api/invoke'

export type DownloadTaskStatus = 'downloading' | 'completed' | 'failed'

export interface DownloadTask {
  id: string
  filename: string
  url: string
  thumbUrl: string
  directory: string
  status: DownloadTaskStatus
  progress: number
  downloadedBytes: number
  totalBytes: number | null
  localPath: string
  startedAt: number
  finishedAt: number | null
  error: string
  alreadyExists: boolean
}

interface StartDownloadPayload {
  url: string
  filename: string
  thumbUrl?: string
  directory?: string
}

interface DownloadProgress {
  taskId: string
  downloaded: number
  total: number | null
  progress: number
  path: string | null
}

export interface DownloadResult {
  path: string
  alreadyExists: boolean
}

let unlistenProgress: (() => void) | null = null
const interruptedDownloadMessage = '上次下载已中断，请重试'

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : '下载失败'
}

function failInterruptedTasks(tasks: DownloadTask[]) {
  const now = Date.now()
  let changed = false

  tasks.forEach((task) => {
    if (task.status !== 'downloading')
      return

    task.status = 'failed'
    task.error = task.error || interruptedDownloadMessage
    task.finishedAt = now
    changed = true
  })

  return changed
}

export default defineStore('download-tasks', {
  state: () => ({
    tasks: [] as DownloadTask[],
  }),
  getters: {
    downloadingTasks: state => state.tasks.filter(task => task.status === 'downloading'),
    completedTasks: state => state.tasks.filter(task => task.status === 'completed'),
    failedTasks: state => state.tasks.filter(task => task.status === 'failed'),
    finishedTasks: state => state.tasks.filter(task => task.status !== 'downloading'),
  },
  actions: {
    async ensureProgressListener() {
      if (unlistenProgress)
        return

      unlistenProgress = await listen<DownloadProgress>('download://progress', ({ payload }) => {
        const task = this.tasks.find(item => item.id === payload.taskId)
        if (!task)
          return

        task.downloadedBytes = payload.downloaded
        task.totalBytes = payload.total
        task.progress = payload.progress

        if (payload.progress >= 100 && payload.path) {
          task.status = 'completed'
          task.localPath = payload.path
          task.progress = 100
          task.error = ''
          task.finishedAt = task.finishedAt || Date.now()
        }
      })
    },
    async startDownload(payload: StartDownloadPayload) {
      await this.ensureProgressListener()

      const task: DownloadTask = {
        id: createTaskId(),
        filename: payload.filename,
        url: payload.url,
        thumbUrl: payload.thumbUrl || '',
        directory: payload.directory || '',
        status: 'downloading',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: null,
        localPath: '',
        startedAt: Date.now(),
        finishedAt: null,
        error: '',
        alreadyExists: false,
      }

      this.tasks.unshift(task)

      try {
        const result = await downloadWallpaperFile(payload.url, payload.filename, payload.directory, task.id)
        const oldTask = result.alreadyExists
          ? this.tasks.find(item =>
              item.id !== task.id
              && item.status === 'completed'
              && item.filename === task.filename
              && item.directory === task.directory
              && item.localPath === result.path,
            )
          : null

        if (oldTask) {
          this.tasks = this.tasks.filter(item => item.id !== task.id)
          oldTask.thumbUrl = oldTask.thumbUrl || task.thumbUrl
          oldTask.alreadyExists = true
          oldTask.progress = 100
          oldTask.downloadedBytes = oldTask.downloadedBytes || 1
          oldTask.totalBytes = oldTask.totalBytes || 1
          return { path: result.path, alreadyExists: true }
        }

        task.status = 'completed'
        task.localPath = result.path
        task.progress = 100
        task.alreadyExists = !!result.alreadyExists
        task.finishedAt = Date.now()
        return { path: result.path, alreadyExists: !!result.alreadyExists }
      }
      catch (err) {
        if (task.status === 'completed' && task.localPath)
          return { path: task.localPath, alreadyExists: task.alreadyExists }

        task.status = 'failed'
        task.error = errorMessage(err)
        task.finishedAt = Date.now()
        throw err
      }
    },
    async retryTask(id: string) {
      await this.ensureProgressListener()

      const task = this.tasks.find(item => item.id === id)
      if (!task || task.status === 'downloading')
        return null

      task.status = 'downloading'
      task.error = ''
      task.progress = 0
      task.downloadedBytes = 0
      task.totalBytes = null
      task.alreadyExists = false
      task.startedAt = Date.now()
      task.finishedAt = null

      try {
        const result = await downloadWallpaperFile(task.url, task.filename, task.directory || undefined, task.id)
        task.status = 'completed'
        task.localPath = result.path
        task.progress = 100
        task.alreadyExists = !!result.alreadyExists
        task.finishedAt = Date.now()
        return { path: result.path, alreadyExists: !!result.alreadyExists }
      }
      catch (err) {
        if (task.status === 'completed' && task.localPath)
          return { path: task.localPath, alreadyExists: task.alreadyExists }

        task.status = 'failed'
        task.error = errorMessage(err)
        task.finishedAt = Date.now()
        throw err
      }
    },
    removeTask(id: string) {
      this.tasks = this.tasks.filter(task => task.id !== id || task.status === 'downloading')
    },
    clearFinishedTasks() {
      this.tasks = this.tasks.filter(task => task.status === 'downloading')
    },
    resetTasks() {
      this.tasks = []
    },
  },
  persist: {
    afterHydrate: ({ store }) => {
      if (failInterruptedTasks(store.tasks))
        store.$persist()
    },
  },
})
