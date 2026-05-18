import { computed, shallowRef } from 'vue'
import type { DocsSourceGroup } from '@/types/docs'
import { mockWorkspaces } from '@/mocks/workspaces'

const workspaces = mockWorkspaces
const currentWorkspaceId = shallowRef(workspaces[0]?.id ?? '')

export function useWorkspaceSelection(sourceGroups: DocsSourceGroup[]) {
  const currentWorkspace = computed(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId.value) ?? null,
  )
  const currentWorkspaceSourceIds = computed(() => {
    const workspace = currentWorkspace.value
    if (!workspace) {
      return []
    }

    const availableSources = sourceGroups.flatMap(flattenSourceGroup).filter(
      (group): group is DocsSourceGroup & { sourceId: string; sourceLabel: string } =>
        group.isSource && typeof group.sourceId === 'string' && typeof group.sourceLabel === 'string',
    )

    if (workspace.sourceLabels === '*') {
      return availableSources.map((group) => group.sourceId)
    }

    return availableSources
      .filter((group) => workspace.sourceLabels.includes(group.sourceLabel))
      .map((group) => group.sourceId)
  })

  function selectWorkspace(workspaceId: string) {
    currentWorkspaceId.value = workspaceId
  }

  return {
    currentWorkspace,
    currentWorkspaceId,
    currentWorkspaceSourceIds,
    selectWorkspace,
    workspaces,
  }
}

function flattenSourceGroup(group: DocsSourceGroup): DocsSourceGroup[] {
  return [group, ...group.children.flatMap(flattenSourceGroup)]
}
