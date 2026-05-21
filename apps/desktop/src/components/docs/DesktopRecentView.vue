<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'

export type DesktopRecentViewEntry = {
  id: string
  openedAt: string
  scrollTop: number
  slug: string
  sourceLabel: string
  summary: string
  title: string
  workspaceId: string
  workspaceName: string
}

const props = defineProps<{
  currentWorkspaceId: string
  currentWorkspaceName: string
  entries: DesktopRecentViewEntry[]
}>()

const emit = defineEmits<{
  backToReader: []
  openEntry: [entryId: string]
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

function formatOpenedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '最近阅读'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
</script>

<template>
  <section class="desktop-recent-view">
    <header class="desktop-recent-view__header">
      <div class="desktop-recent-view__title-wrap">
        <span class="desktop-recent-view__title-mark" aria-hidden="true">
          <DesktopUiIcon name="history" :size="18" />
        </span>
        <div class="desktop-recent-view__title-copy">
          <h2 class="desktop-recent-view__title">最近阅读</h2>
        </div>
      </div>

      <button class="desktop-recent-view__back" type="button" @click="emit('backToReader')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-recent-view__toolbar">
      <div class="desktop-recent-view__filter-group" role="tablist" aria-label="最近阅读范围">
        <button
          :class="['desktop-recent-view__filter', { 'desktop-recent-view__filter--active': filter === 'all' }]"
          type="button"
          @click="filter = 'all'"
        >
          全部
          <span>{{ filterOptions.all }}</span>
        </button>
        <button
          :class="['desktop-recent-view__filter', { 'desktop-recent-view__filter--active': filter === 'workspace' }]"
          type="button"
          @click="filter = 'workspace'"
        >
          当前文档集
          <span>{{ filterOptions.workspace }}</span>
        </button>
      </div>
    </div>

    <div class="desktop-recent-view__body desktop-scroll">
      <div v-if="filteredEntries.length === 0" class="desktop-recent-view__empty">
        <strong>还没有最近阅读记录</strong>
      </div>

      <div v-else class="desktop-recent-view__list">
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="desktop-recent-view__entry"
          type="button"
          @click="emit('openEntry', entry.id)"
        >
          <div class="desktop-recent-view__entry-meta">
            <span class="desktop-recent-view__chip">{{ entry.workspaceName }}</span>
            <span class="desktop-recent-view__chip desktop-recent-view__chip--muted">{{ entry.sourceLabel }}</span>
            <span class="desktop-recent-view__entry-time">{{ formatOpenedAt(entry.openedAt) }}</span>
          </div>

          <strong class="desktop-recent-view__entry-title">{{ entry.title }}</strong>
          <p class="desktop-recent-view__entry-summary">{{ entry.summary }}</p>

          <div class="desktop-recent-view__entry-footer">
            <span class="desktop-recent-view__entry-progress">
              {{ entry.scrollTop > 0 ? `上次滚动到 ${entry.scrollTop}px` : '从文档顶部开始阅读' }}
            </span>
            <span class="desktop-recent-view__entry-action">
              继续阅读
              <DesktopUiIcon name="chevron-right" :size="14" />
            </span>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.desktop-recent-view {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 0.95rem;
  min-height: 0;
  height: 100%;
}

.desktop-recent-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0.05rem 0;
}

.desktop-recent-view__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.desktop-recent-view__title-mark {
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

.desktop-recent-view__title-copy {
  display: grid;
  min-width: 0;
}

.desktop-recent-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.24rem;
  font-weight: 680;
}

.desktop-recent-view__back {
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

.desktop-recent-view__back:hover {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-recent-view__back span {
  font-size: 0.78rem;
  font-weight: 600;
}

.desktop-recent-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.desktop-recent-view__filter-group {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.3rem;
  padding: 0.24rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

.desktop-recent-view__filter {
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

.desktop-recent-view__filter span {
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

.desktop-recent-view__filter--active {
  background: var(--desktop-surface-strong);
  color: var(--desktop-accent);
  box-shadow:
    inset 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.12),
    0 6px 16px rgba(var(--desktop-shadow), 0.08);
}

.desktop-recent-view__body {
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.desktop-recent-view__list {
  display: grid;
  gap: 0.72rem;
}

.desktop-recent-view__entry {
  display: grid;
  gap: 0.48rem;
  width: 100%;
  padding: 1rem 1rem 0.95rem;
  border: 1px solid var(--desktop-line);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 36%),
    var(--desktop-surface-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-recent-view__entry:hover {
  border-color: var(--desktop-line-strong);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.08), transparent 38%),
    var(--desktop-surface-strong);
  transform: translateY(-1px);
}

.desktop-recent-view__entry-meta,
.desktop-recent-view__entry-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.desktop-recent-view__chip {
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

.desktop-recent-view__chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-recent-view__entry-time,
.desktop-recent-view__entry-progress {
  color: var(--desktop-soft);
  font-size: 0.7rem;
}

.desktop-recent-view__entry-title {
  color: var(--desktop-ink);
  font-size: 1rem;
  font-weight: 660;
}

.desktop-recent-view__entry-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.82rem;
  line-height: 1.58;
}

.desktop-recent-view__entry-footer {
  justify-content: space-between;
}

.desktop-recent-view__entry-action {
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  color: var(--desktop-accent);
  font-size: 0.74rem;
  font-weight: 600;
}

.desktop-recent-view__empty {
  display: grid;
  gap: 0.35rem;
  padding: 1.2rem 1.1rem;
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 18px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-recent-view__empty strong {
  color: var(--desktop-ink);
  font-size: 0.9rem;
}

.desktop-recent-view__empty p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .desktop-recent-view__header,
  .desktop-recent-view__entry-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
