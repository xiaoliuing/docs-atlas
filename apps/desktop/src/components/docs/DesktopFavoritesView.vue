<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
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
  entries: DesktopFavoriteViewEntry[]
}>()

const emit = defineEmits<{
  backToReader: []
  openEntry: [entryId: string]
  removeEntry: [entryId: string]
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
    ? `全部文档仓库 · ${filteredEntries.value.length} 条收藏`
    : `${selectedWorkspaceLabel.value} · ${filteredEntries.value.length} 条收藏`,
)

const toolbarCountLabel = computed(() =>
  selectedWorkspaceId.value === ALL_WORKSPACES
    ? `${props.entries.length} 条`
    : `${filteredEntries.value.length} 条`,
)

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
        <div class="desktop-favorites-view__title-copy">
          <div class="desktop-favorites-view__title-row">
            <span class="desktop-favorites-view__title-mark" aria-hidden="true">
              <DesktopUiIcon name="bookmark" :size="16" />
            </span>
            <h2 class="desktop-favorites-view__title">收藏</h2>
            <span class="desktop-favorites-view__toolbar-count">{{ toolbarCountLabel }}</span>
          </div>
          <p class="desktop-favorites-view__title-summary">{{ resultSummary }}</p>
        </div>
      </div>

      <button class="desktop-favorites-view__back" type="button" @click="emit('backToReader')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-favorites-view__toolbar">
      <label class="desktop-favorites-view__workspace-filter">
        <span>筛选范围</span>
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

      <p class="desktop-favorites-view__toolbar-summary">收藏是全局列表，可跨全部文档仓库集中浏览与回到正文。</p>
    </div>

    <div class="desktop-favorites-view__body desktop-scroll">
      <div v-if="filteredEntries.length === 0" class="desktop-favorites-view__empty">
        <strong>还没有收藏文档</strong>
        <span>{{ resultSummary }}</span>
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
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.desktop-favorites-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.15rem 0.05rem 0;
}

.desktop-favorites-view__title-wrap {
  display: grid;
  min-width: 0;
}

.desktop-favorites-view__title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.92rem;
  height: 1.92rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.06);
  color: var(--desktop-accent);
}

.desktop-favorites-view__title-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.desktop-favorites-view__title-row {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  min-width: 0;
}

.desktop-favorites-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.02rem;
  font-weight: 670;
}

.desktop-favorites-view__title-summary {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.75rem;
}

.desktop-favorites-view__back {
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

.desktop-favorites-view__back:hover {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-favorites-view__back span {
  font-size: 0.74rem;
  font-weight: 600;
}

.desktop-favorites-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.82rem 0.92rem;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.03), transparent 60%),
    var(--desktop-surface-strong);
}

.desktop-favorites-view__workspace-filter {
  display: grid;
  gap: 0.4rem;
}

.desktop-favorites-view__workspace-filter span {
  color: var(--desktop-soft);
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-favorites-view__workspace-filter select {
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

.desktop-favorites-view__toolbar-count {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  padding: 0 0.52rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.68rem;
  font-weight: 700;
}

.desktop-favorites-view__toolbar-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.74rem;
  line-height: 1.5;
  text-align: right;
}

.desktop-favorites-view__body {
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.desktop-favorites-view__list {
  display: grid;
  gap: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  overflow: hidden;
  background: var(--desktop-surface-strong);
}

.desktop-favorites-view__entry {
  display: grid;
  gap: 0.48rem;
  padding: 0.88rem 0.96rem 0.84rem;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.desktop-favorites-view__entry + .desktop-favorites-view__entry {
  border-top: 1px solid var(--desktop-line);
}

.desktop-favorites-view__entry:hover {
  background: rgba(var(--desktop-accent-rgb), 0.05);
}

.desktop-favorites-view__entry-main {
  display: grid;
  gap: 0.38rem;
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
  min-height: 1.36rem;
  padding: 0.12rem 0.44rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.64rem;
  font-weight: 600;
}

.desktop-favorites-view__chip--muted {
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
}

.desktop-favorites-view__entry-time {
  color: var(--desktop-soft);
  font-size: 0.68rem;
}

.desktop-favorites-view__entry-title {
  color: var(--desktop-ink);
  font-size: 0.94rem;
  font-weight: 650;
}

.desktop-favorites-view__entry-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.52;
}

.desktop-favorites-view__secondary {
  display: inline-flex;
  align-items: center;
  min-height: 1.82rem;
  padding: 0.28rem 0.68rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.69rem;
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

.desktop-favorites-view__empty span {
  color: var(--desktop-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .desktop-favorites-view__header,
  .desktop-favorites-view__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .desktop-favorites-view__toolbar-summary {
    text-align: left;
  }

  .desktop-favorites-view__workspace-filter,
  .desktop-favorites-view__workspace-filter select {
    width: 100%;
  }
}
</style>
