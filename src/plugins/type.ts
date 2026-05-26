export interface Uploader {
  username: string
  group: string
  avatar: {
    '200px': string
    '128px': string
    '32px': string
    '20px': string
  }
}

export interface Tag {
  id: number
  name: string
  alias: string
  category_id: number
  category: string
  purity: string
  created_at: string
}

export interface Wallpaper {
  id: string
  url: string
  short_url: string
  uploader?: Uploader
  views: number
  favorites: number
  source: string
  purity: string
  category: string
  dimension_x: number
  dimension_y: number
  resolution: string
  ratio: string
  file_size: number
  file_type: string
  created_at: string
  colors: string[]
  path: string
  thumbs: {
    large: string
    original: string
    small: string
  }
  tags?: Tag[]
}

export interface SearchMeta {
  current_page: number
  last_page: number
  per_page: number
  query: string | null | { id: number, tag: string }
  seed: string | null
  total: number
}

export interface SearchResponse {
  data: Wallpaper[]
  meta: SearchMeta
}

export interface Meta {
  lastPage: number
  currentPage: number
  sections: Array<Wallpaper[]>
}

export interface SearchParams {
  q?: string
  apikey?: string
  categories?: string | string[]
  purity?: string | string[]
  sorting?: 'date_added' | 'relevance' | 'random' | 'views' | 'favorites' | 'toplist'
  order?: 'desc' | 'asc'
  topRange?: '1d' | '3d' | '1w' | '1M' | '3M' | '6M' | '1y'
  atleast?: string
  resolutions?: string | string[]
  ratios?: string | string[]
  colors?: string | string[]
  page?: string | number
  seed?: string
}

export interface WallpaperResponse {
  data: Wallpaper
}

export interface TagResponse {
  data: Tag
}

export interface Settings {
  thumb_size: string
  per_page: string
  purity: string[]
  categories: string[]
  resolutions: string[]
  aspect_ratios: string[]
  toplist_range: string
  tag_blacklist: string[]
  user_blacklist: string[]
}

export interface SettingsResponse {
  data: Settings
}

export interface Collection {
  id: number
  label: string
  views: number
  public: 0 | 1
  count: number
}

export interface CollectionsResponse {
  data: Collection[]
}

export interface CollectionWallpapersParams {
  purity?: string | string[]
  page?: string | number
  apikey?: string
}

export type metaD = SearchResponse
export type searchParams = SearchParams
