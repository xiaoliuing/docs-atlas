import { invoke } from '@tauri-apps/api/core'
import type {
  WorkspaceDetail,
  WorkspaceSourceNodeInput,
  WorkspaceSourceScanPayload,
  WorkspaceUpsertInput,
} from '@docs-atlas/shared-types/workspace'
import { browserDefaultWorkspaces, createDefaultWorkspaces } from '@/mocks/workspaces'

const STORAGE_KEY = 'docs-atlas.desktop.workspaces.v1'
const SEED_VERSION_KEY = 'docs-atlas.desktop.workspaces.seed-version'
const CURRENT_SEED_VERSION = '2'

export type WorkspaceSaveInput = WorkspaceUpsertInput & {
  sources?: WorkspaceSourceNodeInput[]
}

export type SourcePathValidation = {
  exists: boolean
  isDirectory: boolean
}

export async function listWorkspaceDetails(): Promise<WorkspaceDetail[]> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceDetail[]>('list_workspace_details')
  }

  return readBrowserWorkspaces()
}

export async function upsertWorkspace(input: WorkspaceSaveInput): Promise<WorkspaceDetail> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceDetail>('upsert_workspace', { input })
  }

  const workspaces = readBrowserWorkspaces()
  const now = new Date().toISOString()
  const nextWorkspace: WorkspaceDetail = {
    id: input.id,
    name: input.name,
    description: input.description ?? '',
    icon: input.icon ?? '',
    color: input.color ?? '#1f54d9',
    defaultSearchScope: input.defaultSearchScope ?? workspaces.find((workspace) => workspace.id === input.id)?.defaultSearchScope ?? 'global',
    sortOrder: input.sortOrder ?? workspaces.find((workspace) => workspace.id === input.id)?.sortOrder ?? workspaces.length,
    createdAt: workspaces.find((workspace) => workspace.id === input.id)?.createdAt ?? now,
    updatedAt: now,
    lastOpenedAt: input.lastOpenedAt ?? null,
    sources: cloneSources(input.sources ?? workspaces.find((workspace) => workspace.id === input.id)?.sources ?? []),
  }

  const nextWorkspaces = sortWorkspaces([
    nextWorkspace,
    ...workspaces.filter((workspace) => workspace.id !== input.id),
  ])
  writeBrowserWorkspaces(nextWorkspaces)
  return nextWorkspace
}

export async function markWorkspaceOpened(workspaceId: string): Promise<WorkspaceDetail | null> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceDetail | null>('mark_workspace_opened', { workspaceId })
  }

  const workspaces = readBrowserWorkspaces()
  const target = workspaces.find((workspace) => workspace.id === workspaceId)
  if (!target) {
    return null
  }

  const now = new Date().toISOString()
  const updated = {
    ...target,
    updatedAt: now,
    lastOpenedAt: now,
  }
  writeBrowserWorkspaces(sortWorkspaces([updated, ...workspaces.filter((workspace) => workspace.id !== workspaceId)]))
  return updated
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>('delete_workspace', { workspaceId })
  }

  const workspaces = readBrowserWorkspaces()
  if (workspaces.length <= 1) {
    return false
  }

  const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId)
  if (nextWorkspaces.length === workspaces.length) {
    return false
  }

  writeBrowserWorkspaces(
    sortWorkspaces(
      nextWorkspaces.map((workspace, index) => ({
        ...workspace,
        sortOrder: index,
      })),
    ),
  )
  return true
}

export async function pickFolderPath(): Promise<string | null> {
  if (isTauriRuntime()) {
    return invoke<string | null>('pick_folder_path')
  }

  if (typeof window === 'undefined') {
    return null
  }

  return window.prompt('输入文档目录路径')
}

export async function validateSourcePath(path: string): Promise<SourcePathValidation> {
  if (isTauriRuntime()) {
    return invoke<SourcePathValidation>('validate_source_path', { path })
  }

  return {
    exists: Boolean(path.trim()),
    isDirectory: Boolean(path.trim()),
  }
}

export async function scanWorkspaceSources(sources: WorkspaceSourceNodeInput[]): Promise<WorkspaceSourceScanPayload> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceSourceScanPayload>('scan_workspace_sources', { sources })
  }

  return {
    documents: [],
    sourceStatuses: [],
  }
}

export async function getDefaultDocsPath(): Promise<string> {
  if (isTauriRuntime()) {
    return invoke<string>('get_default_docs_path')
  }

  return './docs'
}

function readBrowserWorkspaces(): WorkspaceDetail[] {
  if (typeof window === 'undefined') {
    return cloneWorkspaces(browserDefaultWorkspaces)
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    const seeded = cloneWorkspaces(browserDefaultWorkspaces)
    writeBrowserWorkspaces(seeded)
    markBrowserSeedVersion()
    return seeded
  }

  try {
    const parsed = JSON.parse(rawValue) as WorkspaceDetail[]
    const next = maybeMigrateLegacyBrowserWorkspaces(parsed)
    return cloneWorkspaces(next)
  } catch {
    const seeded = cloneWorkspaces(browserDefaultWorkspaces)
    writeBrowserWorkspaces(seeded)
    markBrowserSeedVersion()
    return seeded
  }
}

export async function buildDefaultSeedWorkspaces(): Promise<WorkspaceDetail[]> {
  const defaultDocsPath = await getDefaultDocsPath()
  return createDefaultWorkspaces(defaultDocsPath)
}

function writeBrowserWorkspaces(workspaces: WorkspaceDetail[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))
}

function maybeMigrateLegacyBrowserWorkspaces(workspaces: WorkspaceDetail[]) {
  if (typeof window === 'undefined') {
    return workspaces
  }

  const savedSeedVersion = window.localStorage.getItem(SEED_VERSION_KEY)
  if (savedSeedVersion === CURRENT_SEED_VERSION) {
    return workspaces
  }

  if (isLegacySeedWorkspaceSet(workspaces)) {
    const seeded = cloneWorkspaces(browserDefaultWorkspaces)
    writeBrowserWorkspaces(seeded)
    markBrowserSeedVersion()
    return seeded
  }

  markBrowserSeedVersion()
  return workspaces
}

function markBrowserSeedVersion() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function cloneWorkspaces(workspaces: WorkspaceDetail[]): WorkspaceDetail[] {
  return sortWorkspaces(
    workspaces.map((workspace, index) => ({
      ...workspace,
      defaultSearchScope: workspace.defaultSearchScope ?? 'global',
      sortOrder: workspace.sortOrder ?? index,
      sources: cloneSources(workspace.sources),
    })),
  )
}

function cloneSources(sources: WorkspaceDetail['sources']): WorkspaceDetail['sources'] {
  return sources.map((source) => ({
    ...source,
    children: cloneSources(source.children),
  }))
}

function sortWorkspaces(workspaces: WorkspaceDetail[]) {
  return [...workspaces].sort((left, right) => {
    return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
}

function isLegacySeedWorkspaceSet(workspaces: WorkspaceDetail[]) {
  if (workspaces.length === 0) {
    return true
  }

  if (workspaces.length === 1 && workspaces[0]?.id === 'workspace:default') {
    return !matchesCurrentDefaultWorkspace(workspaces[0])
  }

  return workspaces.every((workspace) => {
    return (
      LEGACY_WORKSPACE_IDS.has(workspace.id) ||
      workspace.sources.some((source) => containsLegacySeedMarker(source))
    )
  })
}

function matchesCurrentDefaultWorkspace(workspace: WorkspaceDetail) {
  if (workspace.sources.length !== 1) {
    return false
  }

  const [source] = workspace.sources
  return (
    workspace.name === '项目文档' &&
    source.id === 'node:project-docs' &&
    source.kind === 'folder' &&
    source.name === '项目文档' &&
    normalizePath(source.path) === './docs' &&
    source.children.length === 0
  )
}

function containsLegacySeedMarker(source: WorkspaceDetail['sources'][number]): boolean {
  if (
    LEGACY_SOURCE_IDS.has(source.id) ||
    LEGACY_SOURCE_NAMES.has(source.name) ||
    normalizePath(source.path).includes('config.yaml') ||
    normalizePath(source.path).includes('config.yml')
  ) {
    return true
  }

  return source.children.some((child) => containsLegacySeedMarker(child))
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').trim().toLowerCase()
}

const LEGACY_WORKSPACE_IDS = new Set(['workspace:atlas', 'workspace:product', 'workspace:ai'])
const LEGACY_SOURCE_IDS = new Set(['source:atlas', 'source:product', 'source:ai'])
const LEGACY_SOURCE_NAMES = new Set(['AI-Agent', 'Another Project', 'Local Workspace'])
