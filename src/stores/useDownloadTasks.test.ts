import { describe, expect, it } from 'vitest'
import { failInterruptedDownloadTasks } from './useDownloadTasks'
import type { DownloadTask } from './useDownloadTasks'

function createTask(status: DownloadTask['status']): DownloadTask {
  return {
    id: status,
    filename: `${status}.jpg`,
    url: 'https://example.com/wallpaper.jpg',
    thumbUrl: '',
    directory: '',
    status,
    progress: status === 'completed' ? 100 : 20,
    downloadedBytes: 0,
    totalBytes: null,
    localPath: status === 'completed' ? 'wallpaper.jpg' : '',
    startedAt: 1,
    finishedAt: status === 'downloading' ? null : 2,
    error: '',
    alreadyExists: false,
  }
}

describe('download task state transitions', () => {
  it('marks interrupted downloading tasks as failed after hydrate', () => {
    const downloading = createTask('downloading')
    const completed = createTask('completed')
    const failed = createTask('failed')
    const changed = failInterruptedDownloadTasks([downloading, completed, failed])

    expect(changed).toBe(true)
    expect(downloading.status).toBe('failed')
    expect(downloading.error).toBe('上次下载已中断，请重试')
    expect(downloading.finishedAt).toBeGreaterThan(0)
    expect(completed.status).toBe('completed')
    expect(failed.status).toBe('failed')
  })

  it('does not change finished tasks', () => {
    const tasks = [createTask('completed'), createTask('failed')]

    expect(failInterruptedDownloadTasks(tasks)).toBe(false)
    expect(tasks.map(task => task.status)).toEqual(['completed', 'failed'])
  })
})
