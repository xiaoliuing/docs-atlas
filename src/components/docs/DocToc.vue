<script setup lang="ts">
import type { DocHeading } from '@/types/docs'

defineProps<{
  activeId: string
  headings: DocHeading[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <aside
    v-if="headings.length"
    class="doc-toc"
  >
    <div class="doc-toc__inner scroll-shell">
      <p class="doc-toc__eyebrow">
        On This Page
      </p>

      <button
        v-for="heading in headings"
        :key="heading.id"
        :class="[
          'doc-toc__link',
          `doc-toc__link--level-${heading.level}`,
          { 'doc-toc__link--active': heading.id === activeId },
        ]"
        type="button"
        @click="emit('select', heading.id)"
      >
        {{ heading.text }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.doc-toc {
  position: sticky;
  top: 104px;
}

.doc-toc__inner {
  display: grid;
  gap: 0.45rem;
  max-height: calc(100vh - 124px);
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid var(--color-line);
  border-radius: 26px;
  background: var(--surface-panel);
  box-shadow: var(--shadow-panel);
}

.doc-toc__eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--color-soft);
}

.doc-toc__link {
  border: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 14px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: var(--color-muted);
  cursor: pointer;
}

.doc-toc__link--active {
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-ink);
}

.doc-toc__link--level-3 {
  margin-left: 0.75rem;
  font-size: 0.94rem;
}

@media (max-width: 1180px) {
  .doc-toc {
    display: none;
  }
}
</style>
