<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import type { DocsSourceGroup } from '@/types/docs'
import DesktopDocsSidebarNode from './DesktopDocsSidebarNode.vue'

const props = defineProps<{
  currentDocSlug: string | null
  currentSectionId: string | null
  currentSourceId: string | null
  currentWorkspaceDocCount: number
  currentWorkspaceId: string
  currentWorkspaceSourceCount: number
  sourceGroups: DocsSourceGroup[]
  workspaces: WorkspaceDetail[]
}>()

const emit = defineEmits<{
  createWorkspace: []
  editWorkspace: []
  editSources: []
  selectDoc: [slug: string]
  selectWorkspace: [workspaceId: string]
}>()

const openBranchIds = shallowRef<string[]>([])
const openSectionId = shallowRef<string | null>(null)
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
    <div class="desktop-docs-sidebar__workspace-panel">
      <div class="desktop-docs-sidebar__panel-header">
        <p class="desktop-docs-sidebar__panel-label">Workspace</p>
        <button
          aria-label="新建工作区"
          class="desktop-docs-sidebar__create"
          type="button"
          @click="emit('createWorkspace')"
        >
          <span />
          <span />
        </button>
      </div>

      <div
        ref="workspaceSwitcher"
        class="desktop-docs-sidebar__workspace-switcher"
      >
        <button
          :aria-expanded="isWorkspaceMenuOpen"
          class="desktop-docs-sidebar__workspace-trigger"
          type="button"
          @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
        >
          <span
            class="desktop-docs-sidebar__workspace-avatar"
            :style="{ '--workspace-color': currentWorkspace?.color ?? '#1f54d9' }"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 8.5C4 6.57 5.57 5 7.5 5H16.5C18.43 5 20 6.57 20 8.5V15.5C20 17.43 18.43 19 16.5 19H7.5C5.57 19 4 17.43 4 15.5V8.5Z"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path d="M8 9.5H16" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              <path d="M8 13H13" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
            </svg>
          </span>

          <span class="desktop-docs-sidebar__workspace-copy">
            <span class="desktop-docs-sidebar__workspace-name">{{ currentWorkspace?.name ?? '未选择工作空间' }}</span>
            <span class="desktop-docs-sidebar__workspace-summary">
              {{ currentWorkspace?.description || '当前工作空间的文档目录' }}
            </span>
          </span>

          <span
            :class="[
              'desktop-docs-sidebar__workspace-chevron',
              { 'desktop-docs-sidebar__workspace-chevron--open': isWorkspaceMenuOpen },
            ]"
          />
        </button>

        <div
          v-if="isWorkspaceMenuOpen"
          class="desktop-docs-sidebar__workspace-menu"
        >
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
              <span>{{ workspace.sources.length }} 个文档源</span>
            </span>
          </button>
        </div>
      </div>

      <div class="desktop-docs-sidebar__workspace-meta">
        <div class="desktop-docs-sidebar__workspace-actions">
          <div class="desktop-docs-sidebar__workspace-stats">
            <div class="desktop-docs-sidebar__workspace-stat">
              <strong>{{ props.currentWorkspaceSourceCount }}</strong>
              <span>目录源</span>
            </div>
            <div class="desktop-docs-sidebar__workspace-stat">
              <strong>{{ props.currentWorkspaceDocCount }}</strong>
              <span>文档</span>
            </div>
          </div>

          <button
            class="desktop-docs-sidebar__workspace-action"
            type="button"
            @click="emit('editWorkspace')"
          >
            设置
          </button>
        </div>
      </div>
    </div>

    <div class="desktop-docs-sidebar__directory-panel">
      <div class="desktop-docs-sidebar__directory-header">
        <span class="desktop-docs-sidebar__directory-title">文档树</span>

        <button
          class="desktop-docs-sidebar__header-action"
          type="button"
          @click="emit('editSources')"
        >
          设置文档源
        </button>
      </div>

      <div
        ref="sidebarInner"
        class="desktop-docs-sidebar__scroll desktop-scroll"
      >
        <nav
          v-if="props.sourceGroups.length > 0"
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

        <div
          v-else
          class="desktop-docs-sidebar__empty"
        >
          当前工作区还没有可显示的文档源。
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.desktop-docs-sidebar {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.8rem;
}

.desktop-docs-sidebar__workspace-panel,
.desktop-docs-sidebar__directory-panel {
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
  box-shadow: var(--shadow-panel);
}

.desktop-docs-sidebar__workspace-panel {
  padding: 0.7rem 0.72rem;
}

.desktop-docs-sidebar__panel-label,
.desktop-docs-sidebar__directory-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--desktop-soft);
}

.desktop-docs-sidebar__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.desktop-docs-sidebar__create {
  position: relative;
  width: 1.7rem;
  height: 1.7rem;
  border: 1px solid var(--desktop-line);
  border-radius: 10px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-accent);
  cursor: pointer;
}

.desktop-docs-sidebar__create span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.78rem;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.desktop-docs-sidebar__create span:last-child {
  transform: translate(-50%, -50%) rotate(90deg);
}

.desktop-docs-sidebar__workspace-switcher {
  position: relative;
  margin-top: 0.45rem;
}

.desktop-docs-sidebar__workspace-meta { margin-top: 0.48rem; }

.desktop-docs-sidebar__workspace-trigger {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.58rem 0.62rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 13px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.06), transparent 68%),
    var(--desktop-surface-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__workspace-trigger:hover {
  border-color: rgba(var(--desktop-accent-rgb), 0.2);
  transform: translateY(-1px);
}

.desktop-docs-sidebar__workspace-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 11px;
  background: color-mix(in srgb, var(--workspace-color) 14%, transparent);
  color: var(--workspace-color);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace-color) 18%, transparent);
}

.desktop-docs-sidebar__workspace-avatar svg {
  width: 0.96rem;
  height: 0.96rem;
}

.desktop-docs-sidebar__workspace-copy {
  display: grid;
  gap: 0.08rem;
  min-width: 0;
}

.desktop-docs-sidebar__workspace-name {
  color: var(--desktop-ink);
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.15;
}

.desktop-docs-sidebar__workspace-summary {
  color: var(--desktop-muted);
  font-size: 0.7rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desktop-docs-sidebar__workspace-chevron {
  width: 0.5rem;
  height: 0.5rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  color: var(--desktop-soft);
  transform: rotate(45deg);
  transition: transform 0.18s ease;
}

.desktop-docs-sidebar__workspace-chevron--open {
  transform: rotate(-135deg);
}

.desktop-docs-sidebar__workspace-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  left: 0;
  display: grid;
  gap: 0.28rem;
  padding: 0.28rem;
  border: 1px solid var(--desktop-line);
  border-radius: 13px;
  background: var(--desktop-surface-strong);
  box-shadow: 0 18px 42px rgba(var(--desktop-shadow), 0.16);
  z-index: 20;
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
}

.desktop-docs-sidebar__workspace-stats {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  min-width: 0;
}

.desktop-docs-sidebar__workspace-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.34rem 0.5rem;
  border: 1px solid var(--desktop-line);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.035);
}

.desktop-docs-sidebar__workspace-stat strong {
  color: var(--desktop-ink);
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1;
}

.desktop-docs-sidebar__workspace-stat span {
  color: var(--desktop-muted);
  font-size: 0.63rem;
  line-height: 1;
}

.desktop-docs-sidebar__workspace-action {
  flex: none;
  min-height: 1.86rem;
  padding: 0 0.74rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.18);
  border-radius: 10px;
  background: rgba(var(--desktop-accent-rgb), 0.07);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.73rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__workspace-action:hover,
.desktop-docs-sidebar__header-action:hover {
  border-color: rgba(var(--desktop-accent-rgb), 0.28);
  background: rgba(var(--desktop-accent-rgb), 0.12);
  transform: translateY(-1px);
}

.desktop-docs-sidebar__workspace-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.desktop-docs-sidebar__directory-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.desktop-docs-sidebar__directory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.74rem 0.9rem 0.7rem;
  border-bottom: 1px solid var(--desktop-line);
  background: rgba(var(--desktop-accent-rgb), 0.025);
}

.desktop-docs-sidebar__header-action {
  flex: none;
  min-height: 1.82rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 9px;
  background: rgba(var(--desktop-accent-rgb), 0.06);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-docs-sidebar__scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 0.8rem 0.8rem 0.9rem;
}

.desktop-docs-sidebar__nav {
  display: grid;
  gap: 0.5rem;
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
</style>
