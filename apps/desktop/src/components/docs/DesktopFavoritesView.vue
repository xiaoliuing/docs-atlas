<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'

export type DesktopFavoriteViewEntry = {
  id: string
  savedAt: string
  slug: string
  sourceLabel: string
  summary: string
  title: string
  workspaceId: string
  workspaceName: string
}

const props = defineProps<{
  currentWorkspaceId: string
  entries: DesktopFavoriteViewEntry[]
}>()

const emit = defineEmits<{
  backToReader: []
  openEntry: [entryId: string]
  removeEntry: [entryId: string]
}>()

const filter = shallowRef<'all' | 'workspace'>('all')

const filteredEntries = computed(() =>
  filter.value === 'workspace'
    ? props.entries.filter((entry) => entry.workspaceId === props.currentWorkspaceId)
    : props.entries,
)

const filterOptions = computed(() => {
  const workspaceCount = props.entries.filter((entry) => entry.workspaceId === props.currentWorkspaceId).length
  return {
    all: props.entries.length,
    workspace: workspaceCount,
  }
})

function formatSavedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '已收藏'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
</script>

<template>
  <section class="desktop-favorites-view">
    <header class="desktop-favorites-view__header">
      <div class="desktop-favorites-view__title-wrap">
        <span class="desktop-favorites-view__title-mark" aria-hidden="true">
          <DesktopUiIcon name="bookmark" :size="18" />
        </span>
        <div class="desktop-favorites-view__title-copy">
          <h2 class="desktop-favorites-view__title">收藏</h2>
          <p class="desktop-favorites-view__summary">把跨工作区的重要文档固定下来，后续可以直接回到关键设计文档和教程。</p>
        </div>
      </div>

      <button class="desktop-favorites-view__back" type="button" @click="emit('backToReader')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-favorites-view__toolbar">
      <div class="desktop-favorites-view__filter-group" role="tablist" aria-label="收藏范围">
        <button
          :class="['desktop-favorites-view__filter', { 'desktop-favorites-view__filter--active': filter === 'all' }]"
          type="button"
          @click="filter = 'all'"
        >
          全部
          <span>{{ filterOptions.all }}</span>
        </button>
        <button
          :class="['desktop-favorites-view__filter', { 'desktop-favorites-view__filter--active': filter === 'workspace' }]"
          type="button"
          @click="filter = 'workspace'"
        >
          当前工作区
          <span>{{ filterOptions.workspace }}</span>
        </button>
      </div>
    </div>

    <div class="desktop-favorites-view__body desktop-scroll">
      <div v-if="filteredEntries.length === 0" class="desktop-favorites-view__empty">
        <strong>还没有收藏文档</strong>
        <p>在文章头部点一下收藏按钮，就能把关键文档固定到这里。</p>
      </div>

      <div v-else class="desktop-favorites-view__list">
        <article
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="desktop-favorites-view__entry"
        >
          <button
            class="desktop-favorites-view__entry-main"
            type="button"
            @click="emit('openEntry', entry.id)"
          >
            <div class="desktop-favorites-view__entry-meta">
              <span class="desktop-favorites-view__chip">{{ entry.workspaceName }}</span>
              <span class="desktop-favorites-view__chip desktop-favorites-view__chip--muted">{{ entry.sourceLabel }}</span>
              <span class="desktop-favorites-view__entry-time">{{ formatSavedAt(entry.savedAt) }}</span>
            </div>

            <strong class="desktop-favorites-view__entry-title">{{ entry.title }}</strong>
            <p class="desktop-favorites-view__entry-summary">{{ entry.summary }}</p>
          </button>

          <div class="desktop-favorites-view__entry-actions">
            <button class="desktop-favorites-view__secondary" type="button" @click="emit('openEntry', entry.id)">
              继续阅读
            </button>
            <button class="desktop-favorites-view__secondary" type="button" @click="emit('removeEntry', entry.id)">
              取消收藏
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.desktop-favorites-view {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0.95rem;
  min-height: 0;
  height: 100%;
}

.desktop-favorites-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0.05rem 0;
}

.desktop-favorites-view__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.desktop-favorites-view__title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.14), rgba(var(--desktop-accent-rgb), 0.05)),
    var(--desktop-surface-strong);
  color: var(--desktop-accent);
}

.desktop-favorites-view__title-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.desktop-favorites-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.24rem;
  font-weight: 680;
}

.desktop-favorites-view__summary {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.78rem;
  line-height: 1.52;
}

.desktop-favorites-view__back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.72rem 0.88rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-favorites-view__back:hover {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-favorites-view__back span {
  font-size: 0.78rem;
  font-weight: 600;
}

.desktop-favorites-view__toolbar {
  display: flex;
  align-items: center;
}

.desktop-favorites-view__filter-group {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.3rem;
  padding: 0.24rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

.desktop-favorites-view__filter {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.15rem;
  padding: 0.36rem 0.82rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-favorites-view__filter span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  min-height: 1.25rem;
  padding: 0 0.22rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  font-size: 0.68rem;
}

.desktop-favorites-view__filter--active {
  background: var(--desktop-surface-strong);
  color: var(--desktop-accent);
  box-shadow:
    inset 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.12),
    0 6px 16px rgba(var(--desktop-shadow), 0.08);
}

.desktop-favorites-view__body {
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.desktop-favorites-view__list {
  display: grid;
  gap: 0.72rem;
}

.desktop-favorites-view__entry {
  display: grid;
  gap: 0.6rem;
  padding: 1rem 1rem 0.95rem;
  border: 1px solid var(--desktop-line);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 36%),
    var(--desktop-surface-strong);
}

.desktop-favorites-view__entry-main {
  display: grid;
  gap: 0.48rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.desktop-favorites-view__entry-meta,
.desktop-favorites-view__entry-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.desktop-favorites-view__chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.52rem;
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.68rem;
  font-weight: 600;
}

.desktop-favorites-view__chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-favorites-view__entry-time {
  color: var(--desktop-soft);
  font-size: 0.7rem;
}

.desktop-favorites-view__entry-title {
  color: var(--desktop-ink);
  font-size: 1rem;
  font-weight: 660;
}

.desktop-favorites-view__entry-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.82rem;
  line-height: 1.58;
}

.desktop-favorites-view__secondary {
  display: inline-flex;
  align-items: center;
  min-height: 1.95rem;
  padding: 0.32rem 0.76rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-favorites-view__empty {
  display: grid;
  gap: 0.35rem;
  padding: 1.2rem 1.1rem;
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 18px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-favorites-view__empty strong {
  color: var(--desktop-ink);
  font-size: 0.9rem;
}

.desktop-favorites-view__empty p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .desktop-favorites-view__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
