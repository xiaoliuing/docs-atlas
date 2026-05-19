# Docs Atlas

一个面向本机 Markdown 文档的聚合阅读器。

它的目标很简单：把分散在不同项目、不同目录里的设计文档、教程文档、说明文档聚合到一个统一入口里查看。在 AI coding 时代，文档越来越重要，但也越来越容易分散，`Docs Atlas` 就是为了解决这个问题。

在线示例：

- https://xiaoliuing.github.io/docs-atlas/

补充文档：

- 桌面端发布说明：[DESKTOP-RELEASE.md](./DESKTOP-RELEASE.md)
- 产品规划：[PRD.md](./PRD.md)
- AI 文档提示词模板：[LLM-PROMPT-TEMPLATE.md](./LLM-PROMPT-TEMPLATE.md)

## 能做什么

- 聚合多个本地文档目录
- 支持嵌套分组和多文档源
- 把 `README.md` 作为专题入口页
- 展示 Markdown、代码高亮、图片预览、文档大纲、上一篇/下一篇
- 提供全文搜索、主题切换和响应式阅读体验
- 使用 SSG 输出正文和搜索索引，避免把全部文档打进主 JS
- 提供桌面端，保留 Web 端的核心阅读能力

## 运行环境

- Node.js 20+
- pnpm 10+
- macOS、Linux 或 Windows

如果只是访问已部署好的站点，不需要 Node.js。只有在本地开发、构建 Web 或打桌面端包时才需要这些运行环境。

## 快速开始

1. 安装依赖

```bash
pnpm install
```

2. 准备文档目录

- 默认读取项目内的 `./docs`
- 如果需要聚合多个目录，创建 [config.yaml](./config.yaml)

示例：

```yaml
docs:
  items:
    - path: ./docs
      name: local
    - name: Workspace
      items:
        - path: ../backend-docs
          name: backend
        - path: ../mobile-docs
          name: mobile
```

规则：

- `path` 支持相对路径和绝对路径
- `name` 是左侧模块名，也是构建后的命名空间
- `items` 支持递归嵌套
- `config.yaml` 优先级高于 `DOCS_CMS_DOCS_DIR`
- 文档路径冲突会在构建时报错

3. 启动 Web 开发环境

```bash
pnpm dev
```

4. 构建 Web 站点

```bash
pnpm build
```

5. 构建桌面端

```bash
pnpm --dir apps/desktop build
```

## 文档组织规则

推荐结构：

```text
docs/
├── mysql/
│   ├── README.md
│   └── 01-query-basics.md
├── redis/
│   ├── README.md
│   └── 01-cache-basics.md
└── architecture.md
```

- 一级目录视为专题
- 专题下的 `README.md` 是入口页
- 其他 Markdown 视为教程或正文
- 如果文档源根下直接就是 Markdown，则左侧直接显示文档标题，不再额外包一层目录
- 目录排序采用目录优先、`README.md` 优先、自然数字排序
- 相对图片会按文档位置解析，并在构建时复制到静态资源目录

## 项目定位

`Docs Atlas` 不是后台 CMS，也不是在线协作平台。

它更像一个本地文档聚合阅读器，重点是：

- 聚合
- 浏览
- 搜索
- 导航

主要服务对象是需要频繁查看多个项目设计文档、教程文档和说明文档的开发者。
