# Docs Atlas Desktop Release

这份文档只说明桌面端发布。

Web 示例站继续使用 GitHub Pages。

桌面端发布已经拆成独立 GitHub Action：

- 工作流文件：`.github/workflows/release-desktop.yml`
- 触发方式：
  - 推送 tag：`desktop-v0.31.9`
  - GitHub Actions 页面手动执行 `Release Docs Atlas Desktop`

## 发布前需要做什么

1. 确认桌面端版本号已经更新

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`

2. 确认本地能通过基本检查

```bash
pnpm --filter @docs-atlas/desktop build:web-shell
cd apps/desktop/src-tauri && cargo check
```

3. 如果要让 macOS 用户下载后可直接打开，需要配置 Apple 签名与 notarization Secrets：

- `APPLE_CERTIFICATE`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_KEYCHAIN_PASSWORD`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_PRIVATE_KEY`

说明：

- `APPLE_CERTIFICATE`
  Developer ID Application 证书导出的 `.p12` 文件内容，要求先转成 base64 再放进 Secret
- `APPLE_CERTIFICATE_PASSWORD`
  导出 `.p12` 时设置的密码
- `APPLE_KEYCHAIN_PASSWORD`
  CI 临时 keychain 的密码，自定义一个高强度值即可
- `APPLE_API_ISSUER`
  App Store Connect API Key 的 Issuer ID
- `APPLE_API_KEY`
  App Store Connect API Key 的 Key ID
- `APPLE_API_PRIVATE_KEY`
  下载得到的 `AuthKey_XXXXXX.p8` 文件全文内容

如果不配置这些 Apple 相关 secrets：

- workflow 现在不会失败
- 仍会继续构建未签名的 macOS 安装包
- 但普通用户下载后大概率会看到“已损坏，无法打开”或需要手动放行

## Apple 准备

要做正式 macOS 分发，你需要：

1. 加入 Apple Developer Program
2. 创建 `Developer ID Application` 证书
3. 导出 `.p12`
4. 在 App Store Connect 创建 API Key
5. 把证书和 API Key 放到 GitHub Secrets

把 `.p12` 转成 base64：

```bash
openssl base64 -in developer-id-application.p12 -out apple-certificate.base64.txt
```

把 `apple-certificate.base64.txt` 内容粘到 `APPLE_CERTIFICATE`。

## 推荐发布方式

推荐用 tag 触发正式发布：

```bash
git tag desktop-v0.31.9
git push origin desktop-v0.31.9
```

工作流会：

- 在 macOS / Windows / Ubuntu 上分别构建桌面端安装包
- 在 macOS runner 上自动导入 Developer ID 证书
- 自动执行 macOS notarization
- 自动创建或更新 GitHub Release
- 把构建产物上传到对应 Release

## 手动发布

如果只是想先验一次构建链路，可以在 GitHub Actions 页面手动执行：

- `draft = true`
- `prerelease = true` 或 `false`

这更适合内部验证，不会影响 Pages 示例站。

## 和 Web 发布的关系

- `deploy-pages.yml` 只负责 Web 示例站
- `release-desktop.yml` 只负责桌面端安装包
- 以后桌面端代码提交不会因为 README 或根版本号变动自动触发 Pages 部署
