import { computed, shallowRef } from 'vue'
import type { DesktopSearchScope } from '@/composables/useDesktopDocsSearch'

const STORAGE_KEY = 'docs-atlas.desktop.reading-state.v1'

type DesktopSidebarState = {
  openBranchIds: string[]
  openSectionId: string | null
}

type DesktopReadingState = {
  currentWorkspaceId: string
  selectedDocByWorkspaceId: Record<string, string>
  searchScopeByWorkspaceId: Record<string, DesktopSearchScope>
  sidebarStateByWorkspaceId: Record<string, DesktopSidebarState>
  scrollTopByDocKey: Record<string, number>
}

const defaultState: DesktopReadingState = {
  currentWorkspaceId: '',
  scrollTopByDocKey: {},
  searchScopeByWorkspaceId: {},
  selectedDocByWorkspaceId: {},
  sidebarStateByWorkspaceId: {},
}

const readingState = shallowRef<DesktopReadingState>(cloneDefaultState())
let hasLoaded = false
let persistTimer: number | null = null

export function useDesktopReadingState() {
  ensureLoaded()

  return {
    currentWorkspaceId: computed(() => readingState.value.currentWorkspaceId),
    getDocScrollTop,
    getSearchScopeForWorkspace,
    getSelectedDocForWorkspace,
    getSidebarStateForWorkspace,
    setCurrentWorkspaceId,
    setDocScrollTop,
    setSearchScopeForWorkspace,
    setSelectedDocForWorkspace,
    setSidebarStateForWorkspace,
  }
}

function ensureLoaded() {
  if (hasLoaded) {
    return
  }

  hasLoaded = true

  if (typeof window === 'undefined') {
    return
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return
    }

    readingState.value = normalizeState(JSON.parse(rawValue) as Partial<DesktopReadingState>)
  } catch {
    readingState.value = cloneDefaultState()
  }
}

function normalizeState(value: Partial<DesktopReadingState>): DesktopReadingState {
  return {
    currentWorkspaceId: typeof value.currentWorkspaceId === 'string' ? value.currentWorkspaceId : '',
    scrollTopByDocKey: normalizeStringNumberMap(value.scrollTopByDocKey),
    searchScopeByWorkspaceId: normalizeScopeMap(value.searchScopeByWorkspaceId),
    selectedDocByWorkspaceId: normalizeStringMap(value.selectedDocByWorkspaceId),
    sidebarStateByWorkspaceId: normalizeSidebarStateMap(value.sidebarStateByWorkspaceId),
  }
}

function setCurrentWorkspaceId(workspaceId: string) {
  if (!workspaceId || readingState.value.currentWorkspaceId === workspaceId) {
    return
  }

  readingState.value = {
    ...readingState.value,
    currentWorkspaceId: workspaceId,
  }
  schedulePersist()
}

function getSelectedDocForWorkspace(workspaceId: string) {
  return readingState.value.selectedDocByWorkspaceId[workspaceId] ?? ''
}

function setSelectedDocForWorkspace(workspaceId: string, slug: string) {
  if (!workspaceId || !slug || readingState.value.selectedDocByWorkspaceId[workspaceId] === slug) {
    return
  }

  readingState.value = {
    ...readingState.value,
    selectedDocByWorkspaceId: {
      ...readingState.value.selectedDocByWorkspaceId,
      [workspaceId]: slug,
    },
  }
  schedulePersist()
}

function getSearchScopeForWorkspace(workspaceId: string, fallback: DesktopSearchScope): DesktopSearchScope {
  const scope = readingState.value.searchScopeByWorkspaceId[workspaceId]
  return scope === 'workspace' || scope === 'global' ? scope : fallback
}

function setSearchScopeForWorkspace(workspaceId: string, scope: DesktopSearchScope) {
  if (!workspaceId || readingState.value.searchScopeByWorkspaceId[workspaceId] === scope) {
    return
  }

  readingState.value = {
    ...readingState.value,
    searchScopeByWorkspaceId: {
      ...readingState.value.searchScopeByWorkspaceId,
      [workspaceId]: scope,
    },
  }
  schedulePersist()
}

function getSidebarStateForWorkspace(workspaceId: string): DesktopSidebarState | null {
  const value = readingState.value.sidebarStateByWorkspaceId[workspaceId]
  if (!value) {
    return null
  }

  return {
    openBranchIds: [...value.openBranchIds],
    openSectionId: value.openSectionId,
  }
}

function setSidebarStateForWorkspace(workspaceId: string, value: DesktopSidebarState) {
  if (!workspaceId) {
    return
  }

  const nextValue: DesktopSidebarState = {
    openBranchIds: [...value.openBranchIds],
    openSectionId: value.openSectionId,
  }
  const currentValue = readingState.value.sidebarStateByWorkspaceId[workspaceId]

  if (
    currentValue &&
    currentValue.openSectionId === nextValue.openSectionId &&
    currentValue.openBranchIds.join('::') === nextValue.openBranchIds.join('::')
  ) {
    return
  }

  readingState.value = {
    ...readingState.value,
    sidebarStateByWorkspaceId: {
      ...readingState.value.sidebarStateByWorkspaceId,
      [workspaceId]: nextValue,
    },
  }
  schedulePersist()
}

function getDocScrollTop(workspaceId: string, slug: string) {
  const key = createDocKey(workspaceId, slug)
  return Math.max(0, readingState.value.scrollTopByDocKey[key] ?? 0)
}

function setDocScrollTop(workspaceId: string, slug: string, top: number) {
  const key = createDocKey(workspaceId, slug)
  const normalizedTop = Number.isFinite(top) ? Math.max(0, Math.round(top)) : 0

  if (!key || readingState.value.scrollTopByDocKey[key] === normalizedTop) {
    return
  }

  readingState.value = {
    ...readingState.value,
    scrollTopByDocKey: {
      ...readingState.value.scrollTopByDocKey,
      [key]: normalizedTop,
    },
  }
  schedulePersist()
}

function createDocKey(workspaceId: string, slug: string) {
  if (!workspaceId || !slug) {
    return ''
  }

  return `${workspaceId}::${slug}`
}

function schedulePersist() {
  if (typeof window === 'undefined') {
    return
  }

  if (persistTimer) {
    window.clearTimeout(persistTimer)
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readingState.value))
  }, 80)
}

function normalizeStringMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim()),
  )
}

function normalizeScopeMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, DesktopSearchScope] => entry[1] === 'global' || entry[1] === 'workspace',
    ),
  )
}

function normalizeSidebarStateMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([workspaceId, sidebarState]) => {
      if (!sidebarState || typeof sidebarState !== 'object') {
        return []
      }

      const openBranchIds = Array.isArray((sidebarState as DesktopSidebarState).openBranchIds)
        ? (sidebarState as DesktopSidebarState).openBranchIds.filter((item): item is string => typeof item === 'string' && item.trim())
        : []
      const openSectionId =
        typeof (sidebarState as DesktopSidebarState).openSectionId === 'string'
          ? (sidebarState as DesktopSidebarState).openSectionId
          : null

      return [[workspaceId, { openBranchIds, openSectionId } satisfies DesktopSidebarState]]
    }),
  )
}

function normalizeStringNumberMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, top]) => {
      if (typeof top !== 'number' || !Number.isFinite(top)) {
        return []
      }

      return [[key, Math.max(0, Math.round(top))]]
    }),
  )
}

function cloneDefaultState(): DesktopReadingState {
  return {
    currentWorkspaceId: defaultState.currentWorkspaceId,
    scrollTopByDocKey: { ...defaultState.scrollTopByDocKey },
    searchScopeByWorkspaceId: { ...defaultState.searchScopeByWorkspaceId },
    selectedDocByWorkspaceId: { ...defaultState.selectedDocByWorkspaceId },
    sidebarStateByWorkspaceId: { ...defaultState.sidebarStateByWorkspaceId },
  }
}
