# Readmate Web

微信读书划线 / 想法的网页版阅读器（非官方）。  
粘贴微信读书 Skill API Key（`wrk-…`），同步笔记本与划线到**浏览器 localStorage**，按书浏览、全文搜索。无账号、无服务端数据库。

灵感来自 [Readmate](https://readmate.app/)，接口来自官方 [Tencent/WeChatReading](https://github.com/Tencent/WeChatReading) Skills。

## 功能（v1）

- 粘贴 / 校验 API Key，一键清除本机数据
- 同步：`/user/notebooks`（分页）+ `/shelf/sync` + 每本书 `/book/bookmarklist`、`/review/list/mine`
- 书架列表（封面、书名、作者、划线数）
- 书籍详情：按章节 / 按时间看划线，附带个人想法
- 全局搜索：书名、作者、划线与想法正文
- 双通道请求：先尝试直连网关，CORS 失败后自动走代理

## 获取 API Key

1. 打开 [微信读书 Skills 页面](https://weread.qq.com/r/weread-skills) 登录，复制 `wrk-` 开头的 Key  
2. 或在 App：我 → 设置 → 微信读书技能 → 获取 API Key（需最新版）

Key **只存在本机** `localStorage` 键名：

| 键 | 含义 |
|----|------|
| `readmate.apiKey` | API Key |
| `readmate.data` | 书籍 / 划线 / 想法缓存 |
| `readmate.preferProxy` | 是否优先走代理 |
| `readmate.proxyUrl` | 自定义代理 URL |

## 本地运行

```bash
npm install
npm run dev
```

开发服务器把 `/api/weread` 代理到 `https://i.weread.qq.com/api/agent/gateway`，因此本地一般**不需要**单独起 Worker。

```bash
npm run build    # 必须通过
npm run preview
```

## CORS 与代理 Worker

官方网关 `POST https://i.weread.qq.com/api/agent/gateway` 的 `Access-Control-Allow-Origin` 仅为 `https://weread.qq.com`，浏览器网页直连会被拦。

仓库内 `worker/proxy.ts` 是一个**无状态**转发 Worker：

- 只接受 `POST` / `OPTIONS`
- 要求 `Authorization: Bearer wrk-…`
- **不落盘、不记录** API Key，原样转发

部署代理：

```bash
npx wrangler deploy -c wrangler.proxy.toml
# 记下 *.workers.dev 地址，在设置页填为代理 URL
# 或构建时：
# VITE_WEREAD_PROXY_URL=https://readmate-weread-proxy.<subdomain>.workers.dev npm run build
```

前端默认代理路径是 `/api/weread`（可与 Pages Functions / 路由绑到同一 Worker）。

## 部署到 Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=readmate-web
```

建议同时部署 `wrangler.proxy.toml` 中的 Worker，并在 Pages 自定义域名下把 `/api/weread` 指到该 Worker，或把 Worker URL 写进设置页 / `VITE_WEREAD_PROXY_URL`。

## 已知限制

- Skill 版本固定跟随官方文档当前值（`skill_version: 1.0.5`）；若回包带 `upgrade_info` 会提示升级
- 笔记本用 `count` + `lastSort` 游标分页；书很多时完整同步较慢，且对网关有轻微限速（约 80ms/本）
- `/book/bookmarklist` 不含书签正文；书签只在概览计数里
- 不实现分享卡片、小组件、每日提醒、Kindle、账号体系（v1 范围外）
- API Key 等同账号凭证，请勿发到不可信环境；清除数据可在「设置」一键完成

## 技术栈

Vite + TypeScript（无框架 SPA）、Cloudflare Pages（静态）+ 可选 Worker 代理。
