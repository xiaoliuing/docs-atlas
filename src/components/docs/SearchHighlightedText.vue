<script setup lang="ts">
import { computed } from 'vue'
import { splitHighlightedText } from '@/utils/search'

const props = withDefaults(
  defineProps<{
    query: string
    tag?: string
    text: string
  }>(),
  {
    tag: 'span',
  },
)

const parts = computed(() => splitHighlightedText(props.text, props.query))
</script>

<template>
  <component :is="tag">
    <template
      v-for="(part, index) in parts"
      :key="`${index}-${part.text}`"
    >
      <mark
        v-if="part.isMatch"
        class="search-highlighted-text__mark"
      >
        {{ part.text }}
      </mark>
      <template v-else>
        {{ part.text }}
      </template>
    </template>
  </component>
</template>

<style scoped>
.search-highlighted-text__mark {
  padding: 0 0.15em;
  border-radius: 0.32em;
  background: rgba(var(--color-accent-rgb), 0.18);
  color: var(--color-accent-deep);
  box-shadow: inset 0 -1px 0 rgba(var(--color-accent-rgb), 0.14);
}
</style>
