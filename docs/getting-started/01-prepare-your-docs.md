# 下载桌面端并完成首次启动

如果你是第一次接触 `Docs Atlas`，推荐直接从桌面端开始。

## 第一步：下载桌面端

下载地址：

- Latest Release: https://github.com/xiaoliuing/docs-atlas/releases/latest
- Releases 页面: https://github.com/xiaoliuing/docs-atlas/releases

当前最新版本是 `desktop-v0.31.10`，发布时间为 `2026-05-20`。

当前可用安装包包括：

- macOS Apple Silicon: `.dmg`
- Windows x64: `.exe` / `.msi`
- Linux x64: `.AppImage` / `.deb` / `.rpm`

## 第二步：首次打开会看到什么

桌面端首次启动后，会默认带一个工作空间，指向项目内的 `docs/` 示例目录。

这个默认工作空间的意义是：

- 让你不用先配置任何外部目录
- 可以直接看到项目自带的示例文档
- 可以快速理解目录、搜索、阅读和图片预览的整体体验

## 第三步：理解工作空间

在桌面端里，工作空间是最重要的概念。

你可以把一个工作空间理解成：

- 一组文档来源
- 一套独立的阅读上下文
- 一份长期保存的本地知识库入口

每个工作空间都可以拥有：

- 自己的名称和颜色
- 自己的文档源树
- 自己的默认搜索范围
- 自己上次阅读的文档和位置

## macOS 用户需要注意什么

当前桌面端 macOS 包没有接入 Apple 签名与 notarization。

这意味着在部分 macOS 设备上，首次打开时可能会遇到系统安全提示，需要用户手动放行后再启动。这个限制来自 macOS 平台本身，不影响 Windows 和 Linux 包下载。

## 下一步

完成首次启动后，下一步就是把你自己的文档目录挂进工作空间：

- [配置工作空间与文档源](./02-configure-multiple-sources.md)
