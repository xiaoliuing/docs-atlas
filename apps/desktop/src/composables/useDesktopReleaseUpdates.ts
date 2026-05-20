import { computed, shallowRef } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { openExternalUrl } from '@/api/system'

const RELEASES_URL = 'https://github.com/xiaoliuing/docs-atlas/releases'
const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/xiaoliuing/docs-atlas/releases/latest'

type GithubLatestReleasePayload = {
  tag_name?: string
  name?: string
  html_url?: string
  published_at?: string
  draft?: boolean
  prerelease?: boolean
}

export type DesktopReleaseUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
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

  const hasAvailableUpdate = computed(() => status.value === 'available' && latestRelease.value !== null)

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
    message.value = '正在检查最新版本…'

    try {
      const response = await fetch(LATEST_RELEASE_API_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      })

      if (!response.ok) {
        throw new Error(`更新服务暂时不可用（${response.status}）`)
      }

      const payload = (await response.json()) as GithubLatestReleasePayload
      const release = normalizeLatestRelease(payload)
      latestRelease.value = release
      lastCheckedAt.value = new Date().toISOString()

      if (compareVersions(release.version, currentVersion.value) > 0) {
        status.value = 'available'
        message.value = `发现新版本 ${release.version}`
        return
      }

      status.value = 'up-to-date'
      message.value = `当前已是最新版本 ${currentVersion.value}`
    } catch (error) {
      status.value = 'error'
      message.value = error instanceof Error ? error.message : '检查更新失败，请稍后重试'
    }
  }

  async function openLatestRelease() {
    const targetUrl = latestRelease.value?.htmlUrl || RELEASES_URL
    await openExternalUrl(targetUrl)
  }

  return {
    checkForUpdates,
    currentVersion,
    hasAvailableUpdate,
    lastCheckedAt,
    latestRelease,
    loadCurrentVersion,
    message,
    openLatestRelease,
    status,
  }
}

function normalizeLatestRelease(payload: GithubLatestReleasePayload): DesktopLatestRelease {
  const version = normalizeVersion(payload.tag_name)

  if (!version) {
    throw new Error('最新版本信息格式不正确')
  }

  if (payload.draft || payload.prerelease) {
    throw new Error('当前没有可用的正式版本')
  }

  return {
    version,
    name: payload.name?.trim() || `Docs Atlas Desktop ${version}`,
    htmlUrl: payload.html_url?.trim() || RELEASES_URL,
    publishedAt: payload.published_at?.trim() || '',
  }
}

function normalizeVersion(input?: string) {
  if (!input) {
    return ''
  }

  return input.trim().replace(/^desktop-v/i, '').replace(/^v/i, '')
}

function compareVersions(left: string, right: string) {
  const leftParts = parseVersionParts(left)
  const rightParts = parseVersionParts(right)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1
    }
  }

  return 0
}

function parseVersionParts(input: string) {
  const normalized = normalizeVersion(input)

  if (!normalized) {
    return [0]
  }

  return normalized
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0))
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
