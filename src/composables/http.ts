// http.js

import { Body, ResponseType, fetch } from '@tauri-apps/api/http'

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
      responseType: ResponseType.JSON,
      timeout: 60000,
      query,
      body: Body.json({
        ...data,
      }),
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
