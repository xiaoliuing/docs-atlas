import { onBeforeUnmount, onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DocHeading } from '@/types/docs'

const HEADING_OFFSET = 52
const SCROLL_CONTAINER_ID = 'desktop-doc-scroll'

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

  function syncActiveHeading() {
    if (!isClient) {
      return
    }

    const currentHeadings = toValue(headings)
    if (!currentHeadings.length) {
      activeId.value = ''
      return
    }

    let currentId = currentHeadings[0]?.id ?? ''
    const scrollContainer = getScrollContainer()
    const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0

    for (const heading of currentHeadings) {
      const element = document.getElementById(heading.id)
      if (!element) {
        continue
      }

      const top = scrollContainer
        ? element.getBoundingClientRect().top - containerTop
        : element.getBoundingClientRect().top

      if (top <= HEADING_OFFSET) {
        currentId = heading.id
      } else {
        break
      }
    }

    activeId.value = currentId
  }

  function scrollToHeading(id: string) {
    if (!isClient) {
      return
    }

    const element = document.getElementById(id)
    if (!element) {
      return
    }

    const scrollContainer = getScrollContainer()
    if (scrollContainer) {
      const containerTop = scrollContainer.getBoundingClientRect().top
      const nextTop =
        scrollContainer.scrollTop + element.getBoundingClientRect().top - containerTop - HEADING_OFFSET

      scrollContainer.scrollTo({
        top: Math.max(0, nextTop),
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
  })

  onBeforeUnmount(() => {
    boundScrollContainer?.removeEventListener('scroll', syncActiveHeading)
    window.removeEventListener('resize', syncActiveHeading)
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
