# TODO

> 依据：[wallhaven API v1 文档](https://wallhaven.cc/help/api) 和上游项目 [leoFitz1024/wallhaven](https://github.com/leoFitz1024/wallhaven) 整理。
> 原则：优先保证当前 Tauri 迁移版可用，最小化改动，先补核心功能，再补体验和扩展能力。

## P0：先修可用性

- [x] 修正 API 类型定义
  - [x] `meta.per_pag` 改为 `per_page`
  - [x] `meta.query` 支持 `string | null | { id: number; tag: string }`
  - [x] `meta.seed` 支持 `string | null`
  - [x] `searchParams.ratio` 改为 API 使用的 `ratios`
  - [x] 补齐 `Wallpaper.uploader`
  - [x] 补齐 `Wallpaper.tags`
  - [x] 补齐 `Settings`、`Collection`、`Tag` 等响应类型
  - [x] 注意 `settings.per_page` 文档示例里是字符串 `"24"`
  - [x] 注意 `collection.public` 文档示例里是 `0 | 1`
- [x] 扩展 API 封装
  - [x] `/search`
  - [x] `/w/{id}`
  - [x] `/tag/{id}`
  - [x] `/settings`
  - [x] `/collections`
  - [x] `/collections/{username}`
  - [x] `/collections/{username}/{id}`
  - [x] 统一封装查询参数序列化，过滤 `undefined`、`null`、空字符串
  - [x] 数组参数按 API 要求转成逗号分隔字符串
- [x] 修正 `getSeeting()` 拼写为 `getSetting()` 或 `getSettings()`
- [x] 接入 API Key
  - [x] 设置页保存 API Key
  - [x] 请求时支持 `apikey` 查询参数
  - [ ] 或统一使用 `X-API-Key` 请求头
  - [x] 参数名统一使用官方文档的 `apikey`，不要混用 `apiKey`
  - [x] API Key 为空时隐藏/禁用 NSFW
  - [x] API Key 错误时处理 401 并给出明确提示
- [x] 检查并补齐 Tauri HTTP 权限
  - [x] 当前已安装 `tauri-plugin-http`
  - [x] `src-tauri/capabilities/default.json` 目前只有 `core:default`
  - [x] 需要确认插件权限和访问 scope 是否完整，否则线上 API 请求可能失败
- [x] 处理 API 错误
  - [x] 401 Unauthorized
  - [x] 429 Too many requests
  - [x] 请求限流，避免超过文档里的 45 次/分钟
  - [x] 网络超时
  - [x] JSON 解析失败

## P1：在线壁纸列表

- [x] 完整搜索栏
  - [x] 关键词 `q`
  - [x] 分类 `categories`
  - [x] 纯度 `purity`
  - [x] 排序 `sorting`
    - [x] 文档列出：`date_added`、`relevance`、`random`、`views`、`favorites`、`toplist`
    - [x] 上游使用过 `hot`，但 `api.md` 当前排序参数没有列出，先标记为待验证，不作为首版默认值
  - [x] 顺序 `order`
  - [x] 排行时间范围 `topRange`
  - [x] 最小分辨率 `atleast`
  - [x] 精确分辨率 `resolutions`
  - [x] 比例 `ratios`
  - [x] 颜色 `colors`
  - [x] 随机 seed `seed`
- [x] 默认列表加载
  - [x] 默认显示最新 SFW 壁纸
  - [x] 首屏 loading
  - [x] 空状态
  - [x] 错误重试
- [x] 分页/无限滚动
  - [x] 使用 `meta.current_page`
  - [x] 使用 `meta.last_page`
  - [x] 保留 random 排序返回的 `seed`
  - [x] 防止重复请求
  - [x] 到最后一页停止加载
- [x] 壁纸卡片
  - [x] 缩略图
  - [x] 分辨率
  - [x] 文件大小
  - [x] 文件格式
  - [x] 分类/纯度标记
  - [x] 下载按钮
  - [x] 设置壁纸按钮（提示后续实现）
- [x] 大图预览
  - [x] 原图预览
  - [x] 下载当前壁纸
  - [x] 设置当前壁纸（提示后续实现）
  - [x] 显示标签/上传者/来源等详情

## P1：Tauri 原生能力

- [x] Rust 侧实现设置壁纸命令
  - [x] Windows 壁纸设置
  - [x] macOS 壁纸设置
  - [x] Linux 暂定实现或明确限制
  - [x] 不设置填充、适应、拉伸、平铺、居中等模式，由用户在系统中处理
- [x] 下载目录能力
  - [x] 选择目录
  - [x] 打开目录
  - [x] 显示文件所在位置
  - [x] 自动创建目录
- [x] 本地图片扫描
  - [x] 读取下载目录
  - [x] 过滤图片类型：jpg、jpeg、png、bmp、gif、webp
  - [x] 读取文件大小
  - [x] 读取图片尺寸
  - [x] 按创建时间或修改时间排序
  - [x] 分页返回
- [x] 文件操作
  - [x] 删除本地壁纸
  - [x] 删除前确认
  - [x] 删除失败提示
- [x] 托盘菜单
  - [x] 上一张
  - [x] 下一张
  - [x] 显示窗口
  - [x] 退出应用

## P2：核心页面补齐

- [x] 本地列表页
  - [x] 当前 `src/pages/localList.vue` 仍是 `todo`
  - [x] 显示本地壁纸
  - [x] 本地预览
  - [x] 设置为壁纸
  - [x] 删除文件
  - [x] 分页或懒加载
- [x] 下载中心（轻量历史版）
  - [x] 当前 `src/pages/downloadCenter.vue` 仍是 `todo`
  - [x] 下载中列表
  - [x] 下载进度（显示下载中/完成/失败状态，不做字节级进度）
  - [ ] 下载速度（本版不做速度统计）
  - [ ] 暂停（本版不做真实暂停）
  - [ ] 恢复（本版不做真实恢复，失败任务支持重试）
  - [ ] 取消（本版不做取消正在运行的后端下载）
  - [x] 已完成列表
  - [x] 打开文件位置
- [x] 设置页
  - [x] API Key
  - [x] 下载目录
  - [x] 重置应用数据
- [x] 关于页
  - [x] 当前 `src/pages/about.vue` 仍是 `todo`
  - [x] 项目说明
  - [x] 当前版本
  - [x] 上游链接
  - [x] API 文档链接
  - [x] 许可证说明


## P3：界面和体验
- [x] 清理模板残留
  - [x] `src/components/HelloWorld.vue`
  - [x] `src/components/counter.vue`
  - [x] `src/assets/vue.svg`
- [x] 菜单和路由体验
  - [x] 当前菜单高亮
  - [x] 页面标题
  - [x] 404 页面
- [x] 图片加载体验
  - [x] 懒加载
  - [x] 占位状态
  - [x] 加载失败占位
- [x] 窗口体验
  - [x] 最小化到托盘
  - [x] 最大化/还原
  - [x] 关闭行为确认或隐藏到托盘

## P3：测试与构建

- [x] 最小单元测试
  - [x] API 参数序列化
  - [x] API 响应类型解析
  - [x] 文件大小格式化
  - [x] 下载状态流转
- [x] Tauri 命令测试
  - [x] 本地目录扫描
  - [x] 下载目录创建
  - [x] 删除文件
  - [x] 设置壁纸命令返回值
- [x] 构建检查
  - [x] `pnpm build`
  - [x] `cargo tauri build`（本机未安装 `cargo-tauri`，已用项目本地 `pnpm exec tauri build` 验证）
  - [x] 图标
  - [x] 应用名
  - [x] 版本号
  - [x] Windows 安装包
- [x] README 更新
  - [x] 开发命令
  - [x] 构建命令
  - [x] API Key 获取方式
  - [x] 已知限制

## 建议执行顺序

1. 修 API 类型、请求封装和 Tauri HTTP 权限。
2. 把在线列表做完整，先能稳定浏览、筛选、分页。
3. 做下载目录、本地扫描、下载中心。
4. 做设置壁纸和托盘上一张/下一张。
5. 做设置页，把 API Key、目录等必要配置串起来。
6. 最后补 collections、测试和 README。
