import { useRequest } from 'vue-request'
import { invoke } from '@tauri-apps/api/core'

// Interact with the backend.
enum url {
  greet = 'greet',
  getDefaultDownloadDir = 'get_default_download_dir',
  ensureDownloadDir = 'ensure_download_dir',
  downloadWallpaper = 'download_wallpaper',
  scanLocalWallpapers = 'scan_local_wallpapers',
  deleteLocalWallpaper = 'delete_local_wallpaper',
  setWallpaper = 'set_wallpaper',
}

export interface PathResult {
  path: string
}

export interface LocalWallpaper {
  path: string
  filename: string
  fileSize: number
  width: number | null
  height: number | null
  createdAt: number | null
  modifiedAt: number | null
}

export interface LocalWallpaperPage {
  data: LocalWallpaper[]
  currentPage: number
  lastPage: number
  total: number
}

export function greet() {
  const { data, loading, error, run }
        = useRequest(
          (name: string) => invoke(url.greet, { name }),
          { manual: true },
        )
  return { data, loading, error, run }
}

export function getDefaultDownloadDir() {
  return invoke<PathResult>(url.getDefaultDownloadDir)
}

export function ensureDownloadDir(directory?: string) {
  return invoke<PathResult>(url.ensureDownloadDir, { directory })
}

export function scanLocalWallpapers(
  directory: string,
  page = 1,
  pageSize = 30,
  sortBy: 'created' | 'modified' = 'modified',
  order: 'asc' | 'desc' = 'desc',
) {
  return invoke<LocalWallpaperPage>(url.scanLocalWallpapers, { directory, page, pageSize, sortBy, order })
}

export function deleteLocalWallpaper(path: string) {
  return invoke<void>(url.deleteLocalWallpaper, { path })
}

export function setWallpaper(path: string) {
  return invoke<void>(url.setWallpaper, { path })
}

export function downloadWallpaper() {
  const { data, loading, error, runAsync }
        = useRequest(
          (downloadUrl: string, filename: string, directory?: string) =>
            invoke<PathResult>(url.downloadWallpaper, { url: downloadUrl, filename, directory }),
          { manual: true },
        )
  return { data, loading, error, runAsync }
}

export function downloadWallpaperFile(downloadUrl: string, filename: string, directory?: string) {
  return invoke<PathResult>(url.downloadWallpaper, { url: downloadUrl, filename, directory })
}
