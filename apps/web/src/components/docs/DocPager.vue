<script setup lang="ts">
import type { DocMeta } from '@/types/docs'

defineProps<{
  nextDoc: DocMeta | null
  prevDoc: DocMeta | null
}>()
</script>

<template>
  <nav
    v-if="prevDoc || nextDoc"
    class="doc-pager"
  >
    <RouterLink
      v-if="prevDoc"
      class="doc-pager__card"
      :to="prevDoc.routePath"
    >
      <span class="doc-pager__label">上一篇</span>
      <strong>{{ prevDoc.title }}</strong>
    </RouterLink>

    <span v-else />

    <RouterLink
      v-if="nextDoc"
      class="doc-pager__card doc-pager__card--next"
      :to="nextDoc.routePath"
    >
      <span class="doc-pager__label">下一篇</span>
      <strong>{{ nextDoc.title }}</strong>
    </RouterLink>
  </nav>
</template>

<style scoped>
.doc-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.doc-pager__card {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-line);
  border-radius: 24px;
  background: var(--surface-panel);
  color: var(--color-ink);
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.doc-pager__card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--color-accent-rgb), 0.34);
  box-shadow: var(--shadow-panel);
}

.doc-pager__card--next {
  text-align: right;
}

.doc-pager__label {
  color: var(--color-soft);
  font-size: 0.84rem;
}

@media (max-width: 720px) {
  .doc-pager {
    grid-template-columns: 1fr;
  }
}
</style>
