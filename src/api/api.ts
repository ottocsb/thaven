import { useRequest } from 'vue-request'
import type { metaD, searchParams } from '~/plugins/type'

enum url {
  search = '/search',
  setting = '/settings',
  collect = '/collections',
  tag = '/tag',
  w = '/w',
}

/**
 * 搜索
 *
 * @param {string} q 搜索关键字
 * @param {string} categories 分类
 * @param {string} purity 纯净度
 * @param {string} sorting 排序
 * @param {string} order 顺序
 * @param {string} topRange 顶部范围
 * @param {string} atleast 最小
 * @param {string} resolution 分辨率
 * @param {string} ratio 比例
 * @param {string} colors 颜色
 * @param {string} page 页数
 * @param {string} seed 种子
 * @example const {data, loading, error, runAsync} = search()
 * @returns {data, loading, error, runAsync}
 *
 */

export function search() {
  const { data, loading, error, runAsync } = useRequest(
    (query?: searchParams) => http(url.search, { query }),
    { manual: true },
  )
  return { data: data as Ref<metaD>, loading, error, runAsync }
}

export function getSeeting() {
  const { data, loading, error, runAsync } = useRequest(
    (apikey: string) => http(url.setting, {
      query: {
        apikey,
      },
    }),
    { manual: true },
  )
  return { data, loading, error, runAsync }
}
