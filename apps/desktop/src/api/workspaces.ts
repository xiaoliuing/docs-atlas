import { invoke } from '@tauri-apps/api/core'
import type {
  WorkspaceDetail,
  WorkspaceSourceNodeInput,
  WorkspaceSourceScanPayload,
  WorkspaceUpsertInput,
} from '@docs-atlas/shared-types/workspace'
import { browserDefaultWorkspaces, createDefaultWorkspaces } from '@/mocks/workspaces'

const STORAGE_KEY = 'docs-atlas.desktop.workspaces.v1'

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
    return seeded
  }

  try {
    const parsed = JSON.parse(rawValue) as WorkspaceDetail[]
    return cloneWorkspaces(parsed)
  } catch {
    const seeded = cloneWorkspaces(browserDefaultWorkspaces)
    writeBrowserWorkspaces(seeded)
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
