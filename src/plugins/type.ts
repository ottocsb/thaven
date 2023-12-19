interface Wallpaper {
  id: string
  url: string
  short_url: string
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
}

interface meta {
  current_page: number
  last_page: number
  per_pag: number
  query: string
  seed: string
  total: number
}

export interface metaD {
  data: Wallpaper[]
  meta: meta
}

export interface Meta {
  lastPage: number
  currentPage: number
  sections: Array<Wallpaper[]>
}

export interface searchParams {
  q?: string
  categories?: string
  purity?: string
  sorting?: string
  order?: string
  topRange?: string
  atleast?: string
  resolution?: string
  ratio?: string
  colors?: string
  page?: string
  seed?: string
}
