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
  gap: 0.22rem;
  max-height: calc(100vh - 124px);
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: 16px;
  background: var(--surface-panel);
  box-shadow: 0 10px 24px rgba(var(--theme-shadow-rgb), 0.08);
}

.doc-toc__eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.69rem;
  font-weight: 600;
  color: var(--color-soft);
}

.doc-toc__link {
  border: 0;
  padding: 0.34rem 0.58rem;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.82rem;
  line-height: 1.35;
}

.doc-toc__link--active {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent-deep);
}

.doc-toc__link--level-3 {
  margin-left: 0.62rem;
  padding-left: 0.8rem;
  font-size: 0.79rem;
}

@media (max-width: 1180px) {
  .doc-toc {
    display: none;
  }
}
</style>
