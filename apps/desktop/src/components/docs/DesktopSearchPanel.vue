<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import type { DesktopSearchScope } from '@/composables/useDesktopDocsSearch'
import type { SearchResult } from '@/types/docs'
import DesktopSearchHighlightedText from './DesktopSearchHighlightedText.vue'

const query = defineModel<string>({ default: '' })

const props = defineProps<{
  results: SearchResult[]
  scope: DesktopSearchScope
  selectedIndex: number
  workspaceName: string
}>()

const emit = defineEmits<{
  close: []
  moveSelection: [direction: 1 | -1]
  submit: [slug?: string]
  toggleScope: []
}>()

const inputRef = useTemplateRef<HTMLInputElement>('input')
const hasResults = computed(() => props.results.length > 0)
const normalizedQuery = computed(() => query.value.trim())
const scopeLabel = computed(() => (props.scope === 'workspace' ? `当前工作区 · ${props.workspaceName}` : '全局搜索'))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    emit('moveSelection', 1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    emit('moveSelection', -1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    emit('submit', props.results[props.selectedIndex]?.slug)
    return
  }

  if (event.key === 'Escape') {
    emit('close')
  }
}

function focusInput() {
  inputRef.value?.focus()
}

onMounted(() => {
  focusInput()
})

defineExpose({
  focusInput,
})
</script>

<template>
  <section
    class="desktop-search-panel"
    @click.stop
  >
    <div class="desktop-search-panel__header">
      <label class="desktop-search-panel__field">
        <span class="desktop-search-panel__field-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <path d="M16 16L20.5 20.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          </svg>
        </span>
        <input
          ref="input"
          v-model="query"
          class="desktop-search-panel__input"
          placeholder="搜索标题、摘要、正文..."
          type="search"
          @keydown="onKeydown"
        />
        <button
          v-if="query"
          class="desktop-search-panel__clear"
          type="button"
          @click="query = ''"
        >
          清空
        </button>
      </label>

      <button
        :aria-label="props.scope === 'global' ? '切换为当前工作区搜索' : '切换为全局搜索'"
        :class="[
          'desktop-search-panel__scope-button',
          { 'desktop-search-panel__scope-button--active': props.scope === 'workspace' },
        ]"
        type="button"
        @click="emit('toggleScope')"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 7H19" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          <path d="M8 12H16" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          <path d="M10 17H14" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          <circle cx="8" cy="7" r="1.8" fill="currentColor" />
          <circle cx="16" cy="12" r="1.8" fill="currentColor" />
          <circle cx="10" cy="17" r="1.8" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div class="desktop-search-panel__meta">
      <span class="desktop-search-panel__scope-chip">{{ scopeLabel }}</span>
      <span class="desktop-search-panel__count">
        {{ normalizedQuery ? `${props.results.length} 条结果` : '输入关键词开始搜索' }}
      </span>
    </div>

    <div class="desktop-search-panel__results desktop-scroll">
      <div
        v-if="!normalizedQuery"
        class="desktop-search-panel__empty"
      >
        默认会检索标题、摘要、目录和正文内容。
      </div>

      <div
        v-else-if="!hasResults"
        class="desktop-search-panel__empty"
      >
        没有匹配结果
      </div>

      <template v-else>
        <button
          v-for="(result, index) in props.results"
          :key="result.slug"
          :class="[
            'desktop-search-panel__result',
            {
              'desktop-search-panel__result--active': index === props.selectedIndex,
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
      </template>
    </div>
  </section>
</template>

<style scoped>
.desktop-search-panel {
  display: grid;
  gap: 0.8rem;
  width: min(38rem, calc(100vw - 2rem));
  padding: 0.95rem;
  border: 1px solid var(--desktop-line);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.04), transparent 32%),
    var(--desktop-surface-strong);
  box-shadow: 0 26px 64px rgba(var(--desktop-shadow), 0.18);
}

.desktop-search-panel__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
}

.desktop-search-panel__field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 3rem;
  padding: 0.2rem 0.24rem 0.2rem 0.72rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.64);
}

.desktop-search-panel__field-icon {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  color: var(--desktop-soft);
}

.desktop-search-panel__field-icon svg,
.desktop-search-panel__scope-button svg {
  width: 100%;
  height: 100%;
}

.desktop-search-panel__input {
  width: 100%;
  min-width: 0;
  min-height: 2.2rem;
  border: 0;
  background: transparent;
  color: var(--desktop-ink);
  font-size: 0.92rem;
}

.desktop-search-panel__input:focus {
  outline: none;
}

.desktop-search-panel__clear,
.desktop-search-panel__scope-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.desktop-search-panel__clear {
  min-height: 2.15rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-ink);
  font-size: 0.76rem;
}

.desktop-search-panel__scope-button {
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 14px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-muted);
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.desktop-search-panel__scope-button:hover,
.desktop-search-panel__scope-button--active {
  background: rgba(var(--desktop-accent-rgb), 0.14);
  color: var(--desktop-accent);
  transform: translateY(-1px);
}

.desktop-search-panel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.desktop-search-panel__scope-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.8rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.74rem;
  font-weight: 600;
}

.desktop-search-panel__count {
  color: var(--desktop-soft);
  font-size: 0.76rem;
}

.desktop-search-panel__results {
  display: grid;
  gap: 0.4rem;
  max-height: min(56vh, 30rem);
  overflow-y: auto;
  padding-right: 0.15rem;
}

.desktop-search-panel__empty {
  padding: 1rem 0.9rem;
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 14px;
  color: var(--desktop-muted);
  background: rgba(var(--desktop-accent-rgb), 0.04);
  font-size: 0.82rem;
}

.desktop-search-panel__result {
  display: grid;
  gap: 0.26rem;
  padding: 0.8rem 0.84rem;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-search-panel__result:hover,
.desktop-search-panel__result--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.06);
  transform: translateY(-1px);
}

.desktop-search-panel__result-section {
  color: var(--desktop-soft);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-search-panel__result-title {
  color: var(--desktop-ink);
  font-size: 0.9rem;
}

.desktop-search-panel__result-summary {
  color: var(--desktop-muted);
  font-size: 0.79rem;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .desktop-search-panel__field {
    background: rgba(14, 22, 36, 0.86);
  }
}
</style>
