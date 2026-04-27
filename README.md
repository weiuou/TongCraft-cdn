# Tongcraft CDN

Tongcraft Minecraft 服务器玩家头像与皮肤展示站点。项目可以在本地运行一个 Node.js 预览服务器，也可以导出为纯静态文件并通过 GitHub Pages 部署。

## 功能

- 从 Mojang 接口拉取玩家皮肤。
- 裁剪并生成玩家头像 PNG。
- 首页以卡片网格展示所有玩家头像。
- 支持搜索、排序、明暗主题切换。
- 每个玩家卡片可复制头像 URL、Minecraft `give` 头颅指令，并打开 3D 皮肤查看器。
- 3D 查看器支持旋转、缩放、部位显示开关和基础动画。
- GitHub Actions 自动构建并部署到 GitHub Pages。

## 项目结构

```text
TongCraft-cdn/
├── .github/workflows/pages.yml  # GitHub Pages 部署工作流
├── avatars/                     # 本地生成的玩家头像，不提交
├── skins/                       # 本地下载的玩家皮肤，不提交
├── data/
│   ├── players.json             # 玩家列表与皮肤元数据
│   └── avatars-meta.json        # 头像生成元数据
├── scripts/
│   ├── fetch-avatars.js         # 拉取皮肤并生成头像
│   ├── add-player.js            # 按玩家名添加玩家
│   ├── check-3d-viewer.js       # Playwright 3D 查看器检查
│   ├── sync-r2.js               # 同步到 Cloudflare R2
│   └── update-meta.js           # 更新元数据
├── src/
│   ├── server.js                # 本地网页服务与静态导出入口
│   └── index.js                 # Cloudflare Worker 入口
├── dist/                        # GitHub Pages 静态构建产物，不提交
└── package.json
```

## 安装

```bash
npm install
```

## 常用命令

### 添加玩家

按玩家名添加一个玩家：

```bash
npm run add-player -- 玩家名
```

一次添加多个玩家：

```bash
npm run add-player -- "玩家名1, 玩家名2 玩家名3"
```

脚本会通过 Mojang API 查询正版 UUID，并写入 `data/players.json`。

### 拉取皮肤并生成头像

生成所有玩家的头像和皮肤文件：

```bash
npm run fetch
```

只生成指定玩家：

```bash
npm run fetch -- 玩家名1 玩家名2
```

生成结果会写入：

- `avatars/{uuid}.png`
- `skins/{uuid}.png`
- `data/players.json`
- `data/avatars-meta.json`

### 本地预览网页

```bash
npm run web
```

默认地址：

```text
http://localhost:3000
```

指定端口：

```bash
npm run web:port -- 39878
```

### 导出 GitHub Pages 静态站点

```bash
npm run build:pages
```

该命令会输出：

```text
dist/index.html
dist/avatars/*.png
dist/skins/*.png
```

`dist/` 是构建产物，不需要提交。

### 检查 3D 查看器

```bash
npm run check:3d
```

该命令会启动临时本地服务，用 Playwright 检查：

- 3D 查看器能正常打开。
- slim / classic 皮肤模型能正常渲染。
- 部位显示开关有效。
- 自动旋转和动画有效。
- 拖拽旋转有效。

## GitHub Pages 部署

项目已包含 GitHub Actions 工作流：

```text
.github/workflows/pages.yml
```

触发方式：

- 推送到 `main` 分支。
- 每天自动运行一次，用于刷新所有玩家的皮肤和头像。
- 在 GitHub Actions 页面手动运行 `Deploy GitHub Pages`。

手动运行时可以填写 `players` 输入框：

```text
Wei_uou, Player2 Player3
```

填写后工作流会先把这些玩家加入 `data/players.json`，再拉取头像和皮肤并部署页面；新增玩家数据会自动提交回仓库。留空运行则只刷新已有玩家的皮肤。

工作流会自动执行：

1. 安装依赖。
2. 如果手动输入了玩家名，运行 `npm run add-player` 更新玩家列表。
3. 运行 `npm run fetch` 拉取最新玩家头像和皮肤。
4. 如果添加了新玩家，提交更新后的 `data/players.json` 和 `data/avatars-meta.json`。
5. 运行 `npm run build:pages` 导出静态站点。
6. 上传 `dist/` 并部署到 GitHub Pages。

首次使用需要在 GitHub 仓库中开启 Pages：

```text
Settings → Pages → Source → GitHub Actions
```

部署后页面通常位于：

```text
https://你的用户名.github.io/仓库名/
```

## 页面使用说明

首页卡片包含三个按钮：

- `头像`：复制该玩家头像 PNG 的 URL。
- `指令`：复制 Minecraft 给予玩家头颅的命令。
- `3D`：打开该玩家的 3D 皮肤查看器。

复制的头颅命令格式：

```mcfunction
/give @p minecraft:player_head[minecraft:profile="玩家名"] 1
```

顶部的“复制当前指令”会复制当前搜索筛选结果中的所有头颅命令。

## Cloudflare R2 / Worker

仓库仍保留 Cloudflare 相关脚本。如果需要同步头像到 R2：

```bash
npm run sync
```

部署 Cloudflare Worker：

```bash
npm run deploy
```

这部分需要先配置 Wrangler 和 Cloudflare 凭据。

## 注意事项

- `avatars/` 和 `skins/` 是可重新生成的本地资源，已在 `.gitignore` 中忽略。
- GitHub Pages 构建时会在 Actions 中重新生成头像和皮肤文件。
- `dist/` 是静态导出结果，已忽略，不需要提交。
- 如果 Mojang 接口限流或不可用，GitHub Actions 中的头像生成步骤可能失败，可以稍后重跑工作流。
