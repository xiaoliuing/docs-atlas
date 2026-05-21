<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
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
  entries: DesktopRecentViewEntry[]
}>()

const emit = defineEmits<{
  backToReader: []
  openEntry: [entryId: string]
}>()

const ALL_WORKSPACES = '__all__'
const selectedWorkspaceId = shallowRef(ALL_WORKSPACES)

const workspaceOptions = computed(() => {
  const grouped = new Map<string, { id: string, label: string, count: number }>()

  for (const entry of props.entries) {
    const current = grouped.get(entry.workspaceId)
    if (current) {
      current.count += 1
      continue
    }

    grouped.set(entry.workspaceId, {
      id: entry.workspaceId,
      label: entry.workspaceName,
      count: 1,
    })
  }

  return Array.from(grouped.values())
})

const filteredEntries = computed(() =>
  selectedWorkspaceId.value === ALL_WORKSPACES
    ? props.entries
    : props.entries.filter((entry) => entry.workspaceId === selectedWorkspaceId.value),
)

const selectedWorkspaceLabel = computed(() =>
  selectedWorkspaceId.value === ALL_WORKSPACES
    ? '全部文档仓库'
    : workspaceOptions.value.find((option) => option.id === selectedWorkspaceId.value)?.label ?? '全部文档仓库',
)

watch(
  workspaceOptions,
  (options) => {
    if (selectedWorkspaceId.value === ALL_WORKSPACES) {
      return
    }

    if (!options.some((option) => option.id === selectedWorkspaceId.value)) {
      selectedWorkspaceId.value = ALL_WORKSPACES
    }
  },
  { immediate: true },
)

const resultSummary = computed(() =>
  selectedWorkspaceId.value === ALL_WORKSPACES
    ? `全部文档仓库 · ${filteredEntries.value.length} 条记录`
    : `${selectedWorkspaceLabel.value} · ${filteredEntries.value.length} 条记录`,
)

const toolbarCountLabel = computed(() =>
  selectedWorkspaceId.value === ALL_WORKSPACES
    ? `${props.entries.length} 条`
    : `${filteredEntries.value.length} 条`,
)

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
          <DesktopUiIcon name="history" :size="16" />
        </span>
        <div class="desktop-recent-view__title-copy">
          <h2 class="desktop-recent-view__title">最近阅读</h2>
          <p class="desktop-recent-view__title-summary">{{ resultSummary }}</p>
        </div>
      </div>

      <button class="desktop-recent-view__back" type="button" @click="emit('backToReader')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-recent-view__toolbar">
      <label class="desktop-recent-view__workspace-filter">
        <span>筛选文档仓库</span>
        <select v-model="selectedWorkspaceId">
          <option :value="ALL_WORKSPACES">全部文档仓库</option>
          <option
            v-for="option in workspaceOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ `${option.label} (${option.count})` }}
          </option>
        </select>
      </label>

      <span class="desktop-recent-view__toolbar-count">{{ toolbarCountLabel }}</span>
    </div>

    <div class="desktop-recent-view__body desktop-scroll">
      <div v-if="filteredEntries.length === 0" class="desktop-recent-view__empty">
        <strong>还没有最近阅读记录</strong>
        <span>{{ resultSummary }}</span>
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
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
  width: 100%;
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
  gap: 0.72rem;
  min-width: 0;
}

.desktop-recent-view__title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.1);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.06);
  color: var(--desktop-accent);
}

.desktop-recent-view__title-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.desktop-recent-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.08rem;
  font-weight: 670;
}

.desktop-recent-view__title-summary {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.75rem;
}

.desktop-recent-view__back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.56rem 0.76rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
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
  font-size: 0.74rem;
  font-weight: 600;
}

.desktop-recent-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.desktop-recent-view__workspace-filter {
  display: grid;
  gap: 0.4rem;
}

.desktop-recent-view__workspace-filter span {
  color: var(--desktop-soft);
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-recent-view__workspace-filter select {
  min-width: 14rem;
  min-height: 2.15rem;
  padding: 0 0.74rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  font: inherit;
  font-size: 0.76rem;
  outline: 0;
}

.desktop-recent-view__toolbar-count {
  display: inline-flex;
  align-items: center;
  min-height: 2.15rem;
  padding: 0 0.72rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.74rem;
  font-weight: 700;
}

.desktop-recent-view__body {
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.desktop-recent-view__list {
  display: grid;
  gap: 0.54rem;
}

.desktop-recent-view__entry {
  display: grid;
  gap: 0.38rem;
  width: 100%;
  padding: 0.86rem 0.92rem 0.84rem;
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.035), transparent 30%),
    var(--desktop-surface-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-recent-view__entry:hover {
  border-color: var(--desktop-line-strong);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.055), transparent 34%),
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
  min-height: 1.36rem;
  padding: 0.12rem 0.44rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.64rem;
  font-weight: 600;
}

.desktop-recent-view__chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-recent-view__entry-time,
.desktop-recent-view__entry-progress {
  color: var(--desktop-soft);
  font-size: 0.68rem;
}

.desktop-recent-view__entry-title {
  color: var(--desktop-ink);
  font-size: 0.94rem;
  font-weight: 650;
}

.desktop-recent-view__entry-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.52;
}

.desktop-recent-view__entry-footer {
  justify-content: space-between;
}

.desktop-recent-view__entry-action {
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  color: var(--desktop-accent);
  font-size: 0.7rem;
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

.desktop-recent-view__empty span {
  color: var(--desktop-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .desktop-recent-view__header,
  .desktop-recent-view__entry-footer,
  .desktop-recent-view__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .desktop-recent-view__workspace-filter,
  .desktop-recent-view__workspace-filter select {
    width: 100%;
  }
}
</style>
