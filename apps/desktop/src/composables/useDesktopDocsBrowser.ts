import { computed, shallowRef, watch } from 'vue'
import type { DocDetail } from '@/types/docs'
import { useDesktopDocsCatalog } from './useDesktopDocsCatalog'
import { ensureDocDetail, useDesktopDocsContent } from './useDesktopDocsContent'

export function useDesktopDocsBrowser() {
  const { docs, docsBySlug, sourceGroups } = useDesktopDocsCatalog()
  const { docDetails } = useDesktopDocsContent()
  const selectedDocSlug = shallowRef(getInitialSlug(docs))

  const currentDoc = computed<DocDetail | null>(() => {
    const slug = selectedDocSlug.value
    return slug ? docDetails[slug] ?? null : null
  })
  const currentDocMeta = computed(() => {
    const slug = selectedDocSlug.value
    return slug ? docsBySlug[slug] ?? null : null
  })
  const currentSectionId = computed(() => currentDocMeta.value?.sectionId ?? null)
  const currentSourceId = computed(() => currentDocMeta.value?.sourceId ?? null)
  const headings = computed(() => currentDoc.value?.headings ?? [])
  const prevDoc = computed(() => {
    const slug = currentDocMeta.value?.prevSlug
    return slug ? docsBySlug[slug] ?? null : null
  })
  const nextDoc = computed(() => {
    const slug = currentDocMeta.value?.nextSlug
    return slug ? docsBySlug[slug] ?? null : null
  })

  watch(
    selectedDocSlug,
    (slug) => {
      if (!slug) {
        return
      }

      void ensureDocDetail(slug)
    },
    { immediate: true },
  )

  function selectDoc(slug: string) {
    if (!docsBySlug[slug]) {
      return
    }

    selectedDocSlug.value = slug
  }

  function selectFirstDoc() {
    const firstSlug = getInitialSlug(docs)
    if (firstSlug) {
      selectedDocSlug.value = firstSlug
    }
  }

  return {
    currentDoc,
    currentSectionId,
    currentSourceId,
    docs,
    headings,
    nextDoc,
    prevDoc,
    selectDoc,
    selectFirstDoc,
    selectedDocSlug,
    sourceGroups,
  }
}

function getInitialSlug(docsList: Array<{ isSectionIndex: boolean; slug: string }>): string {
  const firstDoc = docsList.find((doc) => doc.isSectionIndex) ?? docsList[0]
  return firstDoc?.slug ?? ''
}
