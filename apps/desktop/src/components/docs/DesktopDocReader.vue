<script setup lang="ts">
import type { DocDetail, DocMeta } from '@/types/docs'
import DesktopDocContent from './DesktopDocContent.vue'
import DesktopDocPager from './DesktopDocPager.vue'

defineProps<{
  doc: DocDetail | null
  highlightQuery: string
  nextDoc: DocMeta | null
  prevDoc: DocMeta | null
}>()

const emit = defineEmits<{
  selectDoc: [slug: string]
}>()
</script>

<template>
  <section
    v-if="doc"
    class="desktop-doc-reader"
  >
    <div
      id="desktop-doc-scroll"
      class="desktop-doc-reader__scroll desktop-scroll"
    >
      <DesktopDocContent
        :doc="doc"
        :highlight-query="highlightQuery"
      />
      <DesktopDocPager
        :next-doc="nextDoc"
        :prev-doc="prevDoc"
        @select-doc="emit('selectDoc', $event)"
      />
    </div>
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
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.desktop-doc-reader__scroll {
  display: grid;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.15rem;
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
