# Docs Atlas 发布流程

这份文档说明 Docs Atlas 桌面端的标准发布方式。

Web 示例站继续走 GitHub Pages，桌面端安装包和更新清单走 GitHub Release。

## 发布方式

统一使用根目录命令：

```bash
pnpm release:desktop -- --bump patch --message "fix: stabilize desktop reader interactions"
```

脚本会自动完成这些动作：

1. 读取当前桌面端版本
2. 按 `major | minor | patch` 递增版本
3. 同步更新以下文件中的版本号
4. 执行版本一致性校验
5. `git add -A`
6. 使用你传入的提交信息执行 `git commit`
7. 创建 tag：`desktop-vx.y.z`
8. 推送当前分支
9. 推送 tag，触发 GitHub Action 自动构建并发布 Release

## 会同步更新的文件

- `apps/desktop/package.json`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`

## 参数说明

```bash
pnpm release:desktop -- --bump patch --message "fix: xxx"
```

可用参数：

- `--bump major`
- `--bump minor`
- `--bump patch`
- `--message "提交信息"`
- `--tag-message "自定义 tag 注释"`
- `--remote origin`
- `--dry-run`

也支持把版本类型写成第一个位置参数：

```bash
pnpm release:desktop -- patch --message "fix: xxx"
```

## 提交信息记忆

脚本会把最近一次使用的提交信息写入：

```text
.git/.docs-atlas-release.json
```

下次如果你不传 `--message`，会优先复用上一次的提交信息。

## 推荐用法

日常修复：

```bash
pnpm release:desktop -- --bump patch --message "fix: repair desktop updater workflow"
```

新增功能：

```bash
pnpm release:desktop -- --bump minor --message "feat: add workspace source validation"
```

破坏性调整：

```bash
pnpm release:desktop -- --bump major --message "feat: ship desktop 2.0 release"
```

## 仅预演发布

如果只想看脚本准备做什么，不真正提交和推送：

```bash
pnpm release:desktop -- --bump patch --message "fix: xxx" --dry-run
```

## 发布前建议

执行前建议确认：

- 当前就在 `docs-cms` 仓库根目录
- 本次要发布的改动已经准备好
- `origin` 指向正式仓库
- 本地已经登录并具备推送权限

## 发布后的实际链路

推送 tag 后，会触发：

- `.github/workflows/release-desktop.yml`

工作流会：

1. 在 macOS / Windows / Linux 构建桌面端安装包
2. 创建或更新对应的 GitHub Release
3. 生成并上传 `latest.json`
4. 更新 `desktop-updater/latest.json`

## 失败排查

如果发布失败，优先检查：

- `package.json`、`tauri.conf.json`、`Cargo.toml` 的版本是否一致
- tag 是否已经存在
- 当前分支是否可推送
- GitHub Actions 中桌面端 release 工作流是否正常
