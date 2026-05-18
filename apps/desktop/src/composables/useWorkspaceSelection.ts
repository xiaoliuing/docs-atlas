import { computed, shallowRef } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import { mockWorkspaces } from '@/mocks/workspaces'

const workspaces = mockWorkspaces
const currentWorkspaceId = shallowRef(workspaces[0]?.id ?? '')

export function useWorkspaceSelection() {
  const currentWorkspace = computed<WorkspaceDetail | null>(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId.value) ?? null,
  )

  function selectWorkspace(workspaceId: string) {
    currentWorkspaceId.value = workspaceId
  }

  return {
    currentWorkspace,
    currentWorkspaceId,
    selectWorkspace,
    workspaces,
  }
}
