import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import { scanWorkspaceSources } from '@/api/workspaces'
import type { DocMeta, SearchRecord } from '@/types/docs'
import { buildWorkspaceDocsModel } from '@/utils/workspaceDocs'
import { docs as fallbackDocs, docsBySlug as fallbackDocsBySlug } from 'virtual:docs-data'
import { searchIndex as fallbackSearchIndex } from 'virtual:docs-ssr-data'

type UseDesktopSearchCatalogOptions = {
  workspaces: MaybeRefOrGetter<WorkspaceDetail[]>
}

const emptyDocsBySlug: Record<string, DocMeta> = {}
const emptySearchIndex: SearchRecord[] = []
const emptyWorkspaceIdBySearchSlug: Record<string, string> = {}
const emptyDocSlugBySearchSlug: Record<string, string> = {}

export function useDesktopSearchCatalog(options: UseDesktopSearchCatalogOptions) {
  const docsBySlugRef = shallowRef<Record<string, DocMeta>>(isTauriRuntime() ? emptyDocsBySlug : fallbackDocsBySlug)
  const searchIndexRef = shallowRef<SearchRecord[]>(isTauriRuntime() ? emptySearchIndex : fallbackSearchIndex)
  const workspaceIdBySearchSlugRef = shallowRef<Record<string, string>>(
    isTauriRuntime() ? emptyWorkspaceIdBySearchSlug : createFallbackWorkspaceIdBySearchSlug(toValue(options.workspaces)),
  )
  const docSlugBySearchSlugRef = shallowRef<Record<string, string>>(
    isTauriRuntime() ? emptyDocSlugBySearchSlug : createFallbackDocSlugBySearchSlug(),
  )
  const isLoading = shallowRef(false)
  const error = shallowRef('')
  let activeTaskId = 0

  watch(
    () => createWorkspaceFingerprint(toValue(options.workspaces)),
    async () => {
      const workspaces = toValue(options.workspaces)
      if (!isTauriRuntime()) {
        docsBySlugRef.value = fallbackDocsBySlug
        searchIndexRef.value = fallbackSearchIndex
        workspaceIdBySearchSlugRef.value = createFallbackWorkspaceIdBySearchSlug(workspaces)
        docSlugBySearchSlugRef.value = createFallbackDocSlugBySearchSlug()
        return
      }

      activeTaskId += 1
      const taskId = activeTaskId
      const searchableWorkspaces = workspaces.filter((workspace) => workspace.sources.length > 0)

      if (searchableWorkspaces.length === 0) {
        docsBySlugRef.value = emptyDocsBySlug
        searchIndexRef.value = emptySearchIndex
        workspaceIdBySearchSlugRef.value = emptyWorkspaceIdBySearchSlug
        docSlugBySearchSlugRef.value = emptyDocSlugBySearchSlug
        error.value = ''
        isLoading.value = false
        return
      }

      isLoading.value = true
      error.value = ''

      try {
        const workspaceModels = await Promise.all(
          searchableWorkspaces.map(async (workspace) => {
            const scanPayload = await scanWorkspaceSources(toSourceInputs(workspace.sources))
            return {
              workspace,
              model: buildWorkspaceDocsModel(workspace.sources, scanPayload),
            }
          }),
        )

        if (taskId !== activeTaskId) {
          return
        }

        const nextDocsBySlug: Record<string, DocMeta> = {}
        const nextSearchIndex: SearchRecord[] = []
        const nextWorkspaceIdBySearchSlug: Record<string, string> = {}
        const nextDocSlugBySearchSlug: Record<string, string> = {}

        for (const { workspace, model } of workspaceModels) {
          for (const [slug, docMeta] of Object.entries(model.docsBySlug)) {
            const searchSlug = createSearchSlug(workspace.id, slug)
            nextDocsBySlug[searchSlug] = {
              ...docMeta,
              id: searchSlug,
              slug: searchSlug,
            }
            nextWorkspaceIdBySearchSlug[searchSlug] = workspace.id
            nextDocSlugBySearchSlug[searchSlug] = slug
          }

          nextSearchIndex.push(
            ...model.searchIndex.map((record) => ({
              ...record,
              section: `${workspace.name} / ${record.section}`,
              slug: createSearchSlug(workspace.id, record.slug),
            })),
          )
        }

        docsBySlugRef.value = nextDocsBySlug
        searchIndexRef.value = nextSearchIndex
        workspaceIdBySearchSlugRef.value = nextWorkspaceIdBySearchSlug
        docSlugBySearchSlugRef.value = nextDocSlugBySearchSlug
      } catch (loadError) {
        if (taskId !== activeTaskId) {
          return
        }

        docsBySlugRef.value = emptyDocsBySlug
        searchIndexRef.value = emptySearchIndex
        workspaceIdBySearchSlugRef.value = emptyWorkspaceIdBySearchSlug
        docSlugBySearchSlugRef.value = emptyDocSlugBySearchSlug
        error.value = loadError instanceof Error ? loadError.message : '加载全局搜索索引失败'
      } finally {
        if (taskId === activeTaskId) {
          isLoading.value = false
        }
      }
    },
    { immediate: true },
  )

  return {
    docSlugBySearchSlug: computed(() => docSlugBySearchSlugRef.value),
    docsBySlug: computed(() => docsBySlugRef.value),
    error: computed(() => error.value),
    isLoading: computed(() => isLoading.value),
    searchIndex: computed(() => searchIndexRef.value),
    workspaceIdBySearchSlug: computed(() => workspaceIdBySearchSlugRef.value),
  }
}

function createWorkspaceFingerprint(workspaces: WorkspaceDetail[]): string {
  return JSON.stringify(
    workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      sources: workspace.sources,
    })),
  )
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

function createSearchSlug(workspaceId: string, slug: string) {
  return `${workspaceId}::${slug}`
}

function createFallbackWorkspaceIdBySearchSlug(workspaces: WorkspaceDetail[]) {
  const defaultWorkspaceId = workspaces[0]?.id ?? 'workspace:default'
  return Object.fromEntries(fallbackDocs.map((doc) => [doc.slug, defaultWorkspaceId]))
}

function createFallbackDocSlugBySearchSlug() {
  return Object.fromEntries(fallbackDocs.map((doc) => [doc.slug, doc.slug]))
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
