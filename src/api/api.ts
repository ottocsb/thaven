import {useRequest} from 'vue-request'

enum url {
    search = '/search',
    setting = '/settings',
    collect = '/collections',
    tag = '/tag',
    w = '/w',
}

interface searchParams {
    q: string;
    categories: string;
    purity: string;
    sorting: string;
    order: string;
    topRange: string;
    atleast: string;
    resolution: string;
    ratio: string;
    colors: string;
    page: string;
    seed: string;
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
export const search = () => {
    const {data, loading, error, runAsync} = useRequest(
        (params: searchParams) => http.get(url.search,
            {
                params: {
                    q: params.q,
                    categories: params.categories,
                    purity: params.purity,
                    sorting: params.sorting,
                    order: params.order,
                    topRange: params.topRange,
                    atleast: params.atleast,
                    resolution: params.resolution,
                    ratio: params.ratio,
                    colors: params.colors,
                    page: params.page,
                    seed: params.seed
                }
            }),
        {manual: true})
    return {data, loading, error, runAsync}
}

export const getSeeting = () => {
    const {data, loading, error, runAsync} = useRequest(
        (apikey: String) => http.get(url.setting,
            {
                params: {
                    apikey: apikey,
                }
            }
        ),
        {manual: true})
    return {data, loading, error, runAsync}
}
