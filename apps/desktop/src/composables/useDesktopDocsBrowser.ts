import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DocDetail } from '@/types/docs'
import type { DocMeta, DocsSourceGroup } from '@/types/docs'

type UseDesktopDocsBrowserOptions = {
  docs: MaybeRefOrGetter<DocMeta[]>
  docsBySlug: MaybeRefOrGetter<Record<string, DocMeta>>
  docDetailsBySlug: MaybeRefOrGetter<Record<string, DocDetail>>
  sourceGroups: MaybeRefOrGetter<DocsSourceGroup[]>
}

export function useDesktopDocsBrowser(options: UseDesktopDocsBrowserOptions) {
  const selectedDocSlug = shallowRef(getInitialSlug(toValue(options.docs)))
  const docs = computed(() => toValue(options.docs))
  const docsBySlug = computed(() => toValue(options.docsBySlug))
  const docDetailsBySlug = computed(() => toValue(options.docDetailsBySlug))
  const sourceGroups = computed(() => toValue(options.sourceGroups))

  const currentDoc = computed<DocDetail | null>(() => {
    const slug = selectedDocSlug.value
    return slug ? docDetailsBySlug.value[slug] ?? null : null
  })
  const currentDocMeta = computed(() => {
    const slug = selectedDocSlug.value
    return slug ? docsBySlug.value[slug] ?? null : null
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
    docs,
    (docsList) => {
      if (docsList.length === 0) {
        selectedDocSlug.value = ''
        return
      }

      if (!selectedDocSlug.value || !docsBySlug.value[selectedDocSlug.value]) {
        selectedDocSlug.value = getInitialSlug(docsList)
      }
    },
    { immediate: true },
  )

  function selectDoc(slug: string) {
    if (!docsBySlug.value[slug]) {
      return
    }

    selectedDocSlug.value = slug
  }

  function selectFirstDoc() {
    const firstSlug = getInitialSlug(docs.value)
    if (firstSlug) {
      selectedDocSlug.value = firstSlug
    }
  }

  function selectFirstDocBySourceIds(sourceIds: string[]) {
    if (sourceIds.length === 0) {
      selectedDocSlug.value = ''
      return
    }

    const firstDoc = docs.value.find((doc) => sourceIds.includes(doc.sourceId))
    selectedDocSlug.value = firstDoc?.slug ?? ''
  }

  function clearSelection() {
    selectedDocSlug.value = ''
  }

  return {
    clearSelection,
    currentDoc,
    currentSectionId,
    currentSourceId,
    docs,
    headings,
    nextDoc,
    prevDoc,
    selectDoc,
    selectFirstDoc,
    selectFirstDocBySourceIds,
    selectedDocSlug,
    sourceGroups,
  }
}

function getInitialSlug(docsList: Array<{ isSectionIndex: boolean; slug: string }>): string {
  const firstDoc = docsList.find((doc) => doc.isSectionIndex) ?? docsList[0]
  return firstDoc?.slug ?? ''
}
