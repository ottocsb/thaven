import { useRequest } from 'vue-request'
import { http } from '~/composables/http'
import useAppSettings from '~/stores/useAppSettings'
import type { Ref } from 'vue'
import type {
  CollectionWallpapersParams,
  CollectionsResponse,
  SearchParams,
  SearchResponse,
  SettingsResponse,
  TagResponse,
  WallpaperResponse,
} from '~/plugins/type'

enum url {
  search = '/search',
  settings = '/settings',
  collections = '/collections',
  tag = '/tag',
  w = '/w',
}

function getApikey() {
  return useAppSettings().apikey || undefined
}

function withApikey<T extends { apikey?: string, purity?: string | string[] }>(query?: T) {
  const apikey = query?.apikey || getApikey()
  const next = { ...query }

  if (apikey) {
    next.apikey = apikey
    return next
  }

  if (typeof next.purity === 'string' && next.purity.length >= 3 && next.purity[2] === '1') {
    const purity = `${next.purity.slice(0, 2)}0`
    next.purity = purity === '000' ? '100' : purity
  }

  return next
}

export function search() {
  const { data, loading, error, runAsync } = useRequest(
    (query?: SearchParams) => http<SearchResponse>(url.search, { query: withApikey(query) }),
    { manual: true },
  )
  return { data: data as Ref<SearchResponse>, loading, error, runAsync }
}

export function getWallpaper() {
  const { data, loading, error, runAsync } = useRequest(
    (id: string, apikey?: string) => http<WallpaperResponse>(`${url.w}/${id}`, { query: withApikey({ apikey }) }),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}

export function getTag() {
  const { data, loading, error, runAsync } = useRequest(
    (id: number | string) => http<TagResponse>(`${url.tag}/${id}`),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}

export function getSettings() {
  const { data, loading, error, runAsync } = useRequest(
    (apikey?: string) => http<SettingsResponse>(url.settings, { query: withApikey({ apikey }) }),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}

export const getSetting = getSettings
export const getSeeting = getSettings

export function getCollections() {
  const { data, loading, error, runAsync } = useRequest(
    (apikey?: string) => http<CollectionsResponse>(url.collections, { query: withApikey({ apikey }) }),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}

export function getUserCollections() {
  const { data, loading, error, runAsync } = useRequest(
    (username: string) => http<CollectionsResponse>(`${url.collections}/${username}`),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}

export function getCollectionWallpapers() {
  const { data, loading, error, runAsync } = useRequest(
    (username: string, id: number | string, query?: CollectionWallpapersParams) =>
      http<SearchResponse>(`${url.collections}/${username}/${id}`, { query: withApikey(query) }),
    { manual: true },
  )
  return { data: data as Ref<SearchResponse>, loading, error, runAsync }
}
