import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsCatalog } from './useDocsCatalog'
import { useDocsContent } from './useDocsContent'

export function useDocRoute() {
  const route = useRoute()
  const { sectionMap } = useDocsCatalog()
  const { docDetails } = useDocsContent()

  const currentDoc = computed(() => {
    const slug = normalizeRouteParam(route.params.slug)
    if (!slug) {
      return null
    }
    return docDetails[slug] ?? null
  })

  const currentSection = computed(() => {
    const sectionParam = normalizeRouteParam(route.params.section)
    if (sectionParam) {
      return sectionMap.value.get(sectionParam) ?? null
    }

    if (currentDoc.value) {
      return currentDoc.value.sectionId ? sectionMap.value.get(currentDoc.value.sectionId) ?? null : null
    }

    return null
  })

  const currentSourceId = computed(() => currentDoc.value?.sourceId ?? currentSection.value?.sourceId ?? null)
  const isSectionIndexDoc = computed(() => currentDoc.value?.isSectionIndex ?? false)

  return {
    currentDoc,
    currentSection,
    currentSourceId,
    isSectionIndexDoc,
    route,
  }
}

function normalizeRouteParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return trimTrailingSlash(value)
  }

  if (Array.isArray(value)) {
    return trimTrailingSlash(value.join('/'))
  }

  return null
}

function trimTrailingSlash(value: string): string {
  if (value === '/') {
    return value
  }

  return value.replace(/\/+$/g, '')
}
