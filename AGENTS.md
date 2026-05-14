# Docs Atlas Rules

## Project Scope

`Docs Atlas` 是一个独立的 `pnpm + Vue 3 + TypeScript + Vite 8` 文档站工程。
它只负责把本地 Markdown 教程组织成前端阅读站，不包含后台编辑、用户系统或服务端 API。

## Source Of Truth

- 默认文档源目录为工程内 `docs/`
- 支持通过环境变量 `DOCS_CMS_DOCS_DIR` 覆盖文档目录
- 支持通过 `config.yaml` 配置多个文档目录
- 只扫描当前配置目录下的 `**/*.md`
- YAML 配置里的 `name` 是左侧目录模块名，也是打包后路由和静态资源的来源目录名
- 每个来源目录下的一级目录视为一个专题
- 每个专题下的 `README.md` 是专题导读页
- 其余 Markdown 文件才是教程详情页
- 如果来源目录根下直接就是 Markdown 文件，没有子目录，则左侧目录直接显示文档标题，不额外包一层目录
- 环境变量支持相对路径和绝对路径
- YAML 配置存在时优先级高于单目录环境变量
- 多个来源目录出现重复 slug 时，必须在构建期直接报错

## Delivery Mode

- 站点输出形态为 SSG
- 首页、专题页、文档页都需要生成对应静态 HTML
- 文档正文不能继续整体打进客户端主 JS
- 文档正文与搜索索引需要拆成静态 JSON 资源按需加载

## Project Structure

- `src/app/`：应用壳层与路由装配
- `src/views/`：页面视图，保持薄，只负责组合
- `src/components/docs/`：文档正文、目录、搜索、分页、侧栏
- `src/components/layout/`：头部等全局布局组件
- `src/composables/`：搜索、路由取文档、主题、标题高亮等逻辑
- `src/assets/main.css`：全局 token、主题变量、排版与代码高亮样式
- `scripts/docsData.ts`：Markdown 扫描、索引生成、HTML 渲染、链接改写

## Routing Rules

- `/`：首页
- `/section/:section`：专题页，同时对应该专题 `README.md`
- `/docs/:slug(.*)`：教程详情页
- 找不到文档时进入友好空状态 / 404 视图

## Catalog Rules

- 左侧目录先按文档来源模块分组，模块名取自 YAML 配置的 `name`
- 模块支持展开收起
- 模块内如果存在专题目录，一级只显示专题标题
- 点击专题标题进入该专题 `README.md` 对应的专题页
- 专题子项才显示教程标题
- 模块根下如果直接是文档，则直接显示文档标题，不额外生成目录层级
- 目录默认全部收起
- 同一时间只能展开一个模块
- 同一时间只能展开一个专题

## Markdown Pipeline Rules

- Markdown 构建期统一处理，入口固定在 `scripts/docsData.ts`
- `virtual:docs-data` 只保留轻量元数据
- 文档详情与搜索索引通过静态资源文件输出到 `dist/__docs/`
- 使用 `markdown-it` 渲染
- 使用 `highlight.js` 做代码高亮
- HTML 输出必须先经过安全清洗
- 相对 `.md` 链接必须改写为站内路由
- `README.md` 链接需要改写到专题页
- `h2 / h3` 需要进入右侧目录导航
- 文档标题卡片已经显示页面标题，正文里的首个 `h1` 需要在构建期移除，不能重复显示

## Search Rules

- 搜索是前端内存索引，不接后端服务
- 搜索索引不能打进客户端主 bundle
- 搜索索引需要独立输出并在前端按需加载
- 搜索字段包含标题、摘要、正文纯文本、标题目录
- 移动端顶部默认只显示搜索图标
- 点击搜索图标后，第二行搜索框展开并聚焦
- 再次点击搜索图标需要可以收起搜索框
- 桌面端搜索框保持常驻显示

## UI Rules

- 主主题色固定为 `#1F54D9`
- 必须支持浅色和暗色主题切换
- 全局设计 token 放在 `src/assets/main.css`
- 新增页面或组件时优先复用现有主题变量，不要直接写死颜色
- 代码块必须保持高亮样式
- 移动端头部采用两行布局：
  - 第一行放导航、站点标题、搜索入口、主题切换
  - 第二行按需显示搜索框
- 移动端正文左右留白必须对称

## Engineering Rules

- 使用 Composition API 与 `<script setup lang="ts">`
- 不引入 Pinia，优先使用 composables
- 视图组件保持薄，复杂逻辑放到 composables
- 组件通信遵循 props down / events up
- 暴露给父组件的交互能力仅限明确的 `defineExpose` 场景
- 改内容索引或路由规则时，同时检查 `requirements.md` 与 `technical-design.md` 是否仍然准确

## Do Not Edit

- 不要手改 `dist/`
- 不要手改 `node_modules/`
- 不要把设计 token 分散复制到多个组件里

## Verification

- 开发：`pnpm dev`
- 构建：`pnpm build`
- 每次改动内容索引、头部布局、搜索交互或 Markdown 渲染后，至少执行一次 `pnpm build`
