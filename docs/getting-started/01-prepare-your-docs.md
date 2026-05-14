# 准备你的文档目录

开始使用 `Docs Atlas` 之前，先准备一份清晰的 Markdown 目录结构。

## 推荐结构

最常见的方式是按主题或项目分目录：

```text
docs/
├── backend/
│   ├── README.md
│   ├── 01-architecture.md
│   └── 02-api-design.md
├── mobile/
│   ├── README.md
│   └── 01-build-process.md
└── team-rules.md
```

## 基本规则

- 一级目录视为一个专题
- 每个专题下的 `README.md` 是入口页
- 其他 Markdown 文件按顺序展示
- 根目录下的 Markdown 会作为独立文档直接显示

## 文件命名建议

为了让阅读顺序更稳定，建议正文使用带序号的文件名：

```text
01-architecture.md
02-module-design.md
03-deployment.md
```

## 标题建议

每篇文档都建议以一个一级标题开头：

```md
# 后端架构设计
```

然后正文主要使用 `##` 和 `###`：

```md
## 目标
## 模块划分
### API 层
### Service 层
```

## 下一步

目录准备好之后，可以继续看：

- [配置多个文档来源](./02-configure-multiple-sources.md)
