<script setup lang="ts">
import type { DocMeta } from '@/types/docs'

defineProps<{
  nextDoc: DocMeta | null
  prevDoc: DocMeta | null
}>()

const emit = defineEmits<{
  selectDoc: [slug: string]
}>()
</script>

<template>
  <nav
    v-if="prevDoc || nextDoc"
    class="doc-pager"
  >
    <button
      v-if="prevDoc"
      class="doc-pager__card"
      type="button"
      @click="emit('selectDoc', prevDoc.slug)"
    >
      <span class="doc-pager__label">上一篇</span>
      <strong>{{ prevDoc.title }}</strong>
    </button>

    <span v-else />

    <button
      v-if="nextDoc"
      class="doc-pager__card doc-pager__card--next"
      type="button"
      @click="emit('selectDoc', nextDoc.slug)"
    >
      <span class="doc-pager__label">下一篇</span>
      <strong>{{ nextDoc.title }}</strong>
    </button>
  </nav>
</template>

<style scoped>
.doc-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.doc-pager__card {
  display: grid;
  gap: 0.35rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
  color: var(--desktop-ink);
  text-align: left;
  cursor: pointer;
}

.doc-pager__card:hover {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.05);
}

.doc-pager__card--next {
  text-align: right;
}

.doc-pager__label {
  color: var(--desktop-soft);
  font-size: 0.84rem;
}

@media (max-width: 720px) {
  .doc-pager {
    grid-template-columns: 1fr;
  }
}
</style>
