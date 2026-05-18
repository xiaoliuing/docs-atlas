export type WorkspaceSourceNodeKind = 'group' | 'folder'
export type WorkspaceSearchScope = 'global' | 'workspace'

export type WorkspaceSummary = {
  id: string
  name: string
  description: string
  icon: string
  color: string
  defaultSearchScope: WorkspaceSearchScope
  sortOrder: number
  createdAt: string
  updatedAt: string
  lastOpenedAt: string | null
}

export type WorkspaceSourceNode = {
  id: string
  workspaceId: string
  parentId: string | null
  kind: WorkspaceSourceNodeKind
  name: string
  path: string
  enabled: boolean
  position: number
  children: WorkspaceSourceNode[]
}

export type WorkspaceDetail = WorkspaceSummary & {
  sources: WorkspaceSourceNode[]
}

export type WorkspaceRecord = WorkspaceSummary

export type WorkspaceSourceNodeRecord = Omit<WorkspaceSourceNode, 'children'>

export type WorkspaceUpsertInput = {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  defaultSearchScope?: WorkspaceSearchScope
  sortOrder?: number
  lastOpenedAt?: string | null
}

export type WorkspaceSourceNodeInput = {
  id: string
  parentId?: string | null
  kind: WorkspaceSourceNodeKind
  name: string
  path?: string
  enabled?: boolean
  position?: number
  children?: WorkspaceSourceNodeInput[]
}

export type WorkspaceSourceDocumentSnapshot = {
  sourceNodeId: string
  sourceRoot: string
  absolutePath: string
  relativePath: string
  markdown: string
}

export type WorkspaceSourceScanPayload = {
  documents: WorkspaceSourceDocumentSnapshot[]
}
