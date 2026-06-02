<script setup lang="ts">
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail } from '@/types/docs'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopDocEditor from './DesktopDocEditor.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail
    isFavorite?: boolean
    highlightQuery?: string
    markdownThemeId?: DesktopMarkdownThemeId
    saveDoc: (absolutePath: string, markdown: string) => Promise<void>
  }>(),
  {
    isFavorite: false,
    highlightQuery: '',
    markdownThemeId: 'atlas',
  },
)

const emit = defineEmits<{
  toggleFavorite: []
}>()
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
    </header>

    <div class="doc-content__body-shell" :data-markdown-theme="props.markdownThemeId">
      <DesktopDocEditor
        :doc="doc"
        :highlight-query="props.highlightQuery"
        :markdown-theme-id="props.markdownThemeId"
        :save-doc="props.saveDoc"
      />
    </div>
  </article>
</template>

<style scoped>
.doc-content {
  display: grid;
  gap: 0.72rem;
  min-width: 0;
}

.doc-content__header {
  display: grid;
  gap: 0.5rem;
  padding: 0.95rem 1rem;
  border: 1px solid color-mix(in srgb, var(--desktop-line-strong) 48%, var(--desktop-line));
  border-radius: var(--desktop-radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%),
    var(--desktop-surface);
  box-shadow: 0 8px 20px rgba(var(--desktop-shadow), 0.055);
}

.doc-content__header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.doc-content__meta {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.doc-content__section {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.doc-content__source {
  color: var(--desktop-muted);
  font-size: 0.74rem;
  white-space: pre-wrap;
  word-break: break-word;
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

.doc-content__body-shell {
  min-width: 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--desktop-line-strong) 48%, var(--desktop-line));
  border-radius: var(--desktop-radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 18%),
    var(--desktop-surface-strong);
  box-shadow: 0 12px 28px rgba(var(--desktop-shadow), 0.065);
}

.doc-content__body-shell[data-markdown-theme='github'] {
  padding: 1rem;
  background: var(--desktop-surface);
}

.doc-content__body-shell[data-markdown-theme='compact'] {
  padding: 0.62rem 0.72rem;
}

.doc-content__body-shell[data-markdown-theme='reading'] {
  padding: 1.1rem 1.2rem;
}
</style>
