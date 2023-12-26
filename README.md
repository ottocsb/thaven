<div align="center">
    <h1>
		<a href="https://github.com/ottocsb/thaven" target="_blank">thaven</a>
	</h1>
    <p>快捷的wallhaven的壁纸软件</p>
</div>

<br />
<br />

## `node` 版本推荐

面向现代，所以推荐大家使用 `node` 当前的长期维护版本 `v18`

<br />

## 使用

建议使用 `pnpm` 包管理器 👉 [安装教程](https://pnpm.io/zh/installation)

1. 安装依赖

```shell
pnpm install
```

2. 开发

```shell
pnpm dev

# 开启 host
pnpm dev:host

# 自动打开浏览器
pnpm dev:open
```

3. 预览

```shell
pnpm preview

# 开启 host
pnpm preview:host

# 自动打开浏览器
pnpm preview:open
```

4. 打包

```shell
pnpm build

pnpm build:debug
```

5. 依赖更新

```shell
# 依赖版本更新
pnpm deps:fresh
```

```shell
# 以上命令仅对包信息 package.json 进行写入，需要重新执行包安装命令
pnpm i
```

6. 代码规范校验

```shell
pnpm lint

# 校验时修复
pnpm lint:fix
```

<br />
<br />


