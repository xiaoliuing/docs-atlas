import { computed, shallowRef } from 'vue'
import type { SearchResult } from '@/types/docs'
import { useDocsCatalog } from './useDocsCatalog'
import { useDocsContent } from './useDocsContent'

const RESULT_LIMIT = 10

export function useDocsSearch() {
  const query = shallowRef('')
  const isOpen = shallowRef(false)
  const selectedIndex = shallowRef(0)
  const { docsBySlug } = useDocsCatalog()
  const { ensureSearchIndex, searchIndex } = useDocsContent()

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())

  const results = computed<SearchResult[]>(() => {
    if (!normalizedQuery.value) {
      return []
    }

    return (searchIndex.value ?? [])
      .map((record) => {
        const score = scoreRecord(record, normalizedQuery.value)
        if (score === 0) {
          return null
        }

        return {
          ...record,
          routePath: docsBySlug[record.slug]?.routePath ?? `/docs/${record.slug}/`,
          score,
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

  function reset() {
    query.value = ''
    close()
  }

  return {
    activeResult,
    close,
    isOpen,
    moveSelection,
    open,
    query,
    reset,
    results,
    selectedIndex,
    setQuery,
  }
}

function scoreRecord(
  record: {
    headings: string[]
    plainText: string
    section: string
    summary: string
    title: string
  },
  query: string,
): number {
  const title = record.title.toLowerCase()
  const headings = record.headings.join(' ').toLowerCase()
  const summary = record.summary.toLowerCase()
  const body = record.plainText.toLowerCase()
  const section = record.section.toLowerCase()

  if (title.includes(query)) {
    return title.startsWith(query) ? 400 : 320
  }

  if (headings.includes(query)) {
    return 240
  }

  if (summary.includes(query)) {
    return 160
  }

  if (section.includes(query)) {
    return 120
  }

  if (body.includes(query)) {
    return 80
  }

  return 0
}
