# Docs Atlas Desktop Phase 2 Technical Plan

## 1. 目标

这份文档用于把 `Docs Atlas Desktop Phase 2 PRD` 转成可执行的技术实施方案，并明确开发顺序。

本阶段的总目标不是一次性把桌面端全部做完，而是按里程碑逐步交付：

1. 不破坏现有 Web 端能力
2. 抽出可长期复用的共享核心
3. 建立桌面端工程骨架
4. 明确本地 SQLite 数据模型
5. 让桌面端逐步接管 Workspace、文档源配置、本地索引和后续问答底座

## 2. 总体技术路线

### 2.1 工程结构

采用 `pnpm workspace` Monorepo。

```text
docs-cms/
├── apps/
│   ├── web/
│   └── desktop/
├── packages/
│   ├── shared-types/
│   ├── workspace-db/
│   ├── docs-core/
│   ├── search-core/
│   └── ui-core/
├── docs/
├── open-docs/
├── config.yaml
└── package.json
```

### 2.2 运行形态

- `apps/web`
  - 继续保留现有 SSG 文档站能力
  - 作为示例站和公开演示站
- `apps/desktop`
  - 面向最终桌面产品
  - 初期先做 Vue 桌面前端壳
  - 下一里程碑接入 Tauri 2
- `packages/*`
  - 抽离共享模型、配置、索引和 UI

### 2.3 数据存储

本地数据层统一采用 SQLite。

现阶段先定义并实现：

- Workspace 元数据
- Source Tree 配置
- 应用偏好设置
- 最近打开工作区

后续逐步加入：

- 文档索引
- 搜索倒排或检索辅助表
- 阅读历史
- 收藏
- LLM chunk / retrieval 元数据

## 3. 分阶段实施计划

## Phase 2A: 工程重组与共享底座

### 目标

- 建立 Monorepo 结构
- 保持 `pnpm dev` 和 `pnpm build` 仍可用
- 新增桌面端前端工程骨架
- 抽出共享类型包
- 抽出 SQLite 数据模型包

### 交付物

- `pnpm-workspace.yaml`
- `apps/web`
- `apps/desktop`
- `packages/shared-types`
- `packages/workspace-db`

### 说明

这一阶段不追求完整桌面能力，重点是把工程边界定清楚。

## Phase 2B: Workspace 管理 MVP

### 目标

- 桌面端支持创建、查看、切换 Workspace
- Workspace 数据写入本地 SQLite
- Workspace 配置支持导入 / 导出

### 交付物

- Workspace 列表页
- Workspace 详情页
- 新建 / 编辑 Workspace 表单
- SQLite 持久化接口

## Phase 2C: 文档源树与本地配置可视化

### 目标

- 支持可视化维护 Source Tree
- 支持 Group / Folder Source 嵌套
- 支持启用 / 禁用 / 排序 / 重命名

### 交付物

- Source Tree Editor
- 目录选择器
- 路径校验
- Source Tree 数据落库

## Phase 2D: 运行时文档索引

### 目标

- 桌面端不再依赖构建期扫描
- 启动时加载 Workspace 的文档源
- 扫描 Markdown、图片和相对链接
- 建立运行时索引

### 交付物

- `docs-core` 初版
- 文件监听器
- 运行时目录树生成
- 文档详情加载器

## Phase 2E: 搜索与阅读增强

### 目标

- 支持 Workspace 级全文搜索
- 搜索结果高亮和命中定位
- 阅读历史、最近打开、收藏

### 交付物

- `search-core` 初版
- 搜索索引表
- 搜索 UI 和命中定位
- 阅读行为数据表

## Phase 2F: Tauri 集成与生产化

### 目标

- 接入 Tauri 2
- 打通系统目录选择、文件定位、日志、设置目录
- 生成桌面安装包

### 交付物

- `src-tauri` 工程
- Tauri command bridge
- 应用菜单与窗口配置
- Release 构建流程

## Phase 2G: LLM 底座

### 目标

- 为后续问答保留索引接口
- 支持 chunk 元数据和来源回溯

### 交付物

- chunk schema
- retrieval 接口草案
- Provider 配置结构

## 4. 模块拆分

## 4.1 packages/shared-types

职责：

- 统一 Doc、Workspace、Source Tree、Search、Theme 等类型
- 作为 Web 与 Desktop 的共享契约

建议导出：

- `docs.ts`
- `workspace.ts`
- `preferences.ts`

## 4.2 packages/workspace-db

职责：

- 管理本地 SQLite schema
- 提供 Workspace、Source Tree、Settings 的数据访问接口
- 初期使用 Node 侧 SQLite 实现，后续平移到 Tauri / Rust

建议导出：

- `schema.ts`
- `workspaceRepository.ts`
- `settingsRepository.ts`
- `database.ts`

## 4.3 apps/web

职责：

- 保留第一阶段 Web 文档站
- 优先迁移到共享类型
- 后续逐步迁移到共享 `docs-core`、`search-core`

## 4.4 apps/desktop

职责：

- 承载桌面端交互
- 管理 Workspace
- 调用本地配置和索引能力

## 5. SQLite 数据库设计

数据库文件建议：

- `~/Library/Application Support/DocsAtlas/docs-atlas.db` on macOS
- 对应平台标准应用数据目录

### 5.1 表：workspaces

```sql
create table if not exists workspaces (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '',
  color text not null default '',
  created_at text not null,
  updated_at text not null,
  last_opened_at text
);
```

### 5.2 表：workspace_source_nodes

```sql
create table if not exists workspace_source_nodes (
  id text primary key,
  workspace_id text not null,
  parent_id text,
  kind text not null,
  name text not null,
  path text not null default '',
  enabled integer not null default 1,
  position integer not null default 0,
  created_at text not null,
  updated_at text not null,
  foreign key (workspace_id) references workspaces(id) on delete cascade
);
```

说明：

- `kind` 取值：
  - `group`
  - `folder`
- `parent_id` 为空表示根节点

### 5.3 表：app_settings

```sql
create table if not exists app_settings (
  key text primary key,
  value_json text not null,
  updated_at text not null
);
```

### 5.4 表：recent_workspace_entries

```sql
create table if not exists recent_workspace_entries (
  workspace_id text primary key,
  opened_at text not null,
  foreign key (workspace_id) references workspaces(id) on delete cascade
);
```

### 5.5 后续预留表

- `documents`
- `document_headings`
- `document_assets`
- `search_records`
- `reading_history`
- `favorites`
- `doc_chunks`

## 6. 桌面端组件边界

### 第一批组件

- `DesktopAppShell`
  - 负责桌面端顶层布局、标题栏区域、左右栏容器
- `WorkspaceSidebar`
  - 负责工作环境列表和切换
- `WorkspaceOverviewPanel`
  - 负责显示当前 Workspace 概览信息
- `WorkspaceSourceTree`
  - 负责展示嵌套文档源树
- `WorkspaceSourceNode`
  - 负责单个树节点渲染
- `DesktopSettingsPanel`
  - 负责应用状态说明和下一步入口

### 第一批 composables

- `useWorkspaceSelection()`
  - 负责当前工作环境切换
- `useDesktopTheme()`
  - 负责桌面端主题模式

## 7. 开发顺序

### Step 1

- 新增技术实施文档
- 明确 SQLite schema 和阶段目标

### Step 2

- 建立 workspace 目录
- 迁移现有 Web 应用到 `apps/web`
- 保持根目录用户配置入口不变

### Step 3

- 新增 `shared-types`
- Web 端开始消费共享类型

### Step 4

- 新增 `workspace-db`
- 实现初始化 SQLite、列出 Workspace、保存 Workspace

### Step 5

- 新增桌面端 Vue 前端骨架
- 实现 Workspace 列表和 Source Tree 预览

### Step 6

- 调整 GitHub Action
- 让 Web Demo 和 Desktop CI 解耦

## 8. 本次代码实现范围

本次提交只实现 `Phase 2A` 的第一批可运行底座：

- 技术实施文档
- Monorepo 基础结构
- Web 应用迁移到 `apps/web`
- Desktop 前端壳
- Shared Types
- Workspace SQLite schema 与 repository 初版
- GitHub Pages workflow 调整

不在本次提交内：

- Tauri 完整集成
- 运行时 Markdown 索引
- 桌面端真实文件扫描
- LLM 问答

## 9. 验证标准

### Web

- `pnpm dev` 仍然可以启动 Web
- `pnpm build` 仍然可以构建 Web

### Desktop

- `pnpm dev:desktop` 可以启动桌面端前端壳
- `pnpm build:desktop` 可以构建桌面端前端壳

### Shared

- Web 可以正常消费共享类型
- SQLite repository 能初始化数据库 schema

## 10. 结论

第二阶段的正确起点不是直接堆桌面功能，而是先把工程拆清楚、把数据模型定下来。

这次的实现原则是：

- 先底座，后能力
- 先共享，后分叉
- 先本地 SQLite 模型，后 Tauri / Rust 执行层
- 先让 Web 稳住，再让 Desktop 长出来
