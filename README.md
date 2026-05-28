<div align="center">
    <h1>
		<a href="https://github.com/ottocsb/thaven" target="_blank">thaven</a>
	</h1>
    <p>快捷的wallhaven的壁纸软件</p>
</div>

<br />

## `node` 版本推荐

面向现代，所以推荐大家使用 `node` 当前的长期维护版本 `v18`

## `rust` 版本推荐

最新的稳定版本即可


## 开发

前端建议使用 `pnpm` 包管理器

1. 安装前端依赖

```shell
pnpm install
```

2. 运行开发环境

```shell
pnpm exec tauri dev
```

如果已安装 `cargo-tauri` 子命令，也可以使用：

```shell
cargo tauri dev
```

## 测试

```shell
pnpm test
cd src-tauri
cargo test
```

## 构建

前端构建：

```shell
pnpm build
```

Tauri 打包：

```shell
pnpm exec tauri build
```

如果已安装 `cargo-tauri`，也可以使用：

```shell
cargo tauri build
```

Windows 构建产物位于：

- `src-tauri/target/release/thaven.exe`
- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

## API Key

在 wallhaven 登录后进入 API 设置页获取 API Key：

https://wallhaven.cc/settings/account

应用内进入“设置”页保存 API Key。未配置 API Key 时，NSFW 内容会自动禁用。

## 已知限制

- Linux 暂不支持设置系统壁纸。
- 下载中心不统计实时下载速度，不支持真实暂停、恢复或取消正在运行的后端下载；失败任务可以重试。
- 壁纸填充、适应、拉伸、平铺、居中等显示模式交由系统设置处理。
