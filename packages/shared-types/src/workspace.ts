export type WorkspaceSourceNodeKind = 'group' | 'folder'

export type WorkspaceSummary = {
  id: string
  name: string
  description: string
  icon: string
  color: string
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
