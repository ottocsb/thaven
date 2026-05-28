// http.ts

import { fetch } from '@tauri-apps/plugin-http'

type QueryValue = string | number | boolean | Array<string | number | boolean> | null | undefined

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE'

interface opt {
  method?: HttpVerb
  query?: Record<string, QueryValue>
  headers?: Record<string, string>
  callback?: (data: unknown) => void
}

const baseURL: string = 'https://wallhaven.cc/api/v1'
const requestTimes: number[] = []

export class ApiError extends Error {
  status?: number
  data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function formatQueryValue(value: QueryValue) {
  if (Array.isArray(value))
    return value.filter(item => item !== '').join(',')

  return String(value)
}

export function buildWallhavenUrl(url: string, query?: Record<string, QueryValue>) {
  const requestUrl = new URL(baseURL + url)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '')
        requestUrl.searchParams.set(key, formatQueryValue(value))
    })
  }

  return requestUrl.toString()
}

async function waitForRateLimit() {
  const now = Date.now()
  const oneMinute = 60 * 1000

  while (requestTimes.length > 0 && now - requestTimes[0] >= oneMinute)
    requestTimes.shift()

  if (requestTimes.length < 45) {
    requestTimes.push(now)
    return
  }

  const waitTime = oneMinute - (now - requestTimes[0])
  await new Promise(resolve => setTimeout(resolve, waitTime))
  return waitForRateLimit()
}

function getErrorMessage(status: number) {
  if (status === 401)
    return 'API Key 无效或无权访问该内容'

  if (status === 429)
    return '请求过于频繁，请稍后再试'

  return `请求失败：${status}`
}

// https://tauri.app/zh-cn/v1/api/js/http#fetch
export function http<T = unknown>(url: string, opts: opt = {}) {
  return new Promise((resolve, reject) => {
    const { method, query, headers, callback } = opts
    const requestUrl = buildWallhavenUrl(url, query)

    waitForRateLimit()
      .then(() => fetch(requestUrl, {
        method: method || 'GET',
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        connectTimeout: 60000,
      }))
      .then(async (response) => {
        const { status } = response
        let data: unknown = null

        try {
          data = await response.json()
        }
        catch (err) {
          throw new ApiError('响应 JSON 解析失败', status, err)
        }

        if (status >= 200 && status < 300) {
          callback && callback(data)
          resolve(data as T)
        }
        else {
          reject(new ApiError(getErrorMessage(status), status, data))
        }
      })
      .catch((err) => {
        if (err instanceof ApiError)
          reject(err)
        else
          reject(new ApiError('网络请求失败或超时', undefined, err))
      })
  })
}
