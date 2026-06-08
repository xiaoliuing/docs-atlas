<script setup lang="ts">
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail, DocMeta } from '@/types/docs'
import DesktopDocContent from './DesktopDocContent.vue'
import DesktopDocPager from './DesktopDocPager.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail | null
    isLoading?: boolean
    highlightQuery: string
    isFavorite?: boolean
    markdownThemeId?: DesktopMarkdownThemeId
    nextDoc: DocMeta | null
    prevDoc: DocMeta | null
    restoreScrollTop?: number
    saveDoc: (absolutePath: string, markdown: string) => Promise<void>
  }>(),
  {
    isLoading: false,
    isFavorite: false,
    markdownThemeId: 'atlas',
    restoreScrollTop: 0,
  },
)

const emit = defineEmits<{
  selectDoc: [slug: string]
  scrollTopChange: [top: number]
  toggleFavorite: []
}>()
</script>

<template>
  <section
    v-if="props.isLoading"
    class="desktop-doc-reader__loading"
    aria-busy="true"
  >
    <div class="desktop-doc-reader__loading-shell">
      <article class="desktop-doc-reader__loading-article">
        <header class="desktop-doc-reader__loading-header">
          <div class="desktop-doc-reader__loading-header-main">
            <span class="desktop-doc-reader__loading-kicker" />
            <span class="desktop-doc-reader__loading-title" />
          </div>

          <span class="desktop-doc-reader__loading-action" />
        </header>

        <div class="desktop-doc-reader__loading-meta">
          <span class="desktop-doc-reader__loading-meta-label" />
          <span class="desktop-doc-reader__loading-meta-value" />
        </div>

        <div class="desktop-doc-reader__loading-body">
          <span class="desktop-doc-reader__loading-line desktop-doc-reader__loading-line--wide" />
          <span class="desktop-doc-reader__loading-line desktop-doc-reader__loading-line--mid" />
          <span class="desktop-doc-reader__loading-line desktop-doc-reader__loading-line--soft" />
          <span class="desktop-doc-reader__loading-block desktop-doc-reader__loading-block--code" />
          <span class="desktop-doc-reader__loading-line desktop-doc-reader__loading-line--wide" />
          <span class="desktop-doc-reader__loading-line" />
          <span class="desktop-doc-reader__loading-line desktop-doc-reader__loading-line--mid" />
          <span class="desktop-doc-reader__loading-block desktop-doc-reader__loading-block--paragraph" />
        </div>
      </article>

      <div class="desktop-doc-reader__loading-pager">
        <span class="desktop-doc-reader__loading-pager-card" />
        <span class="desktop-doc-reader__loading-pager-card" />
      </div>
    </div>
  </section>

  <section
    v-else-if="doc"
    class="desktop-doc-reader"
  >
    <DesktopDocContent
      :doc="doc"
      :is-favorite="props.isFavorite"
      :highlight-query="highlightQuery"
      :markdown-theme-id="props.markdownThemeId"
      :restore-scroll-top="props.restoreScrollTop"
      :save-doc="props.saveDoc"
      @scroll-top-change="emit('scrollTopChange', $event)"
      @toggle-favorite="emit('toggleFavorite')"
    />
    <DesktopDocPager
      :next-doc="nextDoc"
      :prev-doc="prevDoc"
      @select-doc="emit('selectDoc', $event)"
    />
  </section>

  <section
    v-else
    class="desktop-doc-reader__empty"
  >
    <h2>未加载到文档</h2>
    <p>请从左侧目录中选择一篇文档。</p>
  </section>
</template>

<style scoped>
.desktop-doc-reader {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.desktop-doc-reader__empty {
  display: grid;
  gap: 0.45rem;
  padding: 1.2rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
}

.desktop-doc-reader__loading {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.desktop-doc-reader__loading-shell {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 1rem;
  min-height: 100%;
}

.desktop-doc-reader__loading-article {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface-strong);
  box-shadow: var(--desktop-card-shadow-soft);
}

.desktop-doc-reader__loading-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem 0.76rem;
  border-bottom: 1px solid
    color-mix(in srgb, var(--desktop-line-strong) 44%, var(--desktop-line));
  background: color-mix(
    in srgb,
    var(--desktop-surface-strong) 94%,
    rgba(var(--desktop-accent-rgb), 0.05)
  );
}

.desktop-doc-reader__loading-header-main,
.desktop-doc-reader__loading-meta,
.desktop-doc-reader__loading-body,
.desktop-doc-reader__loading-pager {
  display: grid;
  gap: 0.72rem;
}

.desktop-doc-reader__loading-kicker,
.desktop-doc-reader__loading-title,
.desktop-doc-reader__loading-action,
.desktop-doc-reader__loading-meta-label,
.desktop-doc-reader__loading-meta-value,
.desktop-doc-reader__loading-line,
.desktop-doc-reader__loading-block,
.desktop-doc-reader__loading-pager-card {
  display: block;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(var(--desktop-accent-rgb), 0.08),
    rgba(var(--desktop-accent-rgb), 0.16),
    rgba(var(--desktop-accent-rgb), 0.08)
  );
  background-size: 220% 100%;
  animation: desktop-doc-reader-loading 1.25s linear infinite;
}

.desktop-doc-reader__loading-kicker {
  width: 10rem;
  height: 0.7rem;
}

.desktop-doc-reader__loading-title {
  width: min(26rem, 72%);
  height: 1.45rem;
}

.desktop-doc-reader__loading-action {
  width: 5.4rem;
  height: 2rem;
  border-radius: 0.8rem;
}

.desktop-doc-reader__loading-meta {
  grid-template-columns: 3.2rem minmax(0, 8.6rem);
  align-items: center;
  gap: 0.72rem;
  padding: 0.7rem 1rem 0;
}

.desktop-doc-reader__loading-meta-label {
  width: 100%;
  height: 0.72rem;
}

.desktop-doc-reader__loading-meta-value {
  width: 100%;
  height: 0.84rem;
}

.desktop-doc-reader__loading-line {
  width: 100%;
  height: 0.82rem;
}

.desktop-doc-reader__loading-line--wide {
  width: 92%;
}

.desktop-doc-reader__loading-line--mid {
  width: 84%;
}

.desktop-doc-reader__loading-line--soft {
  width: 78%;
}

.desktop-doc-reader__loading-body {
  align-content: start;
  min-height: 0;
  padding: 1rem;
}

.desktop-doc-reader__loading-block {
  width: 100%;
  border-radius: 1rem;
}

.desktop-doc-reader__loading-block--code {
  height: 10rem;
}

.desktop-doc-reader__loading-block--paragraph {
  height: 8rem;
}

.desktop-doc-reader__loading-pager {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.88rem;
}

.desktop-doc-reader__loading-pager-card {
  height: 5.6rem;
  border-radius: 1rem;
}

@keyframes desktop-doc-reader-loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -40% 0;
  }
}

.desktop-doc-reader__empty h2,
.desktop-doc-reader__empty p {
  margin: 0;
}

.desktop-doc-reader__empty p {
  color: var(--desktop-muted);
}
</style>
