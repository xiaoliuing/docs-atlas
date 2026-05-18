import { computed, shallowRef } from 'vue'
import type { WorkspaceDetail, WorkspaceSourceNodeInput, WorkspaceUpsertInput } from '@docs-atlas/shared-types/workspace'
import type { DocsSourceGroup } from '@/types/docs'
import { listWorkspaceDetails, markWorkspaceOpened, upsertWorkspace, type WorkspaceSaveInput } from '@/api/workspaces'
import { mockWorkspaces } from '@/mocks/workspaces'

const workspaces = shallowRef<WorkspaceDetail[]>([])
const currentWorkspaceId = shallowRef('')
const isLoadingWorkspaces = shallowRef(false)
const isSavingWorkspace = shallowRef(false)
const isSavingWorkspaceSources = shallowRef(false)
let loadTask: Promise<void> | null = null

export function useWorkspaceSelection(sourceGroups: DocsSourceGroup[]) {
  const currentWorkspace = computed(
    () => workspaces.value.find((workspace) => workspace.id === currentWorkspaceId.value) ?? null,
  )
  const currentWorkspaceSourceIds = computed(() => {
    const workspace = currentWorkspace.value
    if (!workspace) {
      return []
    }

    const hints = collectWorkspaceSourceHints(workspace.sources)
    if (hints.length === 0) {
      return []
    }

    const availableSources = sourceGroups.flatMap(flattenSourceGroup).filter(
      (group): group is DocsSourceGroup & { sourceId: string; sourceLabel: string } =>
        group.isSource && typeof group.sourceId === 'string' && typeof group.sourceLabel === 'string',
    )

    return availableSources
      .filter((group) => hints.some((hint) => group.name === hint || group.sourceLabel.endsWith(hint)))
      .map((group) => group.sourceId)
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
        lastOpenedAt: workspace.lastOpenedAt,
        sources,
      })
      mergeWorkspace(updated)
      return updated
    } finally {
      isSavingWorkspaceSources.value = false
    }
  }

  return {
    createWorkspace,
    currentWorkspace,
    currentWorkspaceId,
    currentWorkspaceSourceIds,
    ensureLoaded,
    isLoadingWorkspaces,
    isSavingWorkspace,
    isSavingWorkspaceSources,
    saveWorkspaceSources,
    selectWorkspace,
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

    workspaces.value = records
    currentWorkspaceId.value = currentWorkspaceId.value || records[0]?.id || ''
  } finally {
    isLoadingWorkspaces.value = false
  }
}

function mergeWorkspace(workspace: WorkspaceDetail) {
  workspaces.value = [workspace, ...workspaces.value.filter((item) => item.id !== workspace.id)]
}

function collectWorkspaceSourceHints(nodes: WorkspaceDetail['sources']): string[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'folder' && node.enabled) {
      return [node.name]
    }

    return collectWorkspaceSourceHints(node.children)
  })
}

function flattenSourceGroup(group: DocsSourceGroup): DocsSourceGroup[] {
  return [group, ...group.children.flatMap(flattenSourceGroup)]
}

function toWorkspaceSaveInput(workspace: WorkspaceDetail): WorkspaceSaveInput {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    icon: workspace.icon,
    color: workspace.color,
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
