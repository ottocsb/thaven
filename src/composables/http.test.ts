import { describe, expect, it } from 'vitest'
import { buildWallhavenUrl } from './http'

describe('buildWallhavenUrl', () => {
  it('serializes query params for wallhaven api', () => {
    const url = new URL(buildWallhavenUrl('/search', {
      q: 'mountain',
      categories: ['1', '0', '1'],
      purity: '100',
      ratios: ['16x9', '21x9'],
      page: 2,
      empty: '',
      nil: null,
      missing: undefined,
    }))

    expect(url.pathname).toBe('/api/v1/search')
    expect(url.searchParams.get('q')).toBe('mountain')
    expect(url.searchParams.get('categories')).toBe('1,0,1')
    expect(url.searchParams.get('ratios')).toBe('16x9,21x9')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.has('empty')).toBe(false)
    expect(url.searchParams.has('nil')).toBe(false)
    expect(url.searchParams.has('missing')).toBe(false)
  })
})
