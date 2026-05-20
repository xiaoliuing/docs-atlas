# 理解图片资源、Web 预览和静态发布

虽然 Docs Atlas 现在以桌面端为主，但 Web 端仍然是这个项目的重要补充能力。

它适合：

- 本地预览聚合结果
- 做一个对外或对内的只读文档站
- 把桌面端里验证过的内容发布出去

## 图片资源怎么组织

推荐把图片放在当前文档附近，然后通过相对路径引用：

```md
![Docs Atlas 预览示意图](./assets/docs-atlas-image-preview.svg "Docs Atlas 预览示意图")
```

示例图片：

![Docs Atlas 预览示意图](./assets/docs-atlas-image-preview.svg "Docs Atlas 预览示意图")

## 图片预览能力

桌面端和 Web 端都支持图片预览。

预览层支持：

- 放大、缩小、重置缩放
- 鼠标滚轮缩放
- 放大后拖动平移
- 同一篇文档内多张图片切换
- 键盘 `←` / `→` 切换，`Esc` 关闭

## 资源规则

- 图片路径相对于当前 Markdown 文件解析
- 图片需要位于文档源目录内部
- Web 构建时会自动复制到静态资源目录
- 打包后的资源路径会带上来源命名空间，避免重名冲突

## 什么时候用 Web 端

推荐的理解方式不是“二选一”，而是分工：

- 桌面端负责长期使用、管理和阅读
- Web 端负责预览、部署和分享

典型流程：

1. 先在桌面端整理文档和目录
2. 确认内容结构稳定
3. 再用 Web 端构建静态站点
4. 部署到 GitHub Pages 或其他静态托管平台

## Web 端如何启动

本地开发：

```bash
pnpm dev
```

构建站点：

```bash
pnpm build
```

## 如果你需要多文档源静态发布

Web 端支持在项目根目录使用 `config.yaml` 聚合多个目录：

```yaml
docs:
  items:
    - path: ./docs
      name: local
    - name: Workspace
      items:
        - path: ../backend-docs
          name: backend
```

这样桌面端负责长期阅读，Web 端负责静态发布，两者共享同一套文档规则。
