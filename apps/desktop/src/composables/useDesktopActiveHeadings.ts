import { onBeforeUnmount, onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DocHeading } from '@/types/docs'

const HEADING_OFFSET = 128

export function useDesktopActiveHeadings(headings: MaybeRefOrGetter<DocHeading[]>) {
  const activeId = shallowRef('')
  const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'

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

    for (const heading of currentHeadings) {
      const element = document.getElementById(heading.id)
      if (!element) {
        continue
      }

      const top = element.getBoundingClientRect().top
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

    const top = window.scrollY + element.getBoundingClientRect().top - 96
    window.scrollTo({
      top,
      behavior: 'smooth',
    })
  }

  onMounted(() => {
    syncActiveHeading()
    window.addEventListener('scroll', syncActiveHeading, { passive: true })
    window.addEventListener('resize', syncActiveHeading)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', syncActiveHeading)
    window.removeEventListener('resize', syncActiveHeading)
  })

  watch(
    () => toValue(headings).map((heading) => heading.id).join(','),
    () => {
      if (!isClient) {
        return
      }

      window.requestAnimationFrame(syncActiveHeading)
    },
    { immediate: true },
  )

  return {
    activeId,
    scrollToHeading,
  }
}
