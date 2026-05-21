<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import type { DocDetail } from '@/types/docs'
import { highlightSearchMatches } from '@/utils/search'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopDocImagePreview from './DesktopDocImagePreview.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail
    isFavorite?: boolean
    highlightQuery?: string
    shouldAutoScrollToHighlight?: boolean
  }>(),
  {
    isFavorite: false,
    highlightQuery: '',
    shouldAutoScrollToHighlight: true,
  },
)

const emit = defineEmits<{
  selectDoc: [slug: string]
  toggleFavorite: []
}>()

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

  const docLink = target.closest<HTMLAnchorElement>('a[data-doc-slug]')
  if (docLink) {
    const slug = docLink.dataset.docSlug?.trim()
    if (slug) {
      event.preventDefault()
      emit('selectDoc', slug)
      return
    }
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
    const scrollContainer = document.getElementById('desktop-doc-scroll')
    if (scrollContainer) {
      const containerTop = scrollContainer.getBoundingClientRect().top
      const nextTop =
        scrollContainer.scrollTop + element.getBoundingClientRect().top - containerTop - 52

      scrollContainer.scrollTo({
        top: Math.max(0, nextTop),
        behavior: 'smooth',
      })
      return
    }

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
        <div class="doc-content__meta">
          <p class="doc-content__section">
            {{ doc.sectionTitle ? `${doc.sourceLabel} / ${doc.sectionTitle}` : doc.sourceLabel }}
          </p>
          <code class="doc-content__source">{{ doc.sourcePath }}</code>
        </div>

        <button
          :class="['doc-content__favorite', { 'doc-content__favorite--active': props.isFavorite }]"
          type="button"
          @click="emit('toggleFavorite')"
        >
          <DesktopUiIcon name="bookmark" :size="16" />
          <span>{{ props.isFavorite ? '已收藏' : '收藏' }}</span>
        </button>
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
  gap: 0.75rem;
}

.doc-content__header {
  display: grid;
  gap: 0.5rem;
  padding: 0.95rem 1rem;
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

.doc-content__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  min-width: 0;
}

.doc-content__section {
  margin: 0;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.12);
  letter-spacing: 0.08em;
  color: var(--desktop-accent);
  font-size: 0.68rem;
}

.doc-content__title {
  margin: 0;
  font-size: clamp(1.28rem, 1.9vw, 1.72rem);
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.doc-content__body {
  min-width: 0;
  width: 100%;
  max-width: min(100%, 92ch);
  margin-inline: auto;
}

.doc-content__body-shell {
  min-width: 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface-strong);
}

.doc-content__source {
  color: var(--desktop-soft);
  font-size: 0.72rem;
}

.doc-content__favorite {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  min-height: 2rem;
  padding: 0.32rem 0.72rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.15);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.doc-content__favorite:hover,
.doc-content__favorite--active {
  border-color: rgba(var(--desktop-accent-rgb), 0.28);
  background: rgba(var(--desktop-accent-rgb), 0.12);
  color: var(--desktop-accent);
  transform: translateY(-1px);
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
