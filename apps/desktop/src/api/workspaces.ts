import { invoke } from '@tauri-apps/api/core'
import type {
  WorkspaceDetail,
  WorkspaceSourceNodeInput,
  WorkspaceSourceScanPayload,
  WorkspaceSourceWatchEvent,
  WorkspaceSourceNode,
  WorkspaceUpsertInput,
} from '@docs-atlas/shared-types/workspace'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
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

export type WorkspaceSourceWatchHandler = (payload: WorkspaceSourceWatchEvent) => void
type WorkspaceTransferPayload = {
  schemaVersion: 1
  exportedAt: string
  workspace: {
    name: string
    description: string
    icon: string
    color: string
    defaultSearchScope: WorkspaceDetail['defaultSearchScope']
    sources: WorkspaceSourceNodeInput[]
  }
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

export async function exportWorkspaceConfig(workspace: WorkspaceDetail): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>('export_workspace_config', { workspaceId: workspace.id })
  }

  if (typeof window === 'undefined') {
    return false
  }

  const payload: WorkspaceTransferPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace: {
      name: workspace.name,
      description: workspace.description,
      icon: workspace.icon,
      color: workspace.color,
      defaultSearchScope: workspace.defaultSearchScope,
      sources: cloneSourceInputs(toSourceInputs(workspace.sources)),
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const href = window.URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = href
  anchor.download = `${sanitizeWorkspaceFilename(workspace.name)}.docs-atlas-workspace.json`
  anchor.click()
  window.URL.revokeObjectURL(href)
  return true
}

export async function importWorkspaceConfig(): Promise<WorkspaceDetail | null> {
  if (isTauriRuntime()) {
    return invoke<WorkspaceDetail | null>('import_workspace_config')
  }

  if (typeof window === 'undefined') {
    return null
  }

  const file = await pickWorkspaceImportFile()
  if (!file) {
    return null
  }

  const rawValue = await file.text()
  const payload = parseWorkspaceTransferPayload(rawValue)
  if (!payload) {
    throw new Error('导入文件格式不正确')
  }

  const workspaces = readBrowserWorkspaces()
  const importedWorkspace = buildImportedWorkspaceDetail(payload)
  const nextWorkspaces = sortWorkspaces([importedWorkspace, ...workspaces])
  writeBrowserWorkspaces(nextWorkspaces)
  return importedWorkspace
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

export async function pickFolderPaths(): Promise<string[]> {
  if (isTauriRuntime()) {
    return invoke<string[]>('pick_folder_paths')
  }

  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.prompt('输入多个文档目录路径，使用换行、逗号或分号分隔')
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
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

export async function watchWorkspaceSources(workspaceId: string, sources: WorkspaceSourceNodeInput[]): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }

  await invoke('watch_workspace_sources', { workspaceId, sources })
}

export async function unwatchWorkspaceSources(): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }

  await invoke('unwatch_workspace_sources')
}

export async function listenWorkspaceSourceWatch(handler: WorkspaceSourceWatchHandler): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {}
  }

  return listen<WorkspaceSourceWatchEvent>('workspace-sources-changed', (event) => {
    handler(event.payload)
  })
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

function toSourceInputs(sources: WorkspaceSourceNode[]): WorkspaceSourceNodeInput[] {
  return sources.map((source) => ({
    id: source.id,
    parentId: source.parentId,
    kind: source.kind,
    name: source.name,
    path: source.path,
    enabled: source.enabled,
    position: source.position,
    children: toSourceInputs(source.children),
  }))
}

function cloneSourceInputs(sources: WorkspaceSourceNodeInput[]): WorkspaceSourceNodeInput[] {
  return sources.map((source) => ({
    ...source,
    children: cloneSourceInputs(source.children ?? []),
  }))
}

function sanitizeWorkspaceFilename(value: string) {
  const normalized = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
  return normalized || 'workspace'
}

function pickWorkspaceImportFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = window.document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener(
      'change',
      () => {
        resolve(input.files?.[0] ?? null)
      },
      { once: true },
    )
    input.click()
  })
}

function parseWorkspaceTransferPayload(rawValue: string): WorkspaceTransferPayload | null {
  try {
    const value = JSON.parse(rawValue) as Partial<WorkspaceTransferPayload>
    if (value.schemaVersion !== 1 || !value.workspace) {
      return null
    }

    if (
      typeof value.workspace.name !== 'string' ||
      typeof value.workspace.description !== 'string' ||
      typeof value.workspace.icon !== 'string' ||
      typeof value.workspace.color !== 'string' ||
      (value.workspace.defaultSearchScope !== 'global' && value.workspace.defaultSearchScope !== 'workspace') ||
      !Array.isArray(value.workspace.sources)
    ) {
      return null
    }

    return {
      schemaVersion: 1,
      exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
      workspace: {
        name: value.workspace.name,
        description: value.workspace.description,
        icon: value.workspace.icon,
        color: value.workspace.color,
        defaultSearchScope: value.workspace.defaultSearchScope,
        sources: normalizeImportedSourceInputs(value.workspace.sources),
      },
    }
  } catch {
    return null
  }
}

function normalizeImportedSourceInputs(value: unknown[]): WorkspaceSourceNodeInput[] {
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const source = item as Partial<WorkspaceSourceNodeInput>
    if (
      (source.kind !== 'group' && source.kind !== 'folder') ||
      typeof source.name !== 'string'
    ) {
      return []
    }

    return [{
      id: typeof source.id === 'string' && source.id.trim() ? source.id : `import-source:${index}`,
      parentId: typeof source.parentId === 'string' ? source.parentId : null,
      kind: source.kind,
      name: source.name,
      path: typeof source.path === 'string' ? source.path : '',
      enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
      position: typeof source.position === 'number' ? source.position : index,
      children: normalizeImportedSourceInputs(Array.isArray(source.children) ? source.children : []),
    } satisfies WorkspaceSourceNodeInput]
  })
}

function buildImportedWorkspaceDetail(payload: WorkspaceTransferPayload): WorkspaceDetail {
  const now = new Date().toISOString()
  const workspaceId = `workspace:${crypto.randomUUID()}`
  const sources = rebuildImportedSources(payload.workspace.sources, workspaceId, null)

  return {
    id: workspaceId,
    name: payload.workspace.name.trim() || '导入的工作区',
    description: payload.workspace.description,
    icon: payload.workspace.icon || 'folder',
    color: payload.workspace.color || '#1f54d9',
    defaultSearchScope: payload.workspace.defaultSearchScope,
    sortOrder: readBrowserWorkspaces().length,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    sources,
  }
}

function rebuildImportedSources(
  sources: WorkspaceSourceNodeInput[],
  workspaceId: string,
  parentId: string | null,
): WorkspaceDetail['sources'] {
  return sources.map((source, index) => {
    const nextId = `source-node:${crypto.randomUUID()}`
    return {
      id: nextId,
      workspaceId,
      parentId,
      kind: source.kind,
      name: source.name,
      path: source.kind === 'folder' ? source.path ?? '' : '',
      enabled: source.enabled ?? true,
      position: source.position ?? index,
      children: rebuildImportedSources(source.children ?? [], workspaceId, nextId),
    }
  })
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
