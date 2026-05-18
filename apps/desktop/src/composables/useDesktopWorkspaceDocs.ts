import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { WorkspaceDetail, WorkspaceSourceStatus } from '@docs-atlas/shared-types/workspace'
import { listenWorkspaceSourceWatch, scanWorkspaceSources, unwatchWorkspaceSources, watchWorkspaceSources } from '@/api/workspaces'
import type { DocDetail, DocMeta, DocsSourceGroup, SearchRecord } from '@/types/docs'
import { buildWorkspaceDocsModel } from '@/utils/workspaceDocs'
import { docs, docsBySlug, sourceGroups } from 'virtual:docs-data'
import { docDetailsBySlug, searchIndex } from 'virtual:docs-ssr-data'

type UseDesktopWorkspaceDocsOptions = {
  workspace: MaybeRefOrGetter<WorkspaceDetail | null>
}

const emptyDocs: DocMeta[] = []
const emptySourceGroups: DocsSourceGroup[] = []
const emptySearchIndex: SearchRecord[] = []
const emptyDocsBySlug: Record<string, DocMeta> = {}
const emptyDocDetailsBySlug: Record<string, DocDetail> = {}
const emptySourceStatuses: WorkspaceSourceStatus[] = []

export function useDesktopWorkspaceDocs(options: UseDesktopWorkspaceDocsOptions) {
  const docsRef = shallowRef<DocMeta[]>(isTauriRuntime() ? emptyDocs : docs)
  const docsBySlugRef = shallowRef<Record<string, DocMeta>>(isTauriRuntime() ? emptyDocsBySlug : docsBySlug)
  const docDetailsBySlugRef = shallowRef<Record<string, DocDetail>>(
    isTauriRuntime() ? emptyDocDetailsBySlug : docDetailsBySlug,
  )
  const searchIndexRef = shallowRef<SearchRecord[]>(isTauriRuntime() ? emptySearchIndex : searchIndex)
  const sourceGroupsRef = shallowRef<DocsSourceGroup[]>(isTauriRuntime() ? emptySourceGroups : sourceGroups)
  const sourceStatusesRef = shallowRef<WorkspaceSourceStatus[]>(emptySourceStatuses)
  const isLoading = shallowRef(false)
  const error = shallowRef('')
  const refreshVersion = shallowRef(0)
  let activeTaskId = 0

  watch(
    () => [createWorkspaceFingerprint(toValue(options.workspace)), refreshVersion.value] as const,
    async (_, __, onCleanup) => {
      const workspace = toValue(options.workspace)
      if (!isTauriRuntime()) {
        return
      }

      activeTaskId += 1
      const taskId = activeTaskId
      let unlistenWatch: (() => void) | null = null

      onCleanup(() => {
        if (unlistenWatch) {
          unlistenWatch()
        }
        void unwatchWorkspaceSources()
      })

      if (!workspace || workspace.sources.length === 0) {
        docsRef.value = emptyDocs
        docsBySlugRef.value = emptyDocsBySlug
        docDetailsBySlugRef.value = emptyDocDetailsBySlug
        searchIndexRef.value = emptySearchIndex
        sourceGroupsRef.value = emptySourceGroups
        sourceStatusesRef.value = emptySourceStatuses
        error.value = ''
        isLoading.value = false
        return
      }

      isLoading.value = true
      error.value = ''

      try {
        unlistenWatch = await listenWorkspaceSourceWatch((payload) => {
          if (payload.workspaceId !== workspace.id) {
            return
          }

          refreshVersion.value += 1
        })

        await watchWorkspaceSources(workspace.id, toSourceInputs(workspace.sources))
        const scanPayload = await scanWorkspaceSources(toSourceInputs(workspace.sources))
        if (taskId !== activeTaskId) {
          return
        }

        const model = buildWorkspaceDocsModel(workspace.sources, scanPayload)
        docsRef.value = model.docs
        docsBySlugRef.value = model.docsBySlug
        docDetailsBySlugRef.value = model.docDetailsBySlug
        searchIndexRef.value = model.searchIndex
        sourceGroupsRef.value = model.sourceGroups
        sourceStatusesRef.value = scanPayload.sourceStatuses
      } catch (loadError) {
        if (taskId !== activeTaskId) {
          return
        }

        docsRef.value = emptyDocs
        docsBySlugRef.value = emptyDocsBySlug
        docDetailsBySlugRef.value = emptyDocDetailsBySlug
        searchIndexRef.value = emptySearchIndex
        sourceGroupsRef.value = emptySourceGroups
        sourceStatusesRef.value = emptySourceStatuses
        error.value = loadError instanceof Error ? loadError.message : '加载工作区文档失败'
      } finally {
        if (taskId === activeTaskId) {
          isLoading.value = false
        }
      }
    },
    { immediate: true },
  )

  return {
    docDetailsBySlug: computed(() => docDetailsBySlugRef.value),
    docs: computed(() => docsRef.value),
    docsBySlug: computed(() => docsBySlugRef.value),
    error: computed(() => error.value),
    healthySourceCount: computed(() => sourceStatusesRef.value.filter((item) => item.state === 'ready').length),
    isLoading: computed(() => isLoading.value),
    sourceStatuses: computed(() => sourceStatusesRef.value),
    sourceStatusesByNodeId: computed(() =>
      Object.fromEntries(sourceStatusesRef.value.map((status) => [status.sourceNodeId, status])),
    ),
    searchIndex: computed(() => searchIndexRef.value),
    sourceGroups: computed(() => sourceGroupsRef.value),
    unhealthySourceCount: computed(() => sourceStatusesRef.value.filter((item) => item.state !== 'ready').length),
  }
}

function createWorkspaceFingerprint(workspace: WorkspaceDetail | null): string {
  if (!workspace) {
    return ''
  }

  return JSON.stringify({
    id: workspace.id,
    sources: toSourceInputs(workspace.sources),
  })
}

function toSourceInputs(nodes: WorkspaceDetail['sources']) {
  return nodes.map((node) => ({
    children: toSourceInputs(node.children),
    enabled: node.enabled,
    id: node.id,
    kind: node.kind,
    name: node.name,
    parentId: node.parentId,
    path: node.path,
    position: node.position,
  }))
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
