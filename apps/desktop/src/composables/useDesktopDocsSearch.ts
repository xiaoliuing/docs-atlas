import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import type { DocMeta, SearchRecord, SearchResult } from '@/types/docs'
import { getSearchMatchMeta, normalizeSearchTerm } from '@/utils/search'

const RESULT_LIMIT = 18

export type DesktopSearchScope = 'global' | 'workspace'
export type DesktopSearchFilterOption = {
  id: string
  label: string
  count: number
  helper?: string
}

type UseDesktopDocsSearchOptions = {
  currentWorkspaceId?: MaybeRefOrGetter<string>
  docsBySlug?: MaybeRefOrGetter<Record<string, DocMeta>>
  searchIndex?: MaybeRefOrGetter<SearchRecord[]>
  workspaceIdBySearchSlug?: MaybeRefOrGetter<Record<string, string>>
  workspaces?: MaybeRefOrGetter<WorkspaceDetail[]>
  workspaceSourceIds?: MaybeRefOrGetter<string[]>
}

export function useDesktopDocsSearch(options: UseDesktopDocsSearchOptions = {}) {
  const query = shallowRef('')
  const isOpen = shallowRef(false)
  const scope = shallowRef<DesktopSearchScope>('global')
  const sourceFilter = shallowRef('all')
  const workspaceFilter = shallowRef('all')
  const selectedIndex = shallowRef(0)

  const normalizedQuery = computed(() => normalizeSearchTerm(query.value))
  const currentWorkspaceId = computed(() => toValue(options.currentWorkspaceId) ?? '')
  const docsBySlug = computed(() => toValue(options.docsBySlug) ?? {})
  const searchIndex = computed(() => toValue(options.searchIndex) ?? [])
  const workspaceIdBySearchSlug = computed(() => toValue(options.workspaceIdBySearchSlug) ?? {})
  const workspaces = computed(() => toValue(options.workspaces) ?? [])
  const workspaceSourceIds = computed(() => new Set(toValue(options.workspaceSourceIds) ?? []))
  const isWorkspaceScope = computed(() => scope.value === 'workspace')
  const workspaceById = computed(() => new Map(workspaces.value.map((workspace) => [workspace.id, workspace])))
  const searchEntries = computed(() =>
    searchIndex.value
      .map((record) => {
        const docMeta = docsBySlug.value[record.slug]
        if (!docMeta) {
          return null
        }

        const workspaceId = workspaceIdBySearchSlug.value[record.slug] ?? currentWorkspaceId.value
        const workspaceName = workspaceById.value.get(workspaceId)?.name ?? ''
        const sourceKey = workspaceId && docMeta.sourceId ? `${workspaceId}::${docMeta.sourceId}` : docMeta.sourceId

        return {
          docMeta,
          record,
          sourceKey,
          workspaceId,
          workspaceName,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  )
  const effectiveWorkspaceFilterId = computed(() => {
    if (isWorkspaceScope.value) {
      return currentWorkspaceId.value
    }

    return workspaceFilter.value === 'all' ? '' : workspaceFilter.value
  })
  const filteredEntriesByScope = computed(() =>
    searchEntries.value.filter((entry) => {
      if (isWorkspaceScope.value) {
        return entry.workspaceId === currentWorkspaceId.value
      }

      if (!effectiveWorkspaceFilterId.value) {
        return true
      }

      return entry.workspaceId === effectiveWorkspaceFilterId.value
    }),
  )
  const workspaceOptions = computed<DesktopSearchFilterOption[]>(() => {
    const counts = new Map<string, number>()

    for (const entry of searchEntries.value) {
      if (!entry.workspaceId || !entry.workspaceName) {
        continue
      }

      counts.set(entry.workspaceId, (counts.get(entry.workspaceId) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        label: workspaceById.value.get(id)?.name ?? '未命名文档仓库',
        count,
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'zh-Hans-CN'))
  })
  const sourceOptions = computed<DesktopSearchFilterOption[]>(() => {
    const counts = new Map<string, { count: number; label: string; helper?: string }>()

    for (const entry of filteredEntriesByScope.value) {
      if (!entry.sourceKey || !entry.docMeta.sourceLabel) {
        continue
      }

      const stored = counts.get(entry.sourceKey)
      if (stored) {
        stored.count += 1
        continue
      }

      counts.set(entry.sourceKey, {
        count: 1,
        helper: !isWorkspaceScope.value && !effectiveWorkspaceFilterId.value ? entry.workspaceName : undefined,
        label: entry.docMeta.sourceLabel,
      })
    }

    return Array.from(counts.entries())
      .map(([id, value]) => ({
        id,
        label: value.label,
        count: value.count,
        helper: value.helper,
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'zh-Hans-CN'))
  })
  const activeWorkspaceFilterLabel = computed(() => {
    if (isWorkspaceScope.value) {
      return workspaceById.value.get(currentWorkspaceId.value)?.name ?? '当前文档仓库'
    }

    if (workspaceFilter.value === 'all') {
      return '全部文档仓库'
    }

    return workspaceOptions.value.find((option) => option.id === workspaceFilter.value)?.label ?? '全部文档仓库'
  })
  const activeSourceFilterLabel = computed(() => {
    if (sourceFilter.value === 'all') {
      return '全部文档源'
    }

    return sourceOptions.value.find((option) => option.id === sourceFilter.value)?.label ?? '全部文档源'
  })

  const results = computed<SearchResult[]>(() => {
    if (!normalizedQuery.value) {
      return []
    }

    return filteredEntriesByScope.value
      .map((entry) => {
        if (sourceFilter.value !== 'all' && entry.sourceKey !== sourceFilter.value) {
          return null
        }

        if (isWorkspaceScope.value && !workspaceSourceIds.value.has(entry.docMeta.sourceId)) {
          return null
        }

        const matchMeta = getSearchMatchMeta(entry.record, normalizedQuery.value)
        if (!matchMeta) {
          return null
        }

        return {
          ...entry.record,
          matchField: matchMeta.field,
          routePath: entry.docMeta.routePath ?? `/docs/${entry.record.slug}/`,
          score: matchMeta.score,
          snippet: matchMeta.snippet || entry.record.summary,
          sectionTitle: entry.docMeta.sectionTitle,
          sourceId: entry.docMeta.sourceId,
          sourceKey: entry.sourceKey,
          sourceLabel: entry.docMeta.sourceLabel,
          sourceName: entry.docMeta.sourceName,
          workspaceId: entry.workspaceId,
          workspaceName: entry.workspaceName,
        }
      })
      .filter((item): item is SearchResult => item !== null)
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'zh-Hans-CN'))
      .slice(0, RESULT_LIMIT)
  })

  const activeResult = computed(() => results.value[selectedIndex.value] ?? null)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    selectedIndex.value = 0
  }

  function setQuery(value: string) {
    query.value = value
    selectedIndex.value = 0
  }

  function setScope(nextScope: DesktopSearchScope) {
    scope.value = nextScope
    selectedIndex.value = 0
  }

  function setWorkspaceFilter(nextWorkspaceId: string) {
    workspaceFilter.value = nextWorkspaceId
    sourceFilter.value = 'all'
    selectedIndex.value = 0
  }

  function setSourceFilter(nextSourceKey: string) {
    sourceFilter.value = nextSourceKey
    selectedIndex.value = 0
  }

  function toggleScope() {
    setScope(scope.value === 'global' ? 'workspace' : 'global')
  }

  function moveSelection(direction: 1 | -1) {
    if (!results.value.length) {
      selectedIndex.value = 0
      return
    }

    const next = selectedIndex.value + direction
    if (next < 0) {
      selectedIndex.value = results.value.length - 1
      return
    }

    if (next >= results.value.length) {
      selectedIndex.value = 0
      return
    }

    selectedIndex.value = next
  }

  watch(
    [scope, currentWorkspaceId, workspaceOptions],
    ([nextScope, nextWorkspaceId, nextWorkspaceOptions]) => {
      if (nextScope === 'workspace') {
        workspaceFilter.value = 'all'
        return
      }

      if (!nextWorkspaceId) {
        workspaceFilter.value = 'all'
        return
      }

      if (workspaceFilter.value !== 'all' && !nextWorkspaceOptions.some((option) => option.id === workspaceFilter.value)) {
        workspaceFilter.value = 'all'
      }
    },
    { immediate: true },
  )

  watch(
    sourceOptions,
    (nextSourceOptions) => {
      if (sourceFilter.value !== 'all' && !nextSourceOptions.some((option) => option.id === sourceFilter.value)) {
        sourceFilter.value = 'all'
      }
    },
    { immediate: true },
  )

  watch(
    () => results.value.length,
    (nextLength) => {
      if (nextLength === 0) {
        selectedIndex.value = 0
        return
      }

      if (selectedIndex.value >= nextLength) {
        selectedIndex.value = nextLength - 1
      }
    },
    { immediate: true },
  )

  return {
    activeSourceFilterLabel,
    activeWorkspaceFilterLabel,
    activeResult,
    close,
    isOpen,
    isWorkspaceScope,
    moveSelection,
    open,
    query,
    results,
    scope,
    selectedIndex,
    setSourceFilter,
    setQuery,
    setScope,
    setWorkspaceFilter,
    sourceFilter,
    sourceOptions,
    toggleScope,
    workspaceFilter,
    workspaceOptions,
  }
}
