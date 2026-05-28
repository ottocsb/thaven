import { describe, expect, it } from 'vitest'
import type { SearchResponse } from './type'

describe('wallhaven response types', () => {
  it('accepts documented search response shape', () => {
    const response: SearchResponse = {
      data: [{
        id: 'abc123',
        url: 'https://wallhaven.cc/w/abc123',
        short_url: 'https://whvn.cc/abc123',
        uploader: {
          username: 'demo',
          group: 'User',
          avatar: {
            '200px': '',
            '128px': '',
            '32px': '',
            '20px': '',
          },
        },
        views: 1,
        favorites: 2,
        source: '',
        purity: 'sfw',
        category: 'general',
        dimension_x: 1920,
        dimension_y: 1080,
        resolution: '1920x1080',
        ratio: '16x9',
        file_size: 1024,
        file_type: 'image/jpeg',
        created_at: '2026-01-01 00:00:00',
        colors: ['#ffffff'],
        path: 'https://w.wallhaven.cc/full/ab/wallhaven-abc123.jpg',
        thumbs: {
          large: '',
          original: '',
          small: '',
        },
        tags: [{
          id: 1,
          name: 'tag',
          alias: '',
          category_id: 1,
          category: 'General',
          purity: 'sfw',
          created_at: '2026-01-01 00:00:00',
        }],
      }],
      meta: {
        current_page: 1,
        last_page: 2,
        per_page: 24,
        query: { id: 1, tag: 'tag' },
        seed: null,
        total: 48,
      },
    }

    expect(response.meta.per_page).toBe(24)
    expect(response.meta.query).toEqual({ id: 1, tag: 'tag' })
    expect(response.data[0].uploader?.username).toBe('demo')
    expect(response.data[0].tags?.[0].name).toBe('tag')
  })
})
