import type { SearchMatchField, SearchRecord } from '@/types/docs'

export type HighlightPart = {
  text: string
  isMatch: boolean
}

export type SearchMatchMeta = {
  field: SearchMatchField
  score: number
  snippet: string
}

const BODY_SNIPPET_RADIUS = 70

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase()
}

export function splitHighlightedText(text: string, query: string): HighlightPart[] {
  if (!text) {
    return []
  }

  const normalizedQuery = normalizeSearchTerm(query)
  if (!normalizedQuery) {
    return [{ text, isMatch: false }]
  }

  const source = text.toLowerCase()
  const parts: HighlightPart[] = []
  let cursor = 0

  while (cursor < text.length) {
    const matchIndex = source.indexOf(normalizedQuery, cursor)
    if (matchIndex === -1) {
      parts.push({
        text: text.slice(cursor),
        isMatch: false,
      })
      break
    }

    if (matchIndex > cursor) {
      parts.push({
        text: text.slice(cursor, matchIndex),
        isMatch: false,
      })
    }

    parts.push({
      text: text.slice(matchIndex, matchIndex + normalizedQuery.length),
      isMatch: true,
    })

    cursor = matchIndex + normalizedQuery.length
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }]
}

export function getSearchMatchMeta(record: SearchRecord, query: string): SearchMatchMeta | null {
  const normalizedQuery = normalizeSearchTerm(query)
  if (!normalizedQuery) {
    return null
  }

  const headingsText = record.headings.join(' ')
  const fields: Array<{
    field: SearchMatchField
    score: number
    text: string
    startsWithBonus?: number
  }> = [
    { field: 'title', score: 320, text: record.title, startsWithBonus: 80 },
    { field: 'heading', score: 240, text: headingsText },
    { field: 'summary', score: 160, text: record.summary },
    { field: 'section', score: 120, text: record.section },
    { field: 'body', score: 80, text: record.plainText },
  ]

  for (const candidate of fields) {
    const matchIndex = candidate.text.toLowerCase().indexOf(normalizedQuery)
    if (matchIndex === -1) {
      continue
    }

    const score =
      candidate.startsWithBonus && matchIndex === 0
        ? candidate.score + candidate.startsWithBonus
        : candidate.score

    return {
      field: candidate.field,
      score,
      snippet: buildSnippet(candidate.field, candidate.text, normalizedQuery, matchIndex),
    }
  }

  return null
}

export function highlightSearchMatches(
  root: HTMLElement,
  query: string,
): { count: number; firstMatchElement: HTMLElement | null } {
  const normalizedQuery = normalizeSearchTerm(query)
  if (!normalizedQuery) {
    return { count: 0, firstMatchElement: null }
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) {
        return NodeFilter.FILTER_REJECT
      }

      if (parent.closest('mark[data-search-hit="true"]')) {
        return NodeFilter.FILTER_REJECT
      }

      const text = node.textContent ?? ''
      if (!text.trim()) {
        return NodeFilter.FILTER_REJECT
      }

      return text.toLowerCase().includes(normalizedQuery)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    },
  })

  const nodes: Text[] = []
  let currentNode = walker.nextNode()
  while (currentNode) {
    if (currentNode instanceof Text) {
      nodes.push(currentNode)
    }
    currentNode = walker.nextNode()
  }

  let count = 0
  let firstMatchElement: HTMLElement | null = null

  for (const textNode of nodes) {
    const content = textNode.textContent ?? ''
    const lowerContent = content.toLowerCase()
    let searchFrom = 0
    let hasMatch = false
    const fragment = document.createDocumentFragment()

    while (searchFrom < content.length) {
      const matchIndex = lowerContent.indexOf(normalizedQuery, searchFrom)
      if (matchIndex === -1) {
        fragment.append(content.slice(searchFrom))
        break
      }

      hasMatch = true

      if (matchIndex > searchFrom) {
        fragment.append(content.slice(searchFrom, matchIndex))
      }

      const mark = document.createElement('mark')
      mark.className = 'doc-search-mark'
      mark.dataset.searchHit = 'true'
      mark.textContent = content.slice(matchIndex, matchIndex + normalizedQuery.length)

      if (!firstMatchElement) {
        firstMatchElement = mark
        mark.classList.add('doc-search-mark--active')
        mark.dataset.searchCurrent = 'true'
      }

      fragment.append(mark)
      count += 1
      searchFrom = matchIndex + normalizedQuery.length
    }

    if (hasMatch) {
      textNode.parentNode?.replaceChild(fragment, textNode)
    }
  }

  return { count, firstMatchElement }
}

function buildSnippet(
  field: SearchMatchField,
  text: string,
  query: string,
  matchIndex: number,
): string {
  if (!text) {
    return ''
  }

  if (field !== 'body') {
    return text
  }

  const start = Math.max(0, matchIndex - BODY_SNIPPET_RADIUS)
  const end = Math.min(text.length, matchIndex + query.length + BODY_SNIPPET_RADIUS)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return `${prefix}${normalizeExcerptWhitespace(text.slice(start, end))}${suffix}`
}

function normalizeExcerptWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
