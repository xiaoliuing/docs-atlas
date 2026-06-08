import { onBeforeUnmount, onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DocHeading } from '@/types/docs'

const SCROLL_CONTAINER_ID = 'desktop-doc-scroll'
const DOC_RENDERED_EVENT = 'docs-atlas:doc-rendered'
const HEADING_OFFSET = 52
type HeadingTarget = { id: string; index: number }

export function useDesktopActiveHeadings(headings: MaybeRefOrGetter<DocHeading[]>) {
  const activeId = shallowRef('')
  const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'
  let boundScrollContainer: HTMLElement | null = null

  function getScrollContainer() {
    if (!isClient) {
      return null
    }

    return document.getElementById(SCROLL_CONTAINER_ID)
  }

  function bindScrollContainer() {
    const scrollContainer = getScrollContainer()
    if (scrollContainer === boundScrollContainer) {
      return
    }

    boundScrollContainer?.removeEventListener('scroll', syncActiveHeading)
    scrollContainer?.addEventListener('scroll', syncActiveHeading, { passive: true })
    boundScrollContainer = scrollContainer
  }

  function getHeadingElements() {
    if (!isClient) {
      return []
    }

    const editorRoot = document.querySelector<HTMLElement>(
      `#${SCROLL_CONTAINER_ID} .desktop-doc-editor__editor .ProseMirror`,
    )
    if (!editorRoot) {
      return []
    }

    return Array.from(editorRoot.querySelectorAll<HTMLElement>('h2, h3'))
  }

  function getRenderedHeadings() {
    const currentHeadings = toValue(headings)
    return getHeadingElements()
      .map((element, index) => ({
        element,
        id: element.dataset.docHeadingId || currentHeadings[index]?.id || element.id || '',
        index: Number.parseInt(element.dataset.docHeadingIndex ?? `${index}`, 10),
      }))
      .filter((item) => item.id)
      .sort((left, right) => left.index - right.index)
  }

  function getHeadingElement(target: HeadingTarget | string, fallbackIndex?: number) {
    const headingElements = getHeadingElements()
    if (typeof target === 'string') {
      const matchByDataId = headingElements.find((element) => element.dataset.docHeadingId === target)
      if (matchByDataId) {
        return matchByDataId
      }

      if (typeof fallbackIndex === 'number') {
        return headingElements[fallbackIndex] ?? null
      }

      return headingElements.find((element) => element.id === target) ?? null
    }

    return headingElements[target.index] ?? headingElements.find((element) => element.dataset.docHeadingId === target.id) ?? null
  }

  function syncActiveHeading() {
    if (!isClient) {
      return
    }

    const renderedHeadings = getRenderedHeadings()
    if (!renderedHeadings.length) {
      activeId.value = ''
      return
    }

    const scrollContainer = getScrollContainer()
    if (!scrollContainer) {
      activeId.value = renderedHeadings[0]?.id ?? ''
      return
    }

    const threshold = scrollContainer.scrollTop + HEADING_OFFSET + 2
    let currentId = renderedHeadings[0]?.id ?? ''

    for (const heading of renderedHeadings) {
      if (heading.element.offsetTop <= threshold) {
        currentId = heading.id
        continue
      }
      break
    }

    activeId.value = currentId
  }

  function scrollToHeading(target: HeadingTarget | string) {
    if (!isClient) {
      return
    }

    const id = typeof target === 'string' ? target : target.id
    const element = getHeadingElement(target)
    if (!element) {
      return
    }

    activeId.value = id

    const activeElement = document.activeElement
    if (
      activeElement instanceof HTMLElement &&
      activeElement.closest('.desktop-doc-editor__editor')
    ) {
      activeElement.blur()
    }

    const scrollContainer = getScrollContainer()
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: Math.max(0, element.offsetTop - HEADING_OFFSET),
        behavior: 'smooth',
      })
      return
    }

    const top = window.scrollY + element.getBoundingClientRect().top - 96
    window.scrollTo({
      top,
      behavior: 'smooth',
    })
  }

  onMounted(() => {
    bindScrollContainer()
    syncActiveHeading()
    window.addEventListener('resize', syncActiveHeading)
    window.addEventListener(DOC_RENDERED_EVENT, syncActiveHeading as EventListener)
  })

  onBeforeUnmount(() => {
    boundScrollContainer?.removeEventListener('scroll', syncActiveHeading)
    window.removeEventListener('resize', syncActiveHeading)
    window.removeEventListener(DOC_RENDERED_EVENT, syncActiveHeading as EventListener)
  })

  watch(
    () => toValue(headings).map((heading) => heading.id).join(','),
    () => {
      if (!isClient) {
        return
      }

      window.requestAnimationFrame(() => {
        bindScrollContainer()
        syncActiveHeading()
      })
    },
    { immediate: true },
  )

  return {
    activeId,
    scrollToHeading,
  }
}
