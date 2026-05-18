import { computed, shallowRef } from 'vue'
import type { SearchResult } from '@/types/docs'
import { useDesktopDocsCatalog } from './useDesktopDocsCatalog'
import { useDesktopDocsContent } from './useDesktopDocsContent'
import { getSearchMatchMeta, normalizeSearchTerm } from '@/utils/search'

const RESULT_LIMIT = 10

export function useDesktopDocsSearch() {
  const query = shallowRef('')
  const isOpen = shallowRef(false)
  const selectedIndex = shallowRef(0)
  const { docsBySlug } = useDesktopDocsCatalog()
  const { ensureSearchIndex, searchIndex } = useDesktopDocsContent()

  const normalizedQuery = computed(() => normalizeSearchTerm(query.value))

  const results = computed<SearchResult[]>(() => {
    if (!normalizedQuery.value) {
      return []
    }

    return (searchIndex.value ?? [])
      .map((record) => {
        const matchMeta = getSearchMatchMeta(record, normalizedQuery.value)
        if (!matchMeta) {
          return null
        }

        return {
          ...record,
          matchField: matchMeta.field,
          routePath: docsBySlug[record.slug]?.routePath ?? `/docs/${record.slug}/`,
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
    void ensureSearchIndex()
  }

  function close() {
    isOpen.value = false
    selectedIndex.value = 0
  }

  function setQuery(value: string) {
    query.value = value
    selectedIndex.value = 0
    isOpen.value = value.trim().length > 0

    if (value.trim()) {
      void ensureSearchIndex()
    }
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
    moveSelection,
    open,
    query,
    results,
    selectedIndex,
    setQuery,
  }
}
