<script setup lang="ts">
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail, DocMeta } from '@/types/docs'
import DesktopDocContent from './DesktopDocContent.vue'
import DesktopDocPager from './DesktopDocPager.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail | null
    highlightQuery: string
    isFavorite?: boolean
    markdownThemeId?: DesktopMarkdownThemeId
    nextDoc: DocMeta | null
    prevDoc: DocMeta | null
    restoreScrollTop?: number
    saveDoc: (absolutePath: string, markdown: string) => Promise<void>
  }>(),
  {
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
    v-if="doc"
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

.desktop-doc-reader__empty h2,
.desktop-doc-reader__empty p {
  margin: 0;
}

.desktop-doc-reader__empty p {
  color: var(--desktop-muted);
}
</style>
