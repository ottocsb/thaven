import { defineStore } from 'pinia'
import { downloadWallpaperFile } from '~/api/invoke'

export type DownloadTaskStatus = 'downloading' | 'completed' | 'failed'

export interface DownloadTask {
  id: string
  filename: string
  url: string
  directory: string
  status: DownloadTaskStatus
  localPath: string
  startedAt: number
  finishedAt: number | null
  error: string
}

interface StartDownloadPayload {
  url: string
  filename: string
  directory?: string
}

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : '下载失败'
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
    async startDownload(payload: StartDownloadPayload) {
      const task: DownloadTask = {
        id: createTaskId(),
        filename: payload.filename,
        url: payload.url,
        directory: payload.directory || '',
        status: 'downloading',
        localPath: '',
        startedAt: Date.now(),
        finishedAt: null,
        error: '',
      }

      this.tasks.unshift(task)

      try {
        const result = await downloadWallpaperFile(payload.url, payload.filename, payload.directory)
        task.status = 'completed'
        task.localPath = result.path
        task.finishedAt = Date.now()
        return result.path
      }
      catch (err) {
        task.status = 'failed'
        task.error = errorMessage(err)
        task.finishedAt = Date.now()
        throw err
      }
    },
    async retryTask(id: string) {
      const task = this.tasks.find(item => item.id === id)
      if (!task || task.status === 'downloading')
        return null

      task.status = 'downloading'
      task.error = ''
      task.startedAt = Date.now()
      task.finishedAt = null

      try {
        const result = await downloadWallpaperFile(task.url, task.filename, task.directory || undefined)
        task.status = 'completed'
        task.localPath = result.path
        task.finishedAt = Date.now()
        return result.path
      }
      catch (err) {
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
  persist: true,
})
