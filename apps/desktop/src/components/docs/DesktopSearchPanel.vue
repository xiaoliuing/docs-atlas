<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { SearchResult } from '@/types/docs'
import DesktopSearchHighlightedText from './DesktopSearchHighlightedText.vue'

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
  submit: [slug?: string]
}>()

const inputRef = useTemplateRef<HTMLInputElement>('input')
const hasResults = computed(() => props.results.length > 0)
const normalizedQuery = computed(() => query.value.trim())

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
    emit('submit', props.results[props.selectedIndex]?.slug)
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
  <div class="desktop-search-panel">
    <label class="desktop-search-panel__field">
      <span class="desktop-search-panel__icon" aria-hidden="true" />
      <input
        ref="input"
        v-model="query"
        class="desktop-search-panel__input"
        placeholder="搜索标题、摘要、正文..."
        type="search"
        @focus="emit('open')"
        @input="onInput"
        @keydown="onKeydown"
      />
      <button
        v-if="query"
        class="desktop-search-panel__clear"
        type="button"
        @click="query = ''; emit('close')"
      >
        清空
      </button>
    </label>

    <div
      v-if="isOpen && query"
      class="desktop-search-panel__results desktop-scroll"
    >
      <div
        v-if="!hasResults"
        class="desktop-search-panel__empty"
      >
        没有匹配结果
      </div>

      <button
        v-for="(result, index) in results"
        :key="result.slug"
        :class="[
          'desktop-search-panel__result',
          {
            'desktop-search-panel__result--active': index === selectedIndex,
          },
        ]"
        type="button"
        @click="emit('submit', result.slug)"
      >
        <span class="desktop-search-panel__result-section">
          <DesktopSearchHighlightedText
            :query="normalizedQuery"
            :text="result.section"
          />
        </span>
        <DesktopSearchHighlightedText
          tag="strong"
          class="desktop-search-panel__result-title"
          :query="normalizedQuery"
          :text="result.title"
        />
        <span class="desktop-search-panel__result-summary">
          <DesktopSearchHighlightedText
            :query="normalizedQuery"
            :text="result.snippet || result.summary"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.desktop-search-panel {
  position: relative;
  min-width: 0;
}

.desktop-search-panel__field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.8rem;
  padding: 0.18rem 0.2rem 0.18rem 0.65rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: var(--desktop-surface-strong);
}

.desktop-search-panel__icon {
  position: relative;
  width: 14px;
  height: 14px;
  border: 1.6px solid var(--desktop-soft);
  border-radius: 999px;
}

.desktop-search-panel__icon::after {
  content: '';
  position: absolute;
  right: -4px;
  bottom: -3px;
  width: 6px;
  height: 1.6px;
  border-radius: 999px;
  background: var(--desktop-soft);
  transform: rotate(45deg);
  transform-origin: center;
}

.desktop-search-panel__input {
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  border: 0;
  background: transparent;
  color: var(--desktop-ink);
  font-size: 0.85rem;
}

.desktop-search-panel__input:focus {
  outline: none;
}

.desktop-search-panel__clear {
  min-height: 2rem;
  padding: 0.38rem 0.68rem;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-ink);
  cursor: pointer;
  font-size: 0.76rem;
}

.desktop-search-panel__results {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  left: 0;
  display: grid;
  gap: 0.35rem;
  max-height: min(58vh, 32rem);
  overflow-y: auto;
  padding: 0.65rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-surface-strong);
  box-shadow: 0 18px 34px rgba(var(--desktop-shadow), 0.12);
  z-index: 20;
}

.desktop-search-panel__empty {
  padding: 0.8rem;
  border-radius: 12px;
  color: var(--desktop-muted);
  background: rgba(var(--desktop-accent-rgb), 0.07);
  font-size: 0.8rem;
}

.desktop-search-panel__result {
  display: grid;
  gap: 0.22rem;
  padding: 0.72rem 0.76rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.desktop-search-panel__result:hover,
.desktop-search-panel__result--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.06);
}

.desktop-search-panel__result-section {
  color: var(--desktop-soft);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-search-panel__result-title {
  color: var(--desktop-ink);
}

.desktop-search-panel__result-summary {
  color: var(--desktop-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

@media (max-width: 960px) {
  .desktop-search-panel__results {
    position: static;
    margin-top: 0.55rem;
  }
}
</style>
