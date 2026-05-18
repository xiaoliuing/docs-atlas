<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import type { DocDetail } from '@/types/docs'
import { highlightSearchMatches } from '@/utils/search'
import DesktopDocImagePreview from './DesktopDocImagePreview.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail
    highlightQuery?: string
    shouldAutoScrollToHighlight?: boolean
  }>(),
  {
    highlightQuery: '',
    shouldAutoScrollToHighlight: true,
  },
)

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const bodyRef = useTemplateRef<HTMLElement>('body')
const previewImages = shallowRef<PreviewImage[]>([])
const previewIndex = shallowRef(0)
const contentKey = computed(() => `${props.doc.slug}:${props.highlightQuery}`)

watch(
  () => [props.doc.slug, props.highlightQuery, props.shouldAutoScrollToHighlight] as const,
  async ([, highlightQuery, shouldAutoScroll]) => {
    await nextTick()

    const bodyElement = bodyRef.value
    if (!bodyElement || !highlightQuery.trim()) {
      return
    }

    const { firstMatchElement } = highlightSearchMatches(bodyElement, highlightQuery)
    if (!firstMatchElement || !shouldAutoScroll) {
      return
    }

    scrollToHighlight(firstMatchElement)
  },
  { immediate: true },
)

function closePreview() {
  previewImages.value = []
  previewIndex.value = 0
}

function setPreviewIndex(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= previewImages.value.length) {
    return
  }

  previewIndex.value = nextIndex
}

function handleBodyClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const image = target.closest('img')
  if (!(image instanceof HTMLImageElement)) {
    return
  }

  if (!event.currentTarget || !(event.currentTarget instanceof HTMLElement)) {
    return
  }

  if (!event.currentTarget.contains(image)) {
    return
  }

  event.preventDefault()
  if (!image.currentSrc && !image.getAttribute('src')) {
    return
  }

  const imageElements = Array.from(event.currentTarget.querySelectorAll('img'))
    .filter((item) => item.currentSrc || item.getAttribute('src'))

  if (imageElements.length === 0) {
    return
  }

  previewImages.value = imageElements.map((item) => ({
    alt: item.getAttribute('alt') ?? '',
    src: item.currentSrc || item.getAttribute('src') || '',
    title: item.getAttribute('title') ?? '',
  }))
  previewIndex.value = Math.max(imageElements.indexOf(image), 0)
}

function scrollToHighlight(element: HTMLElement) {
  if (typeof window === 'undefined') {
    return
  }

  window.requestAnimationFrame(() => {
    const top = window.scrollY + element.getBoundingClientRect().top - 132
    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
    })
  })
}
</script>

<template>
  <article class="doc-content">
    <header class="doc-content__header">
      <div class="doc-content__header-top">
        <p class="doc-content__section">
          {{ doc.sectionTitle ? `${doc.sourceLabel} / ${doc.sectionTitle}` : doc.sourceLabel }}
        </p>
        <code class="doc-content__source">{{ doc.sourcePath }}</code>
      </div>
      <h1 class="doc-content__title">
        {{ doc.title }}
      </h1>
    </header>

    <div class="doc-content__body-shell">
      <div
        :key="contentKey"
        ref="body"
        class="doc-content__body prose"
        v-html="doc.html"
        @click="handleBodyClick"
      />
    </div>
  </article>

  <DesktopDocImagePreview
    :active-index="previewIndex"
    :images="previewImages"
    @close="closePreview"
    @update:active-index="setPreviewIndex"
  />
</template>

<style scoped>
.doc-content {
  display: grid;
  gap: 0.9rem;
}

.doc-content__header {
  display: grid;
  gap: 0.62rem;
  padding: 1.15rem 1.2rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
}

.doc-content__header-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.doc-content__section {
  margin: 0;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.58rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.12);
  letter-spacing: 0.08em;
  color: var(--desktop-accent);
  font-size: 0.74rem;
}

.doc-content__title {
  margin: 0;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1.14;
  letter-spacing: -0.02em;
}

.doc-content__body {
  min-width: 0;
  width: 100%;
  max-width: min(100%, 88ch);
  margin-inline: auto;
}

.doc-content__body-shell {
  min-width: 0;
  padding: 0.9rem 0.95rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface-strong);
}

.doc-content__source {
  color: var(--desktop-soft);
  font-size: 0.78rem;
}

.doc-content__body :deep(mark.doc-search-mark) {
  padding: 0.1em 0.22em;
  border-radius: 0.36em;
  background: rgba(var(--desktop-accent-rgb), 0.14);
  color: var(--desktop-accent);
  scroll-margin-top: 8rem;
}

.doc-content__body :deep(mark.doc-search-mark--active) {
  background: rgba(var(--desktop-accent-rgb), 0.2);
  box-shadow: 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.16);
}
</style>
