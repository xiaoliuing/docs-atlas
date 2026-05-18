import type { WorkspaceDetail, WorkspaceSourceNode, WorkspaceSourceNodeInput } from '@docs-atlas/shared-types/workspace'

export type WorkspaceSourceNodeDraft = {
  id: string
  parentId: string | null
  kind: 'group' | 'folder'
  name: string
  path: string
  enabled: boolean
  position: number
  children: WorkspaceSourceNodeDraft[]
}

export type SourceTreeValidationIssue = {
  nodeId: string
  message: string
  severity: 'error' | 'warning'
}

export function cloneWorkspaceSources(nodes: WorkspaceDetail['sources'] | WorkspaceSourceNodeDraft[]): WorkspaceSourceNodeDraft[] {
  return nodes.map((node, index) => ({
    id: node.id,
    parentId: 'parentId' in node ? node.parentId ?? null : null,
    kind: node.kind,
    name: node.name,
    path: node.path,
    enabled: node.enabled,
    position: node.position ?? index,
    children: cloneWorkspaceSources(node.children),
  }))
}

export function createGroupDraft(parentId: string | null, index: number): WorkspaceSourceNodeDraft {
  return {
    id: `source-node:${crypto.randomUUID()}`,
    parentId,
    kind: 'group',
    name: '新分组',
    path: '',
    enabled: true,
    position: index,
    children: [],
  }
}

export function createFolderDraft(
  parentId: string | null,
  index: number,
  path = '',
  name = '新文档源',
): WorkspaceSourceNodeDraft {
  return {
    id: `source-node:${crypto.randomUUID()}`,
    parentId,
    kind: 'folder',
    name,
    path,
    enabled: true,
    position: index,
    children: [],
  }
}

export function normalizeDraftPositions(nodes: WorkspaceSourceNodeDraft[]) {
  nodes.forEach((node, index) => {
    node.position = index
    node.parentId = node.parentId ?? null
    normalizeDraftPositions(node.children)
  })
}

export function serializeWorkspaceSources(nodes: WorkspaceSourceNodeDraft[]): WorkspaceSourceNodeInput[] {
  return nodes.map((node, index) => ({
    id: node.id,
    parentId: node.parentId ?? undefined,
    kind: node.kind,
    name: node.name.trim(),
    path: node.kind === 'folder' ? node.path.trim() : '',
    enabled: node.enabled,
    position: node.position ?? index,
    children: serializeWorkspaceSources(node.children),
  }))
}

export function removeDraftNode(nodes: WorkspaceSourceNodeDraft[], targetId: string): WorkspaceSourceNodeDraft[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      children: removeDraftNode(node.children, targetId),
    }))
}

export function insertDraftChild(
  nodes: WorkspaceSourceNodeDraft[],
  parentId: string | null,
  createNode: (index: number) => WorkspaceSourceNodeDraft,
): WorkspaceSourceNodeDraft[] {
  if (!parentId) {
    return [...nodes, createNode(nodes.length)]
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, createNode(node.children.length)].map((child) => ({
          ...child,
          parentId: node.id,
        })),
      }
    }

    return {
      ...node,
      children: insertDraftChild(node.children, parentId, createNode),
    }
  })
}

export function collectSourceTreeIssues(
  nodes: WorkspaceSourceNodeDraft[],
  pathStatuses: Record<string, { exists: boolean; isDirectory: boolean } | undefined>,
): SourceTreeValidationIssue[] {
  const issues: SourceTreeValidationIssue[] = []
  const folderNodes = flattenDraftNodes(nodes).filter((node) => node.kind === 'folder')
  const duplicateMap = new Map<string, string[]>()

  folderNodes.forEach((node) => {
    const normalizedPath = node.path.trim()
    const normalizedName = node.name.trim()

    if (!normalizedName) {
      issues.push({
        nodeId: node.id,
        message: '名称不能为空',
        severity: 'error',
      })
    }

    if (!normalizedPath) {
      issues.push({
        nodeId: node.id,
        message: '请选择文档目录',
        severity: 'error',
      })
    } else {
      duplicateMap.set(normalizedPath, [...(duplicateMap.get(normalizedPath) ?? []), node.id])
    }

    const status = pathStatuses[node.id]
    if (status && !status.exists) {
      issues.push({
        nodeId: node.id,
        message: '目录不存在',
        severity: 'error',
      })
    } else if (status && !status.isDirectory) {
      issues.push({
        nodeId: node.id,
        message: '路径不是目录',
        severity: 'error',
      })
    }
  })

  flattenDraftNodes(nodes)
    .filter((node) => node.kind === 'group')
    .forEach((node) => {
      if (!node.name.trim()) {
        issues.push({
          nodeId: node.id,
          message: '分组名称不能为空',
          severity: 'error',
        })
      }
    })

  duplicateMap.forEach((nodeIds) => {
    if (nodeIds.length < 2) {
      return
    }

    nodeIds.forEach((nodeId) => {
      issues.push({
        nodeId,
        message: '目录路径重复',
        severity: 'error',
      })
    })
  })

  return issues
}

export function flattenDraftNodes(nodes: WorkspaceSourceNodeDraft[]): WorkspaceSourceNodeDraft[] {
  return nodes.flatMap((node) => [node, ...flattenDraftNodes(node.children)])
}

export function findDraftNode(nodes: WorkspaceSourceNodeDraft[], targetId: string): WorkspaceSourceNodeDraft | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node
    }

    const nested = findDraftNode(node.children, targetId)
    if (nested) {
      return nested
    }
  }

  return null
}

export function countDraftSources(nodes: WorkspaceSourceNodeDraft[]) {
  return flattenDraftNodes(nodes).filter((node) => node.kind === 'folder').length
}

export function countDraftGroups(nodes: WorkspaceSourceNodeDraft[]) {
  return flattenDraftNodes(nodes).filter((node) => node.kind === 'group').length
}

export function inferFolderDisplayName(pathValue: string) {
  const trimmed = pathValue.replace(/[\\/]+$/, '')
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1] || '新文档源'
}

export function syncDraftParentIds(nodes: WorkspaceSourceNodeDraft[], parentId: string | null = null) {
  nodes.forEach((node, index) => {
    node.parentId = parentId
    node.position = index
    syncDraftParentIds(node.children, node.id)
  })
}

export function cloneSourceNodes(nodes: WorkspaceSourceNode[]): WorkspaceSourceNodeDraft[] {
  return cloneWorkspaceSources(nodes)
}
