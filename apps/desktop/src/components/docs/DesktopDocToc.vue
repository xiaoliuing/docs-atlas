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
    <div class="doc-toc__inner desktop-scroll">
      <p class="doc-toc__eyebrow">Outline</p>

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
  height: 100%;
}

.doc-toc__inner {
  display: grid;
  gap: 0.22rem;
  height: 100%;
  overflow-y: auto;
  padding: 0.85rem 0.9rem;
}

.doc-toc__eyebrow {
  margin: 0 0 0.3rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--desktop-soft);
}

.doc-toc__link {
  border: 0;
  padding: 0.3rem 0.48rem;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  color: var(--desktop-muted);
  cursor: pointer;
  font-size: 0.76rem;
  line-height: 1.35;
}

.doc-toc__link--active {
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-accent);
}

.doc-toc__link--level-3 {
  margin-left: 0.5rem;
  padding-left: 0.7rem;
  font-size: 0.74rem;
}
</style>
