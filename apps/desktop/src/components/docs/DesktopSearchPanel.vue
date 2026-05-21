<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import type { DesktopSearchFilterOption, DesktopSearchScope } from '@/composables/useDesktopDocsSearch'
import type { SearchResult } from '@/types/docs'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopSearchHighlightedText from './DesktopSearchHighlightedText.vue'

const query = defineModel<string>({ default: '' })

const props = defineProps<{
  activeSourceFilterLabel: string
  activeWorkspaceFilterLabel: string
  results: SearchResult[]
  scope: DesktopSearchScope
  selectedIndex: number
  sourceFilter: string
  sourceOptions: DesktopSearchFilterOption[]
  workspaceName: string
  workspaceFilter: string
  workspaceOptions: DesktopSearchFilterOption[]
}>()

const emit = defineEmits<{
  close: []
  moveSelection: [direction: 1 | -1]
  setSourceFilter: [sourceKey: string]
  setScope: [scope: DesktopSearchScope]
  submit: [slug?: string]
  setWorkspaceFilter: [workspaceId: string]
}>()

const inputRef = useTemplateRef<HTMLInputElement>('input')
const hasResults = computed(() => props.results.length > 0)
const normalizedQuery = computed(() => query.value.trim())
const scopeLabel = computed(() => (props.scope === 'workspace' ? `当前文档仓库 · ${props.workspaceName}` : '全局搜索'))
const showWorkspaceFilter = computed(() => props.scope === 'global' && props.workspaceOptions.length > 1)
const showSourceFilter = computed(() => props.sourceOptions.length > 1)
const matchFieldLabelMap: Record<SearchResult['matchField'], string> = {
  body: '正文命中',
  heading: '目录命中',
  section: '目录分类命中',
  summary: '摘要命中',
  title: '标题命中',
}

function getMatchFieldLabel(field: SearchResult['matchField']) {
  return matchFieldLabelMap[field]
}

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
          <DesktopUiIcon name="search" :size="16" />
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
          aria-label="清空搜索关键词"
          class="desktop-search-panel__clear"
          type="button"
          @click="query = ''"
        >
          <DesktopUiIcon name="close" :size="14" />
        </button>
      </label>

      <div
        class="desktop-search-panel__scope-switch"
        role="tablist"
        aria-label="搜索范围"
      >
        <button
          :class="[
            'desktop-search-panel__scope-option',
            { 'desktop-search-panel__scope-option--active': props.scope === 'global' },
          ]"
          role="tab"
          :aria-selected="props.scope === 'global'"
          type="button"
          @click="emit('setScope', 'global')"
        >
          全局
        </button>
        <button
          :class="[
            'desktop-search-panel__scope-option',
            { 'desktop-search-panel__scope-option--active': props.scope === 'workspace' },
          ]"
          role="tab"
          :aria-selected="props.scope === 'workspace'"
          type="button"
          @click="emit('setScope', 'workspace')"
        >
          当前文档仓库
        </button>
      </div>
    </div>

    <div class="desktop-search-panel__meta">
      <div class="desktop-search-panel__meta-start">
        <span class="desktop-search-panel__scope-chip">{{ scopeLabel }}</span>
        <span
          v-if="showWorkspaceFilter"
          class="desktop-search-panel__scope-chip desktop-search-panel__scope-chip--muted"
        >
          {{ props.activeWorkspaceFilterLabel }}
        </span>
        <span
          v-if="showSourceFilter"
          class="desktop-search-panel__scope-chip desktop-search-panel__scope-chip--muted"
        >
          {{ props.activeSourceFilterLabel }}
        </span>
      </div>
      <span class="desktop-search-panel__count">
        {{ normalizedQuery ? `${props.results.length} 条结果` : '输入关键词开始搜索' }}
      </span>
    </div>

    <div
      v-if="showWorkspaceFilter || showSourceFilter"
      class="desktop-search-panel__filters"
    >
      <label
        v-if="showWorkspaceFilter"
        class="desktop-search-panel__filter"
      >
        <span class="desktop-search-panel__filter-label">文档仓库</span>
        <span class="desktop-search-panel__select-wrap">
          <select
            class="desktop-search-panel__select"
            :value="props.workspaceFilter"
            @change="emit('setWorkspaceFilter', String(($event.target as HTMLSelectElement).value))"
          >
            <option value="all">全部文档仓库</option>
            <option
              v-for="option in props.workspaceOptions"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }} · {{ option.count }}
            </option>
          </select>
          <span class="desktop-search-panel__select-icon" aria-hidden="true">
            <DesktopUiIcon name="chevron-down" :size="14" />
          </span>
        </span>
      </label>

      <label
        v-if="showSourceFilter"
        class="desktop-search-panel__filter"
      >
        <span class="desktop-search-panel__filter-label">文档源</span>
        <span class="desktop-search-panel__select-wrap">
          <select
            class="desktop-search-panel__select"
            :value="props.sourceFilter"
            @change="emit('setSourceFilter', String(($event.target as HTMLSelectElement).value))"
          >
            <option value="all">全部文档源</option>
            <option
              v-for="option in props.sourceOptions"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}{{ option.helper ? ` · ${option.helper}` : '' }} · {{ option.count }}
            </option>
          </select>
          <span class="desktop-search-panel__select-icon" aria-hidden="true">
            <DesktopUiIcon name="chevron-down" :size="14" />
          </span>
        </span>
      </label>
    </div>

    <div class="desktop-search-panel__results desktop-scroll">
      <div
        v-if="!normalizedQuery"
        class="desktop-search-panel__empty"
      >
        默认会检索标题、摘要、目录和正文内容。你也可以先切换文档仓库或文档源范围。
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
          <div class="desktop-search-panel__result-meta">
            <span
              v-if="result.workspaceName"
              class="desktop-search-panel__result-chip"
            >
              <DesktopSearchHighlightedText
                :query="normalizedQuery"
                :text="result.workspaceName"
              />
            </span>
            <span
              v-if="result.sourceLabel"
              class="desktop-search-panel__result-chip desktop-search-panel__result-chip--muted"
            >
              <DesktopSearchHighlightedText
                :query="normalizedQuery"
                :text="result.sourceLabel"
              />
            </span>
          </div>
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
          <div class="desktop-search-panel__result-footer">
            <span class="desktop-search-panel__result-section">
              <DesktopSearchHighlightedText
                :query="normalizedQuery"
                :text="result.sectionTitle || result.section"
              />
            </span>
            <span class="desktop-search-panel__result-match">
              {{ getMatchFieldLabel(result.matchField) }}
            </span>
          </div>
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
  background: var(--desktop-field-bg);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.desktop-search-panel__field:focus-within {
  border-color: rgba(var(--desktop-accent-rgb), 0.34);
  box-shadow:
    0 0 0 1px rgba(var(--desktop-accent-rgb), 0.18),
    0 10px 24px rgba(var(--desktop-shadow), 0.08);
  background: var(--desktop-field-bg-strong);
}

.desktop-search-panel__field:focus-within .desktop-search-panel__field-icon,
.desktop-search-panel__field:focus-within .desktop-search-panel__clear {
  color: var(--desktop-accent);
}

.desktop-search-panel__field-icon {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  color: var(--desktop-soft);
}

.desktop-search-panel__input {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  min-width: 0;
  min-height: 2.2rem;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--desktop-ink);
  font-size: 0.92rem;
}

.desktop-search-panel__input:focus {
  outline: none;
  box-shadow: none;
}

.desktop-search-panel__input::-webkit-search-decoration,
.desktop-search-panel__input::-webkit-search-cancel-button,
.desktop-search-panel__input::-webkit-search-results-button,
.desktop-search-panel__input::-webkit-search-results-decoration {
  -webkit-appearance: none;
}

.desktop-search-panel__clear,
.desktop-search-panel__scope-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.desktop-search-panel__clear {
  width: 2.15rem;
  min-height: 2.15rem;
  padding: 0;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-ink);
}

.desktop-search-panel__scope-switch {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  padding: 0.2rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  min-height: 2.9rem;
}

.desktop-search-panel__scope-option {
  position: relative;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0.38rem 0.9rem;
  border-radius: 999px;
  background: transparent;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.desktop-search-panel__scope-option--active {
  background: var(--desktop-surface-strong);
  color: var(--desktop-accent);
  box-shadow:
    inset 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.12),
    0 6px 16px rgba(var(--desktop-shadow), 0.08);
}

.desktop-search-panel__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.desktop-search-panel__meta-start {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
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

.desktop-search-panel__scope-chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-search-panel__count {
  color: var(--desktop-soft);
  font-size: 0.76rem;
}

.desktop-search-panel__filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.desktop-search-panel__filter {
  display: grid;
  gap: 0.28rem;
  min-width: 0;
}

.desktop-search-panel__filter-label {
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 600;
}

.desktop-search-panel__select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.desktop-search-panel__select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  min-height: 2.55rem;
  padding: 0.48rem 2.1rem 0.48rem 0.82rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: var(--desktop-field-bg);
  color: var(--desktop-ink);
  font-size: 0.8rem;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.desktop-search-panel__select:focus {
  border-color: rgba(var(--desktop-accent-rgb), 0.34);
  box-shadow: 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.14);
  background: var(--desktop-field-bg-strong);
}

.desktop-search-panel__select-icon {
  position: absolute;
  right: 0.72rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--desktop-soft);
  pointer-events: none;
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
  gap: 0.36rem;
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

.desktop-search-panel__result-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.38rem;
}

.desktop-search-panel__result-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  padding: 0.16rem 0.48rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.67rem;
  font-weight: 600;
}

.desktop-search-panel__result-chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-search-panel__result-section {
  color: var(--desktop-soft);
  font-size: 0.68rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.desktop-search-panel__result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.desktop-search-panel__result-match {
  flex: none;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 600;
}

@media (max-width: 720px) {
  .desktop-search-panel__header,
  .desktop-search-panel__filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .desktop-search-panel__meta,
  .desktop-search-panel__result-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

</style>
