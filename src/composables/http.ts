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
    const { method, query, data, headers, callback } = opts
    fetch(baseURL + url, {
      method: method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      timeout: 60000,
      query,
   
    })
      .then(({ data, status }) => {
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
