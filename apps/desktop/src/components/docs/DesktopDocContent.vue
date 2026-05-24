<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import mermaid from 'mermaid'
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail } from '@/types/docs'
import { highlightSearchMatches } from '@/utils/search'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopDocImagePreview from './DesktopDocImagePreview.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail
    isFavorite?: boolean
    highlightQuery?: string
    markdownThemeId?: DesktopMarkdownThemeId
    shouldAutoScrollToHighlight?: boolean
  }>(),
  {
    isFavorite: false,
    highlightQuery: '',
    markdownThemeId: 'atlas',
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
  () => [props.doc.slug, props.doc.html, props.highlightQuery, props.shouldAutoScrollToHighlight] as const,
  async ([, , highlightQuery, shouldAutoScroll]) => {
    await nextTick()
    await renderMermaidBlocks()

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

async function renderMermaidBlocks() {
  const bodyElement = bodyRef.value
  if (!bodyElement) {
    return
  }

  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme,
  })

  const blocks = Array.from(bodyElement.querySelectorAll<HTMLPreElement>('pre.mermaid'))
  await Promise.all(blocks.map((block, index) => renderMermaidBlock(block, index)))
}

async function renderMermaidBlock(block: HTMLPreElement, index: number) {
  const source = block.textContent?.trim() ?? ''
  if (!source) {
    return
  }

  const id = `docs-atlas-mermaid-${sanitizeMermaidId(props.doc.slug)}-${index}`

  try {
    const { svg } = await mermaid.render(id, source)
    const wrapper = document.createElement('div')
    wrapper.className = 'doc-content__mermaid'
    wrapper.innerHTML = svg
    block.replaceWith(wrapper)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mermaid 图表渲染失败'
    const fallback = document.createElement('div')
    fallback.className = 'doc-content__mermaid-error'
    fallback.innerHTML = `<strong>Mermaid 图表渲染失败</strong><pre><code></code></pre>`
    const code = fallback.querySelector('code')
    if (code) {
      code.textContent = `${message}\n\n${source}`
    }
    block.replaceWith(fallback)
  }
}

function sanitizeMermaidId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

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

    <div class="doc-content__body-shell" :data-markdown-theme="props.markdownThemeId">
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
  --markdown-code-bg: rgba(var(--desktop-accent-rgb), 0.08);
  --markdown-inline-code-bg: rgba(var(--desktop-accent-rgb), 0.09);
  --markdown-quote-bg: rgba(var(--desktop-accent-rgb), 0.045);
  --markdown-spacing: 1rem;
  min-width: 0;
  width: 100%;
  max-width: min(100%, 92ch);
  margin-inline: auto;
  color: var(--desktop-ink);
  font-size: 0.95rem;
  line-height: 1.72;
}

.doc-content__body-shell {
  min-width: 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface-strong);
}

.doc-content__body-shell[data-markdown-theme="github"] {
  padding: 1rem;
  background: var(--desktop-surface);
}

.doc-content__body-shell[data-markdown-theme="compact"] {
  padding: 0.62rem 0.72rem;
}

.doc-content__body-shell[data-markdown-theme="reading"] {
  padding: 1.1rem 1.2rem;
}

.doc-content__body-shell[data-markdown-theme="github"] .doc-content__body {
  --markdown-code-bg: rgba(15, 23, 42, 0.055);
  --markdown-inline-code-bg: rgba(15, 23, 42, 0.07);
  --markdown-quote-bg: transparent;
  --markdown-spacing: 0.92rem;
  max-width: min(100%, 94ch);
  font-size: 0.94rem;
  line-height: 1.68;
}

.doc-content__body-shell[data-markdown-theme="compact"] .doc-content__body {
  --markdown-spacing: 0.66rem;
  max-width: min(100%, 108ch);
  font-size: 0.86rem;
  line-height: 1.56;
}

.doc-content__body-shell[data-markdown-theme="reading"] .doc-content__body {
  --markdown-code-bg: rgba(var(--desktop-accent-rgb), 0.065);
  --markdown-inline-code-bg: rgba(var(--desktop-accent-rgb), 0.08);
  --markdown-quote-bg: rgba(var(--desktop-accent-rgb), 0.035);
  --markdown-spacing: 1.22rem;
  max-width: min(100%, 78ch);
  font-size: 1rem;
  line-height: 1.86;
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

.doc-content__body :deep(h1),
.doc-content__body :deep(h2),
.doc-content__body :deep(h3),
.doc-content__body :deep(h4),
.doc-content__body :deep(h5),
.doc-content__body :deep(h6) {
  margin: calc(var(--markdown-spacing) * 1.32) 0 calc(var(--markdown-spacing) * 0.54);
  color: var(--desktop-ink);
  line-height: 1.24;
  letter-spacing: -0.018em;
}

.doc-content__body :deep(h1:first-child),
.doc-content__body :deep(h2:first-child),
.doc-content__body :deep(h3:first-child) {
  margin-top: 0;
}

.doc-content__body :deep(h1) {
  font-size: 1.64em;
}

.doc-content__body :deep(h2) {
  padding-bottom: 0.34rem;
  border-bottom: 1px solid var(--desktop-line);
  font-size: 1.38em;
}

.doc-content__body :deep(h3) {
  font-size: 1.16em;
}

.doc-content__body :deep(p),
.doc-content__body :deep(ul),
.doc-content__body :deep(ol),
.doc-content__body :deep(blockquote),
.doc-content__body :deep(pre) {
  margin: var(--markdown-spacing) 0;
}

.doc-content__body :deep(ul),
.doc-content__body :deep(ol) {
  padding-left: 1.35rem;
}

.doc-content__body :deep(li + li) {
  margin-top: 0.22rem;
}

.doc-content__body :deep(a) {
  color: var(--desktop-accent);
  text-decoration: none;
  text-underline-offset: 0.18em;
}

.doc-content__body :deep(a:hover) {
  text-decoration: underline;
}

.doc-content__body :deep(blockquote) {
  padding: 0.76rem 0.9rem;
  border-left: 4px solid rgba(var(--desktop-accent-rgb), 0.34);
  border-radius: 0.7rem;
  background: var(--markdown-quote-bg);
  color: var(--desktop-muted);
}

.doc-content__body :deep(code) {
  padding: 0.12em 0.34em;
  border: 1px solid var(--desktop-line);
  border-radius: 0.42rem;
  background: var(--markdown-inline-code-bg);
  color: var(--desktop-ink);
  font-size: 0.9em;
}

.doc-content__body :deep(pre) {
  padding: 0.9rem 1rem;
  overflow-x: auto;
  border: 1px solid var(--desktop-line);
  border-radius: 0.85rem;
  background: var(--markdown-code-bg);
  line-height: 1.58;
}

.doc-content__body :deep(pre code) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 0.86rem;
}

.doc-content__body-shell[data-markdown-theme="github"] .doc-content__body :deep(h2) {
  padding-bottom: 0.42rem;
}

.doc-content__body-shell[data-markdown-theme="compact"] .doc-content__body :deep(h2) {
  padding-bottom: 0.24rem;
}

.doc-content__body-shell[data-markdown-theme="compact"] .doc-content__body :deep(pre) {
  padding: 0.68rem 0.78rem;
}

.doc-content__body-shell[data-markdown-theme="reading"] .doc-content__body :deep(h2) {
  margin-top: calc(var(--markdown-spacing) * 1.55);
}

.doc-content__body :deep(table) {
  display: table;
  width: 100%;
  inline-size: 100%;
  min-width: 100%;
  min-inline-size: 100%;
  max-width: 100%;
  max-inline-size: 100%;
  box-sizing: border-box;
  margin: var(--markdown-spacing) 0;
  table-layout: auto;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid var(--desktop-line);
  border-radius: 0.78rem;
  background: var(--desktop-surface);
  font-size: 0.94em;
  line-height: 1.55;
}

.doc-content__body :deep(thead) {
  display: table-header-group;
}

.doc-content__body :deep(tbody) {
  display: table-row-group;
}

.doc-content__body :deep(tr) {
  display: table-row;
  width: 100%;
}

.doc-content__body :deep(th),
.doc-content__body :deep(td) {
  display: table-cell;
  padding: 0.62rem 0.78rem;
  border-right: 1px solid var(--desktop-line);
  border-bottom: 1px solid var(--desktop-line);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.doc-content__body :deep(td code),
.doc-content__body :deep(th code) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.doc-content__body-shell[data-markdown-theme="github"] .doc-content__body :deep(table) {
  border-radius: 0.45rem;
}

.doc-content__body-shell[data-markdown-theme="github"] .doc-content__body :deep(th) {
  background: rgba(15, 23, 42, 0.045);
}

.doc-content__body-shell[data-markdown-theme="compact"] .doc-content__body :deep(th),
.doc-content__body-shell[data-markdown-theme="compact"] .doc-content__body :deep(td) {
  padding: 0.44rem 0.58rem;
}

.doc-content__body-shell[data-markdown-theme="reading"] .doc-content__body :deep(th),
.doc-content__body-shell[data-markdown-theme="reading"] .doc-content__body :deep(td) {
  padding: 0.72rem 0.86rem;
}

.doc-content__body :deep(th:last-child),
.doc-content__body :deep(td:last-child) {
  border-right: 0;
}

.doc-content__body :deep(tr:last-child td) {
  border-bottom: 0;
}

.doc-content__body :deep(th) {
  background: rgba(var(--desktop-accent-rgb), 0.07);
  color: var(--desktop-ink);
  font-weight: 650;
}

.doc-content__body :deep(tr:nth-child(even) td) {
  background: rgba(var(--desktop-accent-rgb), 0.025);
}

.doc-content__body :deep(.doc-content__mermaid) {
  width: 100%;
  margin: 1rem 0;
  padding: 1rem;
  overflow-x: auto;
  border: 1px solid var(--desktop-line);
  border-radius: 0.85rem;
  background: var(--desktop-surface);
}

.doc-content__body :deep(.doc-content__mermaid svg) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.doc-content__body :deep(.doc-content__mermaid-error) {
  margin: 1rem 0;
  padding: 0.9rem;
  border: 1px solid rgba(220, 38, 38, 0.24);
  border-radius: 0.85rem;
  background: rgba(220, 38, 38, 0.06);
  color: var(--desktop-ink);
}

.doc-content__body :deep(.doc-content__mermaid-error strong) {
  display: block;
  margin-bottom: 0.55rem;
  color: #dc2626;
  font-size: 0.84rem;
}

.doc-content__body :deep(.doc-content__mermaid-error pre) {
  margin: 0;
  white-space: pre-wrap;
}
</style>
