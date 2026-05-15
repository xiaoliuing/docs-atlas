# Docs Atlas

## Scope

- `Docs Atlas` 是本地 Markdown 聚合文档站。
- 技术栈：`Vue 3 + TypeScript + Vite 8 + vite-ssg`
- 只做阅读、导航、搜索，不做后台编辑和后端 API。

## Content Rules

- 默认文档目录是 `docs/`
- 支持 `config.yaml` 配置多个文档源，`name` 作为左侧模块名、路由命名空间和静态资源命名空间
- 一级目录视为专题，`README.md` 是专题导读
- 其余 Markdown 视为教程详情
- 如果文档源根下直接是 Markdown，则左侧直接显示文档标题，不额外包一层专题
- 重复 slug 必须在构建期报错

## Routing And Build

- `/` 首页
- `/section/:section` 专题页
- `/docs/:slug(.*)` 文档页
- 输出形态是 SSG
- 文档正文和搜索索引拆到静态 JSON，不能整体打进主 JS

## Markdown Rules

- Markdown 入口在 `scripts/docsData.ts`
- 使用 `markdown-it + highlight.js`
- HTML 必须先清洗
- 相对 `.md` 链接改写为站内路由
- `README.md` 链接改写到专题页
- `h2 / h3` 进入右侧目录
- 首个 `h1` 在正文中移除，避免和标题卡片重复

## UI Rules

- 全局样式和主题变量放在 `src/assets/main.css`
- 不要写死颜色，优先使用主题变量
- 支持浅色、暗色、系统主题和多主题色
- 左侧目录按文档源分组，默认收起，同一时间只展开一个模块和一个专题
- 桌面端搜索框常驻，移动端用图标展开

## Engineering

- 使用 Composition API 和 `<script setup lang="ts">`
- 不引入 Pinia，优先用 composables
- 视图组件保持薄，复杂逻辑放到 composables
- 不手改 `dist/` 和 `node_modules/`

## Verify

- 开发：`pnpm dev`
- 构建：`pnpm build`
- 改索引、路由、搜索、主题、Header、Markdown 渲染后，至少跑一次 `pnpm build`
