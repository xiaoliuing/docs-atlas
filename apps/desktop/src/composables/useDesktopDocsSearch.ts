import { computed, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import type { DocMeta, SearchRecord, SearchResult } from '@/types/docs'
import { getSearchMatchMeta, normalizeSearchTerm } from '@/utils/search'

const RESULT_LIMIT = 10

export type DesktopSearchScope = 'global' | 'workspace'

type UseDesktopDocsSearchOptions = {
  docsBySlug?: MaybeRefOrGetter<Record<string, DocMeta>>
  searchIndex?: MaybeRefOrGetter<SearchRecord[]>
  workspaceSourceIds?: MaybeRefOrGetter<string[]>
}

export function useDesktopDocsSearch(options: UseDesktopDocsSearchOptions = {}) {
  const query = shallowRef('')
  const isOpen = shallowRef(false)
  const scope = shallowRef<DesktopSearchScope>('global')
  const selectedIndex = shallowRef(0)

  const normalizedQuery = computed(() => normalizeSearchTerm(query.value))
  const docsBySlug = computed(() => toValue(options.docsBySlug) ?? {})
  const searchIndex = computed(() => toValue(options.searchIndex) ?? [])
  const workspaceSourceIds = computed(() => new Set(toValue(options.workspaceSourceIds) ?? []))
  const isWorkspaceScope = computed(() => scope.value === 'workspace')

  const results = computed<SearchResult[]>(() => {
    if (!normalizedQuery.value) {
      return []
    }

    return searchIndex.value
      .map((record) => {
        const docMeta = docsBySlug.value[record.slug]
        if (!docMeta) {
          return null
        }

        if (isWorkspaceScope.value && !workspaceSourceIds.value.has(docMeta.sourceId)) {
          return null
        }

        const matchMeta = getSearchMatchMeta(record, normalizedQuery.value)
        if (!matchMeta) {
          return null
        }

        return {
          ...record,
          matchField: matchMeta.field,
          routePath: docMeta.routePath ?? `/docs/${record.slug}/`,
          score: matchMeta.score,
          snippet: matchMeta.snippet || record.summary,
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

  return {
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
    setQuery,
    setScope,
    toggleScope,
  }
}
