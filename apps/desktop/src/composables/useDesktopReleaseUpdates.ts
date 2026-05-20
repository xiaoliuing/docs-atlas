import { shallowRef } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { openExternalUrl } from '@/api/system'

const RELEASES_URL = 'https://github.com/xiaoliuing/docs-atlas/releases'

export type DesktopReleaseUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'relaunching'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

export type DesktopLatestRelease = {
  version: string
  name: string
  htmlUrl: string
  publishedAt: string
}

export function useDesktopReleaseUpdates() {
  const currentVersion = shallowRef('')
  const latestRelease = shallowRef<DesktopLatestRelease | null>(null)
  const lastCheckedAt = shallowRef('')
  const status = shallowRef<DesktopReleaseUpdateStatus>('idle')
  const message = shallowRef('')

  async function loadCurrentVersion() {
    if (!isTauriRuntime()) {
      currentVersion.value = ''
      status.value = 'unsupported'
      message.value = '仅桌面应用支持检查更新。'
      return
    }

    try {
      currentVersion.value = await getVersion()
      if (status.value === 'unsupported') {
        status.value = 'idle'
        message.value = ''
      }
    } catch (error) {
      status.value = 'error'
      message.value = error instanceof Error ? error.message : '无法读取当前版本'
    }
  }

  async function checkForUpdates() {
    if (!isTauriRuntime()) {
      status.value = 'unsupported'
      message.value = '仅桌面应用支持检查更新。'
      return
    }

    if (!currentVersion.value) {
      await loadCurrentVersion()
      if (!currentVersion.value) {
        status.value = 'error'
        message.value = '无法读取当前版本'
        return
      }
    }

    status.value = 'checking'
    message.value = '正在检查更新…'

    try {
      const update = await check()
      lastCheckedAt.value = new Date().toISOString()

      if (update) {
        latestRelease.value = {
          version: update.version,
          name: `Docs Atlas ${update.version}`,
          htmlUrl: RELEASES_URL,
          publishedAt: update.date ?? '',
        }
        status.value = 'available'
        message.value = `发现新版本 ${update.version}`
        return
      }

      status.value = 'up-to-date'
      message.value = `当前已是最新版本 ${currentVersion.value}`
      latestRelease.value = null
    } catch (error) {
      status.value = 'error'
      message.value = error instanceof Error ? error.message : '检查更新失败，请稍后重试'
    }
  }

  async function installUpdate() {
    if (!isTauriRuntime()) {
      status.value = 'unsupported'
      message.value = '仅桌面应用支持安装更新。'
      return
    }

    status.value = 'checking'
    message.value = '正在准备更新包…'

    try {
      const update = await check()

      if (!update) {
        status.value = 'up-to-date'
        message.value = `当前已是最新版本 ${currentVersion.value}`
        latestRelease.value = null
        return
      }

      latestRelease.value = {
        version: update.version,
        name: `Docs Atlas ${update.version}`,
        htmlUrl: RELEASES_URL,
        publishedAt: update.date ?? '',
      }
      lastCheckedAt.value = new Date().toISOString()

      let downloadedBytes = 0
      let contentLength: number | null = null
      status.value = 'downloading'
      message.value = `正在下载更新 ${update.version}…`

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength ?? null
          status.value = 'downloading'
          message.value = contentLength
            ? `正在下载更新… 0%`
            : `正在下载更新 ${update.version}…`
          return
        }

        if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          status.value = 'downloading'

          const percent = contentLength
            ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
            : null

          message.value =
            percent === null
              ? `正在下载更新… ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`
              : `正在下载更新… ${percent}%`
          return
        }

        status.value = 'installing'
        message.value = '正在安装更新…'
      })

      status.value = 'relaunching'
      message.value = '更新已安装，正在重启应用…'
      await relaunch()
    } catch (error) {
      status.value = 'error'
      message.value = error instanceof Error ? error.message : '安装更新失败，请稍后重试'
    }
  }

  async function openLatestRelease() {
    const targetUrl = latestRelease.value?.htmlUrl || RELEASES_URL
    await openExternalUrl(targetUrl)
  }

  return {
    checkForUpdates,
    currentVersion,
    installUpdate,
    lastCheckedAt,
    latestRelease,
    loadCurrentVersion,
    message,
    openLatestRelease,
    status,
  }
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
