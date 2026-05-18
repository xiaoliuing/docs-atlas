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

export type DraftNodeDropPlacement = 'before' | 'after' | 'inside'

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

export function moveDraftNode(
  nodes: WorkspaceSourceNodeDraft[],
  targetId: string,
  direction: -1 | 1,
): WorkspaceSourceNodeDraft[] {
  const targetIndex = nodes.findIndex((node) => node.id === targetId)

  if (targetIndex >= 0) {
    const nextIndex = targetIndex + direction
    if (nextIndex < 0 || nextIndex >= nodes.length) {
      return nodes
    }

    const nextNodes = [...nodes]
    const [targetNode] = nextNodes.splice(targetIndex, 1)
    nextNodes.splice(nextIndex, 0, targetNode)
    normalizeDraftPositions(nextNodes)
    return nextNodes
  }

  let changed = false
  const nextNodes = nodes.map((node) => {
    const nextChildren = moveDraftNode(node.children, targetId, direction)
    if (nextChildren !== node.children) {
      changed = true
      return {
        ...node,
        children: nextChildren,
      }
    }

    return node
  })

  if (changed) {
    normalizeDraftPositions(nextNodes)
    return nextNodes
  }

  return nodes
}

export function moveDraftNodeByDrop(
  nodes: WorkspaceSourceNodeDraft[],
  draggedNodeId: string,
  targetNodeId: string,
  placement: DraftNodeDropPlacement,
): WorkspaceSourceNodeDraft[] {
  if (!draggedNodeId || !targetNodeId || draggedNodeId === targetNodeId) {
    return nodes
  }

  const draggedNode = findDraftNode(nodes, draggedNodeId)
  if (!draggedNode || containsNodeId(draggedNode.children, targetNodeId)) {
    return nodes
  }

  const [withoutDraggedNode, extractedNode] = extractDraftNode(nodes, draggedNodeId)
  if (!extractedNode) {
    return nodes
  }

  const nextNodes = insertDraftNode(withoutDraggedNode, extractedNode, targetNodeId, placement)
  if (nextNodes === withoutDraggedNode) {
    return nodes
  }

  normalizeDraftPositions(nextNodes)
  return nextNodes
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
        message: '请选择包含 Markdown 文档的目录',
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
        message: '目录路径重复，请保留一个目录源或调整路径',
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

function containsNodeId(nodes: WorkspaceSourceNodeDraft[], targetId: string): boolean {
  return nodes.some((node) => node.id === targetId || containsNodeId(node.children, targetId))
}

function extractDraftNode(
  nodes: WorkspaceSourceNodeDraft[],
  targetId: string,
): [WorkspaceSourceNodeDraft[], WorkspaceSourceNodeDraft | null] {
  const targetIndex = nodes.findIndex((node) => node.id === targetId)
  if (targetIndex >= 0) {
    const nextNodes = [...nodes]
    const [targetNode] = nextNodes.splice(targetIndex, 1)
    return [nextNodes, targetNode]
  }

  let extractedNode: WorkspaceSourceNodeDraft | null = null
  const nextNodes = nodes.map((node) => {
    if (extractedNode) {
      return node
    }

    const [nextChildren, nestedExtractedNode] = extractDraftNode(node.children, targetId)
    if (!nestedExtractedNode) {
      return node
    }

    extractedNode = nestedExtractedNode
    return {
      ...node,
      children: nextChildren,
    }
  })

  return [extractedNode ? nextNodes : nodes, extractedNode]
}

function insertDraftNode(
  nodes: WorkspaceSourceNodeDraft[],
  draftNode: WorkspaceSourceNodeDraft,
  targetNodeId: string,
  placement: DraftNodeDropPlacement,
): WorkspaceSourceNodeDraft[] {
  const targetIndex = nodes.findIndex((node) => node.id === targetNodeId)
  if (targetIndex >= 0) {
    const nextNodes = [...nodes]

    if (placement === 'inside') {
      const targetNode = nextNodes[targetIndex]
      nextNodes.splice(targetIndex, 1, {
        ...targetNode,
        children: [...targetNode.children, cloneWorkspaceSources([draftNode])[0]!].map((child) => ({
          ...child,
          parentId: targetNode.id,
        })),
      })
      return nextNodes
    }

    const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1
    nextNodes.splice(insertIndex, 0, {
      ...draftNode,
      parentId: nextNodes[targetIndex]?.parentId ?? null,
    })
    return nextNodes
  }

  let changed = false
  const nextNodes = nodes.map((node) => {
    const nextChildren = insertDraftNode(node.children, draftNode, targetNodeId, placement)
    if (nextChildren !== node.children) {
      changed = true
      return {
        ...node,
        children: nextChildren.map((child) => ({
          ...child,
          parentId: node.id,
        })),
      }
    }

    return node
  })

  return changed ? nextNodes : nodes
}
