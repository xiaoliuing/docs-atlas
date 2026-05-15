# Docs Atlas

一个面向本机 Markdown 文档的聚合文档系统。

在线示例：

- https://xiaoliuing.github.io/docs-atlas/

它的目标很直接：把不同项目、不同目录里的设计文档、教程文档、说明文档聚合到一个站点里统一查看。在 AI coding 时代，文档的重要性变高了，但文档也更容易分散在各个仓库里。`Docs Atlas` 就是为了解决“文档分散、查看成本高”这个问题。

## 能做什么

- 聚合多个本地文档目录
- 按模块分组显示，不同目录来源清晰区分
- 把 `README.md` 作为目录入口页
- 展示 Markdown 正文、右侧目录、上一篇/下一篇
- 支持全文搜索
- 支持代码高亮、图片预览、浅色/暗色主题、移动端阅读
- 使用 SSG 构建，正文和搜索索引按静态资源输出

## 适合什么场景

- 聚合多个项目的设计文档
- 聚合个人知识库和教程文档
- 给 AI 生成的项目文档提供统一承载界面
- 团队内部查看分散在不同仓库里的说明文档

## 怎么用

## 运行环境

当前版本面向开发环境使用，运行前需要本机具备下面这些环境：

- Node.js 20+
- pnpm 10+
- macOS、Linux 或 Windows

如果你只是想阅读已经构建好的静态产物，不需要 Node.js。

如果你要本地开发、预览或重新构建项目，则需要安装 Node.js 和 pnpm。

### 1. 安装

```bash
pnpm install
```

### 2. 配置文档目录

默认读取 `./docs`。

如果要聚合多个目录，使用 [config.yaml](./config.yaml)：

```yaml
docs:
  sources:
    - path: ./docs
      name: local
    - path: ../backend-docs
      name: backend
    - path: /absolute/path/to/another-docs
      name: another
```

说明：

- `name` 是左侧目录模块名，也是打包后路由和静态资源的来源目录名
- `path` 支持相对路径和绝对路径
- `config.yaml` 优先级高于环境变量 `DOCS_CMS_DOCS_DIR`
- 如果多个目录里生成了重复 slug，构建时会直接报错

也可以只配置一个外部目录：

```bash
DOCS_CMS_DOCS_DIR=../my-project/docs
```

### 3. 启动

```bash
pnpm dev
```

### 4. 构建

```bash
pnpm build
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

规则很简单：

- 一个 `source` 对应左侧一个模块
- 模块下的一级目录视为一个专题
- 专题里的 `README.md` 是入口页
- 其他 Markdown 是教程或正文
- 如果某个目录根下直接就是 Markdown 文件，没有子目录，则直接显示文档标题，不再包一层目录
- Markdown 里的相对图片会按文档所在目录解析，并在构建时复制到站点静态资源目录
- 相对图片建议放在对应 `source` 目录内部，这样开发态和打包态都能正常显示

## AI 文档工作流

这个项目也适合作为 AI 生成文档的承载层。

推荐流程：

1. 让 AI 按固定规则生成一组 Markdown 文档
2. 把生成结果放进某个 docs 目录
3. 用 `Docs Atlas` 聚合展示

项目里提供了一个简化提示词模板：

- [LLM-PROMPT-TEMPLATE.md](./LLM-PROMPT-TEMPLATE.md)

## 技术栈

- Vue 3
- TypeScript
- Vite 8
- Vite SSG
- markdown-it
- highlight.js

## 项目定位

`Docs Atlas` 不是后台 CMS，也不是在线协作系统。

它更像一个“本地文档聚合阅读器”：

- 文档源是你自己的本地目录
- 重点是聚合、浏览、搜索、导航
- 重点服务对象是开发者，尤其是要频繁查看多个项目设计文档的人

## Roadmap

当前版本更偏开发者项目，运行和构建仍然需要 Node.js。

后续计划会朝“可直接给普通用户使用”的方向推进：

1. 把文档扫描和索引从构建期改成运行时，让用户不需要先构建才能查看文档。
2. 支持在界面里管理多个本地文档目录，而不是只靠手改配置文件。
3. 把项目封装成可安装的桌面应用，目标是用户不需要安装 Node.js 也能直接使用。
4. 增强全文搜索、阅读历史、收藏和跨项目筛选能力。
5. 完善发布、更新、日志和错误反馈机制，让它更适合作为正式产品使用。

长期目标很明确：把 `Docs Atlas` 做成一个真正可用的本地文档聚合阅读器，帮助开发者更轻松地查看多个项目的设计文档、教程文档和说明文档。
