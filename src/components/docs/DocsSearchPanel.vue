<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { SearchResult } from '@/types/docs'

const query = defineModel<string>({ default: '' })

const props = defineProps<{
  isOpen: boolean
  results: SearchResult[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  close: []
  moveSelection: [direction: 1 | -1]
  open: []
  submit: [routePath?: string]
}>()

const inputRef = useTemplateRef<HTMLInputElement>('input')

const hasResults = computed(() => props.results.length > 0)

function onInput() {
  emit('open')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    emit('moveSelection', 1)
    emit('open')
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    emit('moveSelection', -1)
    emit('open')
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    emit('submit', props.results[props.selectedIndex]?.routePath)
    return
  }

  if (event.key === 'Escape') {
    emit('close')
    inputRef.value?.blur()
  }
}

function focusInput() {
  inputRef.value?.focus()
}

defineExpose({
  focusInput,
})
</script>

<template>
  <div class="search-panel">
    <label class="search-panel__field">
      <span class="search-panel__prefix">Search</span>
      <input
        ref="input"
        v-model="query"
        class="search-panel__input"
        placeholder="搜索标题、摘要、正文..."
        type="search"
        @focus="emit('open')"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button
        v-if="query"
        class="search-panel__clear"
        type="button"
        @click="query = ''; emit('close')"
      >
        清空
      </button>
    </label>

    <div
      v-if="isOpen && query"
      class="search-panel__results"
    >
      <div
        v-if="!hasResults"
        class="search-panel__empty"
      >
        没有匹配结果
      </div>

      <button
        v-for="(result, index) in results"
        :key="result.slug"
        :class="['search-panel__result', { 'search-panel__result--active': index === selectedIndex }]"
        type="button"
        @click="emit('submit', result.routePath)"
      >
        <span class="search-panel__result-section">{{ result.section }}</span>
        <strong class="search-panel__result-title">{{ result.title }}</strong>
        <span class="search-panel__result-summary">{{ result.summary }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  position: relative;
}

.search-panel {
  min-width: 0;
}

.search-panel__field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.45rem;
  padding: 0.25rem 0.3rem 0.25rem 0.85rem;
  border-radius: 24px;
  border: 1px solid var(--color-line);
  background: var(--surface-card-strong);
  box-shadow: var(--shadow-panel);
}

.search-panel__prefix {
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-soft);
}

.search-panel__input {
  width: 100%;
  min-width: 0;
  min-height: 2.5rem;
  border: 0;
  background: transparent;
  font: inherit;
  line-height: 1.2;
  color: var(--color-ink);
}

.search-panel__input:focus {
  outline: none;
}

.search-panel__clear {
  border: 0;
  border-radius: 999px;
  min-height: 2.5rem;
  padding: 0.55rem 0.85rem;
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-ink);
  font: inherit;
  cursor: pointer;
}

.search-panel__results {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  left: 0;
  display: grid;
  gap: 0.45rem;
  max-height: min(60vh, 34rem);
  overflow-y: auto;
  padding: 0.8rem;
  border: 1px solid var(--color-line);
  border-radius: 24px;
  background: var(--surface-panel);
  box-shadow: var(--shadow-panel);
}

.search-panel__empty {
  padding: 1rem;
  border-radius: 18px;
  color: var(--color-muted);
  background: rgba(var(--color-accent-rgb), 0.08);
}

.search-panel__result {
  display: grid;
  gap: 0.35rem;
  padding: 0.95rem 1rem;
  border: 0;
  border-radius: 18px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.16s ease, transform 0.16s ease;
}

.search-panel__result:hover,
.search-panel__result--active {
  background: rgba(var(--color-accent-rgb), 0.1);
  transform: translateY(-1px);
}

.search-panel__result-section {
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-soft);
}

.search-panel__result-title {
  color: var(--color-ink);
}

.search-panel__result-summary {
  color: var(--color-muted);
  font-size: 0.95rem;
}

@media (max-width: 960px) {
  .search-panel {
    width: 100%;
  }

  .search-panel__field {
    grid-template-columns: 1fr auto;
    gap: 0.6rem;
    min-height: 3.25rem;
    padding: 0.3rem 0.35rem 0.3rem 0.8rem;
  }

  .search-panel__prefix {
    display: none;
  }

  .search-panel__input {
    min-height: 2.65rem;
    font-size: 1rem;
  }

  .search-panel__results {
    position: static;
    margin-top: 0.65rem;
    max-height: min(50vh, 26rem);
  }

  .search-panel__result {
    min-height: 44px;
  }
}

@media (max-width: 640px) {
  .search-panel__field {
    padding-left: 0.7rem;
  }

  .search-panel__clear {
    padding-inline: 0.75rem;
  }

  .search-panel__results {
    padding: 0.65rem;
  }
}
</style>
