# 配置多个文档来源

`Docs Atlas` 的核心能力之一，就是聚合多个本地文档目录。

## 使用 config.yaml

你可以在项目根目录创建 `config.yaml`。

推荐写法是统一使用 `items`：

```yaml
docs:
  items:
    - path: ./docs
      name: local
    - name: Workspace
      items:
        - path: ../backend-docs
          name: backend
    - name: Client
      items:
        - path: ../mobile-docs
          name: mobile
```

## 字段说明

### path

`path` 是文档目录路径，支持：

- 相对路径
- 绝对路径

### name

`name` 有两个作用：

- 作为左侧导航中的模块名称
- 作为打包后路由和静态资源的命名空间
- 在嵌套配置里，完整路径也会参与最终命名空间生成

### items

`items` 是递归节点数组：

- 节点有 `path` 时，表示一个文档源
- 节点有 `items` 时，表示一个分组
- 两者可以组合出任意层级

旧的 `sources / groups / children` 还可以继续用，但现在推荐统一写成 `items`，更容易理解。

例如：

- `/docs/backend/...`
- `/docs/mobile/...`

## 命名建议

`name` 建议保持简洁、稳定、可读，例如：

- `backend`
- `mobile`
- `infra`
- `design-system`

## 冲突处理

如果多个来源里最终生成了相同的文档路径，构建时会直接报错。

所以最稳妥的做法是：

- 给每个来源使用不同的 `name`
- 在各自目录里保持清晰的主题划分

## 目录排序

目录默认按接近 VS Code Explorer 的方式排序：

- 目录优先
- `README.md` 优先
- 文件名自然数字排序，例如 `01-`、`02-`、`10-`

## 下一步

如果你还想用 AI 帮你快速生成内容，可以继续看：

- [用 AI 生成可直接接入的文档](./03-ai-docs-workflow.md)
