# Docs Atlas

Docs Atlas 是一个面向本机 Markdown 文档的聚合阅读器。

它的定位很明确：把分散在不同项目、不同目录中的设计文档、教程文档、接入说明和 AI 生成文档，聚合到一个统一入口里查看。项目同时提供 `Web` 端和 `Desktop` 端，两者共享同一套文档模型，但使用方式不同。

在线示例：

- https://xiaoliuing.github.io/docs-atlas/

补充文档：

- [DESKTOP-RELEASE.md](./DESKTOP-RELEASE.md)
- [PRD.md](./PRD.md)
- [LLM-PROMPT-TEMPLATE.md](./LLM-PROMPT-TEMPLATE.md)

## 为什么做这个项目

在 AI coding 时代，文档比过去更重要，但也更容易分散：

- 一个仓库一套 `docs/`
- 一个项目一套设计说明
- AI 生成的文档落在不同目录
- 阅读入口、搜索范围和导航方式都不统一

Docs Atlas 解决的是“本地文档聚合和阅读体验”问题，而不是在线协作或后台 CMS 问题。

## 两个端的定位

### Web

Web 端是一个静态文档站，适合：

- 聚合仓库内或配置文件里的 Markdown 文档
- 部署到 GitHub Pages、Nginx 或其他静态托管平台
- 给团队或个人提供一个统一的文档浏览入口

当前能力：

- 多文档源聚合
- 嵌套分组目录
- `README.md` 作为专题入口页
- Markdown 渲染、代码高亮、图片预览
- 文档大纲、上一篇/下一篇
- 全文搜索
- 浅色 / 暗色 / 多主题色
- SSG 输出，正文和搜索索引拆分为静态资源

### Desktop

桌面端是一个本地知识库阅读器，适合：

- 管理多个工作空间
- 为每个工作空间单独配置文档源
- 直接读取本机目录，不依赖 `config.yaml`
- 保留每个工作空间的阅读状态和搜索范围

当前能力：

- 工作空间管理
- 工作空间文档源树配置
- 文档源路径校验
- 多目录嵌套组织
- 全局搜索 / 当前工作区搜索切换
- 阅读记忆
  - 记住上次打开的工作空间
  - 记住每个工作空间上次阅读的文档
  - 记住文档滚动位置和目录展开状态
- 工作空间导入 / 导出
- 本地目录扫描和变更监听
- 桌面主题模式和主题色设置

## 文档规则

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

核心规则：

- 一级目录视为专题
- 专题下的 `README.md` 是入口页
- 其他 Markdown 视为教程或正文
- 如果文档源根目录直接放 Markdown，则左侧直接显示文档标题，不再额外包一层目录
- 目录排序采用目录优先、`README.md` 优先、自然数字排序
- 相对图片按文档所在目录解析，并在构建时复制到静态资源目录

## Web 端怎么用

### 运行环境

- Node.js 20+
- pnpm 10+

### 安装依赖

```bash
pnpm install
```

### 文档来源

Web 端默认读取项目内的 `./docs`。

如果要聚合多个目录，可以在项目根目录创建 `config.yaml`：

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

### 常用命令

启动 Web 开发环境：

```bash
pnpm dev
```

构建 Web 站点：

```bash
pnpm build
```

本地预览构建结果：

```bash
pnpm preview
```

## Desktop 端怎么用

### 本地开发环境

开发桌面端除了 `Node.js 20+` 和 `pnpm 10+`，还需要：

- Rust stable
- Tauri 运行环境
- 对应平台的桌面构建依赖

### 常用命令

启动桌面端开发环境：

```bash
pnpm dev:desktop
```

只启动桌面端前端壳层：

```bash
pnpm dev:desktop-web
```

构建桌面端安装包：

```bash
pnpm build:desktop
```

### Desktop 的文档来源方式

Desktop 端不依赖 `config.yaml`。

它通过“工作空间”来管理文档源：

- 每个工作空间可以单独配置名称、颜色和默认搜索范围
- 每个工作空间可以挂多个文档目录
- 文档目录支持嵌套分组
- 初始工作空间默认指向当前项目的 `docs/`

## 仓库结构

```text
docs-cms/
├── apps/
│   ├── web/        # Web 文档站
│   └── desktop/    # Tauri 桌面端
├── docs/           # 示例文档
├── packages/       # 共享类型等公共包
├── README.md
├── AGENTS.md
└── config.yaml
```

## 适合的场景

- 聚合多个项目的设计文档
- 管理个人本地知识库
- 为 AI 生成的 Markdown 文档提供统一阅读入口
- 团队内部查看分散在不同目录中的教程和说明文档

## 项目状态

当前版本已经完成：

- Web 端文档聚合、静态构建和部署
- 桌面端基础阅读器、工作空间和本地文档源管理

后续会继续朝更完整的本地知识库产品演进，包括更强的桌面端能力、文档管理能力，以及后续的 LLM 问答能力。
