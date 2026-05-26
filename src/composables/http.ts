// http.ts

import { fetch } from '@tauri-apps/plugin-http';


type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE'

interface opt {
  method?: HttpVerb
  query?: any
  data?: any
  headers?: any
  callback?: any
}

const baseURL: string = 'https://wallhaven.cc/api/v1'

// https://tauri.app/zh-cn/v1/api/js/http#fetch
export function http(url: string, opts: opt) {
  return new Promise((resolve, reject) => {
    const { method, query, headers, callback } = opts
    const requestUrl = new URL(baseURL + url)
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null)
          requestUrl.searchParams.set(key, String(value))
      })
    }

    fetch(requestUrl.toString(), {
      method: method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      connectTimeout: 60000,
   
    })
      .then(async (response) => {
        const data = await response.json()
        const { status } = response
        if (status === 200) {
          callback && callback(data)
          resolve(data)
        }
        else {
          reject(data)
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
