import { computed, shallowRef } from 'vue'
import type { WorkspaceDetail, WorkspaceSearchScope, WorkspaceSourceNodeInput, WorkspaceUpsertInput } from '@docs-atlas/shared-types/workspace'
import { listWorkspaceDetails, markWorkspaceOpened, upsertWorkspace, type WorkspaceSaveInput } from '@/api/workspaces'
import { mockWorkspaces } from '@/mocks/workspaces'

const workspaces = shallowRef<WorkspaceDetail[]>([])
const currentWorkspaceId = shallowRef('')
const isLoadingWorkspaces = shallowRef(false)
const isSavingWorkspace = shallowRef(false)
const isSavingWorkspaceSources = shallowRef(false)
const isReorderingWorkspaces = shallowRef(false)
let loadTask: Promise<void> | null = null

export function useWorkspaceSelection() {
  const currentWorkspace = computed(
    () => workspaces.value.find((workspace) => workspace.id === currentWorkspaceId.value) ?? null,
  )
  const currentWorkspaceSourceIds = computed(() => {
    const workspace = currentWorkspace.value
    if (!workspace) {
      return []
    }

    return collectEnabledSourceIds(workspace.sources)
  })

  async function ensureLoaded() {
    if (loadTask) {
      return loadTask
    }

    loadTask = loadWorkspaces().finally(() => {
      loadTask = null
    })
    return loadTask
  }

  async function selectWorkspace(workspaceId: string) {
    currentWorkspaceId.value = workspaceId
    const updated = await markWorkspaceOpened(workspaceId)
    if (!updated) {
      return
    }

    mergeWorkspace(updated)
  }

  async function createWorkspace(input: Omit<WorkspaceUpsertInput, 'id'>) {
    isSavingWorkspace.value = true

    try {
      const workspace = await upsertWorkspace({
        id: `workspace:${crypto.randomUUID()}`,
        ...input,
        defaultSearchScope: input.defaultSearchScope ?? 'global',
        sortOrder: workspaces.value.length,
        sources: [],
      })
      mergeWorkspace(workspace)
      currentWorkspaceId.value = workspace.id
      return workspace
    } finally {
      isSavingWorkspace.value = false
    }
  }

  async function saveWorkspaceSources(workspaceId: string, sources: WorkspaceSourceNodeInput[]) {
    const workspace = workspaces.value.find((item) => item.id === workspaceId)
    if (!workspace) {
      return null
    }

    isSavingWorkspaceSources.value = true

    try {
      const updated = await upsertWorkspace({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        icon: workspace.icon,
        color: workspace.color,
        defaultSearchScope: workspace.defaultSearchScope,
        sortOrder: workspace.sortOrder,
        lastOpenedAt: workspace.lastOpenedAt,
        sources,
      })
      mergeWorkspace(updated)
      return updated
    } finally {
      isSavingWorkspaceSources.value = false
    }
  }

  async function updateWorkspaceMeta(
    workspaceId: string,
    input: {
      name: string
      description: string
      color: string
      defaultSearchScope: WorkspaceSearchScope
    },
  ) {
    const workspace = workspaces.value.find((item) => item.id === workspaceId)
    if (!workspace) {
      return null
    }

    isSavingWorkspace.value = true

    try {
      const updated = await upsertWorkspace({
        id: workspace.id,
        name: input.name,
        description: input.description,
        icon: workspace.icon,
        color: input.color,
        defaultSearchScope: input.defaultSearchScope,
        sortOrder: workspace.sortOrder,
        lastOpenedAt: workspace.lastOpenedAt,
        sources: toSourceInputs(workspace.sources),
      })
      mergeWorkspace(updated)
      return updated
    } finally {
      isSavingWorkspace.value = false
    }
  }

  async function moveWorkspace(workspaceId: string, direction: -1 | 1) {
    const ordered = [...workspaces.value].sort((left, right) => left.sortOrder - right.sortOrder)
    const index = ordered.findIndex((workspace) => workspace.id === workspaceId)
    const targetIndex = index + direction

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return false
    }

    const current = ordered[index]
    const target = ordered[targetIndex]

    isReorderingWorkspaces.value = true

    try {
      await upsertWorkspace({
        id: current.id,
        name: current.name,
        description: current.description,
        icon: current.icon,
        color: current.color,
        defaultSearchScope: current.defaultSearchScope,
        sortOrder: target.sortOrder,
        lastOpenedAt: current.lastOpenedAt,
        sources: toSourceInputs(current.sources),
      })

      await upsertWorkspace({
        id: target.id,
        name: target.name,
        description: target.description,
        icon: target.icon,
        color: target.color,
        defaultSearchScope: target.defaultSearchScope,
        sortOrder: current.sortOrder,
        lastOpenedAt: target.lastOpenedAt,
        sources: toSourceInputs(target.sources),
      })

      const records = await listWorkspaceDetails()
      workspaces.value = normalizeWorkspaces(records)
      return true
    } finally {
      isReorderingWorkspaces.value = false
    }
  }

  return {
    createWorkspace,
    currentWorkspace,
    currentWorkspaceId,
    currentWorkspaceSourceIds,
    ensureLoaded,
    isLoadingWorkspaces,
    isReorderingWorkspaces,
    isSavingWorkspace,
    isSavingWorkspaceSources,
    moveWorkspace,
    saveWorkspaceSources,
    selectWorkspace,
    updateWorkspaceMeta,
    workspaces,
  }
}

async function loadWorkspaces() {
  isLoadingWorkspaces.value = true

  try {
    let records = await listWorkspaceDetails()
    if (records.length === 0) {
      for (const workspace of mockWorkspaces) {
        await upsertWorkspace(toWorkspaceSaveInput(workspace))
      }
      records = await listWorkspaceDetails()
    }

    workspaces.value = normalizeWorkspaces(records)
    currentWorkspaceId.value = currentWorkspaceId.value || records[0]?.id || ''
  } finally {
    isLoadingWorkspaces.value = false
  }
}

function mergeWorkspace(workspace: WorkspaceDetail) {
  const existingIndex = workspaces.value.findIndex((item) => item.id === workspace.id)

  if (existingIndex < 0) {
    workspaces.value = normalizeWorkspaces([...workspaces.value, workspace])
    return
  }

  const next = [...workspaces.value]
  next.splice(existingIndex, 1, workspace)
  workspaces.value = normalizeWorkspaces(next)
}

function collectEnabledSourceIds(nodes: WorkspaceDetail['sources']): string[] {
  return nodes.flatMap((node) => {
    if (!node.enabled) {
      return []
    }

    if (node.kind === 'folder') {
      return [node.id, ...collectEnabledSourceIds(node.children)]
    }

    return collectEnabledSourceIds(node.children)
  })
}

function toWorkspaceSaveInput(workspace: WorkspaceDetail): WorkspaceSaveInput {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    icon: workspace.icon,
    color: workspace.color,
    defaultSearchScope: workspace.defaultSearchScope,
    sortOrder: workspace.sortOrder,
    lastOpenedAt: workspace.lastOpenedAt,
    sources: workspace.sources.map((source) => ({
      id: source.id,
      parentId: source.parentId,
      kind: source.kind,
      name: source.name,
      path: source.path,
      enabled: source.enabled,
      position: source.position,
      children: toSourceInputs(source.children),
    })),
  }
}

function toSourceInputs(nodes: WorkspaceDetail['sources']) {
  return nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    kind: node.kind,
    name: node.name,
    path: node.path,
    enabled: node.enabled,
    position: node.position,
    children: toSourceInputs(node.children),
  }))
}

function normalizeWorkspaces(workspaces: WorkspaceDetail[]) {
  return [...workspaces]
    .map((workspace, index) => ({
      ...workspace,
      defaultSearchScope: workspace.defaultSearchScope ?? 'global',
      sortOrder: workspace.sortOrder ?? index,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
}
