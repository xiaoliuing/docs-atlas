<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import type { DocsSourceGroup } from '@/types/docs'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopDocsSidebarNode from './DesktopDocsSidebarNode.vue'

const props = defineProps<{
  activeView: 'reader' | 'recent' | 'favorites' | 'settings'
  currentDocSlug: string | null
  currentSectionId: string | null
  currentSourceId: string | null
  currentWorkspaceDocCount: number
  currentWorkspaceId: string
  currentWorkspaceSourceCount: number
  currentWorkspaceUnhealthySourceCount: number
  favoriteCount: number
  recentCount: number
  sourceGroups: DocsSourceGroup[]
  workspaces: WorkspaceDetail[]
}>()

const emit = defineEmits<{
  editWorkspace: []
  editSources: []
  openFavorites: []
  openReader: []
  openRecent: []
  selectDoc: [slug: string]
  selectWorkspace: [workspaceId: string]
}>()

const openBranchIds = defineModel<string[]>('openBranchIds', { default: () => [] })
const openSectionId = defineModel<string | null>('openSectionId', { default: null })
const isWorkspaceMenuOpen = shallowRef(false)
const sidebarInnerRef = useTemplateRef<HTMLElement>('sidebarInner')
const workspaceSwitcherRef = useTemplateRef<HTMLElement>('workspaceSwitcher')

const activePath = computed(() => ({
  sectionId: props.currentSectionId,
  sourceId: props.currentSourceId,
}))
const currentWorkspace = computed(
  () => props.workspaces.find((workspace) => workspace.id === props.currentWorkspaceId) ?? null,
)
const isReaderView = computed(() => props.activeView === 'reader')
const isRecentView = computed(() => props.activeView === 'recent')
const isFavoritesView = computed(() => props.activeView === 'favorites')
const workspaceSummaryLine = computed(() => {
  const parts = [
    `${props.currentWorkspaceSourceCount} 个目录源`,
    `${props.currentWorkspaceDocCount} 篇文档`,
  ]

  if (props.currentWorkspaceUnhealthySourceCount > 0) {
    parts.push(`${props.currentWorkspaceUnhealthySourceCount} 个异常`)
  }

  return parts.join(' · ')
})
const directoryKicker = computed(() => (isReaderView.value ? '当前工作空间' : '全局内容'))
const directoryHeading = computed(() => {
  if (isReaderView.value) {
    return currentWorkspace.value?.name ?? '未选择工作空间'
  }

  return isRecentView.value ? '最近阅读' : '收藏'
})
const directoryDescription = computed(() => {
  if (isReaderView.value) {
    return currentWorkspace.value?.description?.trim() || workspaceSummaryLine.value
  }

  return isRecentView.value
    ? `跨 ${props.workspaces.length} 个工作空间继续阅读，自动回到上次位置。`
    : `跨 ${props.workspaces.length} 个工作空间沉淀关键文档，形成稳定参考集。`
})
const directoryBadge = computed(() => {
  if (isReaderView.value) {
    return `${props.currentWorkspaceDocCount}`
  }

  return isRecentView.value ? `${props.recentCount}` : `${props.favoriteCount}`
})

function toggleNode(id: string, depth: number) {
  const currentId = openBranchIds.value[depth] ?? null

  if (currentId === id) {
    openBranchIds.value = openBranchIds.value.slice(0, depth)
    openSectionId.value = null
    return
  }

  const nextBranch = openBranchIds.value.slice(0, depth)
  nextBranch[depth] = id
  openBranchIds.value = nextBranch
  openSectionId.value = null
}

function toggleSection(sectionId: string) {
  openSectionId.value = openSectionId.value === sectionId ? null : sectionId
}

function handleSelectWorkspace(workspaceId: string) {
  emit('selectWorkspace', workspaceId)
  isWorkspaceMenuOpen.value = false
}

function syncOpenState() {
  if (!activePath.value.sourceId) {
    openBranchIds.value = []
    openSectionId.value = null
    return
  }

  const nodePath = findNodePathBySourceId(props.sourceGroups, activePath.value.sourceId)
  openBranchIds.value = nodePath
  openSectionId.value = activePath.value.sectionId
}

function scrollToActiveItem() {
  const container = sidebarInnerRef.value
  if (!container) {
    return
  }

  const activeItem =
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__doc-link--active') ||
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__section-row--active') ||
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__toggle--active')

  activeItem?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  })
}

watch(
  activePath,
  async () => {
    syncOpenState()
    await nextTick()
    scrollToActiveItem()
  },
  { immediate: true },
)

watch(
  () => props.currentWorkspaceId,
  () => {
    isWorkspaceMenuOpen.value = false
  },
)

function handleWindowPointerDown(event: PointerEvent) {
  const switcher = workspaceSwitcherRef.value
  const target = event.target

  if (!switcher || !(target instanceof Node)) {
    return
  }

  if (!switcher.contains(target)) {
    isWorkspaceMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handleWindowPointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleWindowPointerDown)
})

function findNodePathBySourceId(nodes: DocsSourceGroup[], sourceId: string): string[] {
  for (const node of nodes) {
    if (node.sourceId === sourceId) {
      return [node.id]
    }

    const childPath = findNodePathBySourceId(node.children, sourceId)
    if (childPath.length > 0) {
      return [node.id, ...childPath]
    }
  }

  return []
}
</script>

<template>
  <aside class="desktop-docs-sidebar">
    <div class="desktop-docs-sidebar__rail">
      <div class="desktop-docs-sidebar__rail-group">
        <button
          :class="['desktop-docs-sidebar__rail-button', { 'desktop-docs-sidebar__rail-button--active': isReaderView }]"
          type="button"
          @click="emit('openReader')"
        >
          <span class="desktop-docs-sidebar__rail-icon">
            <DesktopUiIcon name="atlas" :size="15" />
          </span>
          <span class="desktop-docs-sidebar__rail-text">阅读</span>
        </button>

        <button
          :class="['desktop-docs-sidebar__rail-button', { 'desktop-docs-sidebar__rail-button--active': isRecentView }]"
          type="button"
          @click="emit('openRecent')"
        >
          <span class="desktop-docs-sidebar__rail-icon">
            <DesktopUiIcon name="history" :size="15" />
          </span>
          <span class="desktop-docs-sidebar__rail-text">最近</span>
          <span class="desktop-docs-sidebar__rail-count">{{ props.recentCount }}</span>
        </button>

        <button
          :class="['desktop-docs-sidebar__rail-button', { 'desktop-docs-sidebar__rail-button--active': isFavoritesView }]"
          type="button"
          @click="emit('openFavorites')"
        >
          <span class="desktop-docs-sidebar__rail-icon">
            <DesktopUiIcon name="bookmark" :size="15" />
          </span>
          <span class="desktop-docs-sidebar__rail-text">收藏</span>
          <span class="desktop-docs-sidebar__rail-count">{{ props.favoriteCount }}</span>
        </button>
      </div>

      <div />

      <div
        ref="workspaceSwitcher"
        class="desktop-docs-sidebar__rail-workspace"
      >
        <button
          :aria-expanded="isWorkspaceMenuOpen"
          class="desktop-docs-sidebar__rail-workspace-trigger"
          type="button"
          @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
        >
          <span
            class="desktop-docs-sidebar__rail-workspace-avatar"
            :style="{ '--workspace-color': currentWorkspace?.color ?? '#1f54d9' }"
          >
            <DesktopUiIcon name="atlas" :size="16" />
          </span>
          <span class="desktop-docs-sidebar__rail-workspace-text">工作区</span>
        </button>

        <div
          v-if="isWorkspaceMenuOpen"
          class="desktop-docs-sidebar__workspace-menu"
        >
          <div class="desktop-docs-sidebar__workspace-menu-heading">
            <strong>切换工作空间</strong>
            <span>当前阅读上下文会自动恢复</span>
          </div>

          <button
            v-for="workspace in props.workspaces"
            :key="workspace.id"
            :class="[
              'desktop-docs-sidebar__workspace-option',
              { 'desktop-docs-sidebar__workspace-option--active': workspace.id === props.currentWorkspaceId },
            ]"
            type="button"
            @click="handleSelectWorkspace(workspace.id)"
          >
            <span
              class="desktop-docs-sidebar__workspace-option-dot"
              :style="{ backgroundColor: workspace.color }"
            />
            <span class="desktop-docs-sidebar__workspace-option-copy">
              <strong>{{ workspace.name }}</strong>
              <span>{{ workspace.description || `${workspace.sources.length} 个文档源` }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="desktop-docs-sidebar__directory-panel">
      <div class="desktop-docs-sidebar__directory-header">
        <div class="desktop-docs-sidebar__directory-copy">
          <p class="desktop-docs-sidebar__directory-kicker">{{ directoryKicker }}</p>
          <div class="desktop-docs-sidebar__directory-title-row">
            <h2 class="desktop-docs-sidebar__directory-heading">{{ directoryHeading }}</h2>
            <span class="desktop-docs-sidebar__directory-badge">{{ directoryBadge }}</span>
          </div>
          <p class="desktop-docs-sidebar__directory-summary">{{ directoryDescription }}</p>

          <div
            v-if="isReaderView"
            class="desktop-docs-sidebar__directory-stats"
          >
            <span class="desktop-docs-sidebar__directory-stat">{{ `${props.currentWorkspaceSourceCount} 个目录源` }}</span>
            <span class="desktop-docs-sidebar__directory-stat">{{ `${props.currentWorkspaceDocCount} 篇文档` }}</span>
            <span
              v-if="props.currentWorkspaceUnhealthySourceCount > 0"
              class="desktop-docs-sidebar__directory-stat desktop-docs-sidebar__directory-stat--warning"
            >
              {{ `${props.currentWorkspaceUnhealthySourceCount} 个异常目录源` }}
            </span>
          </div>

          <div
            v-else
            class="desktop-docs-sidebar__directory-stats"
          >
            <span class="desktop-docs-sidebar__directory-stat">{{ `${props.workspaces.length} 个工作空间` }}</span>
            <span class="desktop-docs-sidebar__directory-stat">
              {{ isRecentView ? `${props.recentCount} 条最近阅读` : `${props.favoriteCount} 条收藏` }}
            </span>
          </div>
        </div>

        <div
          v-if="isReaderView"
          class="desktop-docs-sidebar__directory-actions"
        >
          <button
            class="desktop-docs-sidebar__directory-action"
            type="button"
            @click="emit('editWorkspace')"
          >
            工作区设置
          </button>

          <button
            class="desktop-docs-sidebar__directory-action"
            type="button"
            @click="emit('editSources')"
          >
            文档源
          </button>
        </div>
      </div>

      <div
        ref="sidebarInner"
        class="desktop-docs-sidebar__scroll desktop-scroll"
      >
        <nav
          v-if="isReaderView && props.sourceGroups.length > 0"
          class="desktop-docs-sidebar__nav"
        >
          <DesktopDocsSidebarNode
            v-for="node in props.sourceGroups"
            :key="node.id"
            :current-doc-slug="props.currentDocSlug"
            :current-section-id="props.currentSectionId"
            :current-source-id="props.currentSourceId"
            :depth="0"
            :node="node"
            :open-branch-ids="openBranchIds"
            :open-section-id="openSectionId"
            @select-doc="emit('selectDoc', $event)"
            @toggle-node="toggleNode"
            @toggle-section="toggleSection"
          />
        </nav>

        <div v-else-if="isReaderView" class="desktop-docs-sidebar__empty">
          当前工作区还没有可显示的文档源。
        </div>

        <div v-else class="desktop-docs-sidebar__global-empty">
          <strong>{{ isRecentView ? '最近阅读是全局页' : '收藏是全局页' }}</strong>
          <p>
            {{ isRecentView ? '这里聚合所有工作空间的阅读轨迹，并且会恢复到上次的文档位置。' : '这里聚合所有工作空间中被固定下来的关键文档，适合长期沉淀设计资料。' }}
          </p>

          <div class="desktop-docs-sidebar__global-stats">
            <span>{{ currentWorkspace?.name ?? '当前工作区' }}</span>
            <span>{{ isRecentView ? '点击任意记录即可回到正文' : '收藏用于固定高频参考文档' }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.desktop-docs-sidebar {
  height: 100%;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 0.75rem;
  min-height: 0;
}

.desktop-docs-sidebar__rail,
.desktop-docs-sidebar__directory-panel {
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
  box-shadow: var(--shadow-panel);
}

.desktop-docs-sidebar__rail {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0.7rem;
  padding: 0.72rem 0.56rem;
  min-height: 0;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.075), rgba(var(--desktop-accent-rgb), 0.02) 28%, transparent),
    var(--desktop-surface);
}

.desktop-docs-sidebar__rail-group {
  display: grid;
  gap: 0.46rem;
}

.desktop-docs-sidebar__rail-button {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.28rem;
  width: 100%;
  min-height: 4.1rem;
  padding: 0.62rem 0.35rem;
  border: 1px solid transparent;
  border-radius: 16px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-muted);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__rail-button:hover,
.desktop-docs-sidebar__rail-button--active {
  border-color: rgba(var(--desktop-accent-rgb), 0.2);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.14), rgba(var(--desktop-accent-rgb), 0.06)),
    var(--desktop-surface-strong);
  color: var(--desktop-accent);
  transform: translateY(-1px);
}

.desktop-docs-sidebar__rail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: currentColor;
}

.desktop-docs-sidebar__rail-text {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}

.desktop-docs-sidebar__rail-count {
  position: absolute;
  top: 0.42rem;
  right: 0.42rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.18rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.13);
  color: inherit;
  font-size: 0.62rem;
  font-weight: 700;
}

.desktop-docs-sidebar__rail-workspace {
  position: relative;
  display: grid;
}

.desktop-docs-sidebar__rail-workspace-trigger {
  display: inline-grid;
  justify-items: center;
  gap: 0.28rem;
  width: 100%;
  min-height: 4.3rem;
  padding: 0.65rem 0.32rem 0.55rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.14), rgba(var(--desktop-accent-rgb), 0.06)),
    var(--desktop-surface-strong);
  color: var(--desktop-accent);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__rail-workspace-trigger:hover {
  border-color: rgba(var(--desktop-accent-rgb), 0.28);
  transform: translateY(-1px);
}

.desktop-docs-sidebar__rail-workspace-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 13px;
  background: color-mix(in srgb, var(--workspace-color) 14%, transparent);
  color: var(--workspace-color);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace-color) 18%, transparent);
}

.desktop-docs-sidebar__rail-workspace-avatar svg {
  width: 0.96rem;
  height: 0.96rem;
}

.desktop-docs-sidebar__rail-workspace-text {
  font-size: 0.67rem;
  font-weight: 700;
  line-height: 1;
}

.desktop-docs-sidebar__workspace-menu {
  position: absolute;
  bottom: 0;
  left: calc(100% + 0.55rem);
  width: 260px;
  display: grid;
  gap: 0.42rem;
  padding: 0.42rem;
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  background: var(--desktop-surface-strong);
  box-shadow: 0 18px 42px rgba(var(--desktop-shadow), 0.16);
  z-index: 20;
}

.desktop-docs-sidebar__workspace-menu-heading {
  display: grid;
  gap: 0.08rem;
  padding: 0.1rem 0.18rem 0;
}

.desktop-docs-sidebar__workspace-menu-heading strong {
  color: var(--desktop-ink);
  font-size: 0.8rem;
}

.desktop-docs-sidebar__workspace-menu-heading span {
  color: var(--desktop-muted);
  font-size: 0.69rem;
  line-height: 1.4;
}

.desktop-docs-sidebar__workspace-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.58rem;
  align-items: center;
  width: 100%;
  padding: 0.56rem 0.58rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.desktop-docs-sidebar__workspace-option:hover,
.desktop-docs-sidebar__workspace-option--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.06);
}

.desktop-docs-sidebar__workspace-option-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(var(--desktop-accent-rgb), 0.06);
}

.desktop-docs-sidebar__workspace-option-copy {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.desktop-docs-sidebar__workspace-option-copy strong {
  color: var(--desktop-ink);
  font-size: 0.78rem;
  font-weight: 600;
}

.desktop-docs-sidebar__workspace-option-copy span {
  color: var(--desktop-muted);
  font-size: 0.69rem;
  line-height: 1.35;
}

.desktop-docs-sidebar__directory-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.desktop-docs-sidebar__directory-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.88rem 0.94rem 0.8rem;
  border-bottom: 1px solid var(--desktop-line);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.08), rgba(var(--desktop-accent-rgb), 0.02) 78%),
    var(--desktop-surface);
}

.desktop-docs-sidebar__directory-copy {
  display: grid;
  gap: 0.22rem;
  min-width: 0;
}

.desktop-docs-sidebar__directory-kicker {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-docs-sidebar__directory-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.desktop-docs-sidebar__directory-heading {
  margin: 0;
  min-width: 0;
  color: var(--desktop-ink);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desktop-docs-sidebar__directory-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  min-height: 1.45rem;
  padding: 0 0.36rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.11);
  color: var(--desktop-accent);
  font-size: 0.67rem;
  font-weight: 700;
}

.desktop-docs-sidebar__directory-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.desktop-docs-sidebar__directory-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
  margin-top: 0.1rem;
}

.desktop-docs-sidebar__directory-stat {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.07);
  color: var(--desktop-accent);
  font-size: 0.66rem;
  font-weight: 600;
}

.desktop-docs-sidebar__directory-stat--warning {
  background: rgba(217, 131, 40, 0.12);
  color: #b56a1f;
}

.desktop-docs-sidebar__directory-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.desktop-docs-sidebar__directory-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.95rem;
  padding: 0 0.74rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 11px;
  background: rgba(var(--desktop-accent-rgb), 0.06);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__directory-action:hover {
  border-color: rgba(var(--desktop-accent-rgb), 0.26);
  background: rgba(var(--desktop-accent-rgb), 0.11);
  transform: translateY(-1px);
}

.desktop-docs-sidebar__scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 0.78rem 0.82rem 0.9rem;
}

.desktop-docs-sidebar__nav {
  display: grid;
  gap: 0.46rem;
}

.desktop-docs-sidebar__empty {
  padding: 0.9rem;
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 14px;
  color: var(--desktop-muted);
  background: rgba(var(--desktop-accent-rgb), 0.04);
  font-size: 0.8rem;
  line-height: 1.5;
}

.desktop-docs-sidebar__global-empty {
  display: grid;
  gap: 0.46rem;
  padding: 0.9rem;
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 14px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-docs-sidebar__global-empty strong {
  color: var(--desktop-ink);
  font-size: 0.82rem;
}

.desktop-docs-sidebar__global-empty p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.52;
}

.desktop-docs-sidebar__global-stats {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.desktop-docs-sidebar__global-stats span {
  display: inline-flex;
  align-items: center;
  min-height: 1.62rem;
  padding: 0.18rem 0.48rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font-size: 0.68rem;
  font-weight: 600;
}

@media (max-width: 1240px) {
  .desktop-docs-sidebar {
    grid-template-columns: 70px minmax(0, 1fr);
  }

  .desktop-docs-sidebar__directory-header {
    flex-direction: column;
  }

  .desktop-docs-sidebar__directory-actions {
    width: 100%;
  }

  .desktop-docs-sidebar__directory-action {
    flex: 1 1 auto;
  }
}
</style>
