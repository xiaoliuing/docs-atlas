<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { WorkspaceSourceNode } from '@docs-atlas/shared-types/workspace'
import DesktopDocReader from '@/components/docs/DesktopDocReader.vue'
import DesktopDocsSidebar from '@/components/docs/DesktopDocsSidebar.vue'
import DesktopDocToc from '@/components/docs/DesktopDocToc.vue'
import DesktopSearchPanel from '@/components/docs/DesktopSearchPanel.vue'
import DesktopSystemSettingsPanel from '@/components/settings/DesktopSystemSettingsPanel.vue'
import DesktopSourceTreeDialog from '@/components/workspace/DesktopSourceTreeDialog.vue'
import DesktopWorkspaceDialog from '@/components/workspace/DesktopWorkspaceDialog.vue'
import { useDesktopActiveHeadings } from '@/composables/useDesktopActiveHeadings'
import { useDesktopDocsBrowser } from '@/composables/useDesktopDocsBrowser'
import { useDesktopPreferences } from '@/composables/useDesktopPreferences'
import { useDesktopDocsSearch } from '@/composables/useDesktopDocsSearch'
import { useWorkspaceSelection } from '@/composables/useWorkspaceSelection'

const {
  clearSelection,
  currentDoc,
  currentSectionId,
  currentSourceId,
  headings,
  nextDoc,
  prevDoc,
  selectDoc,
  selectFirstDoc,
  selectFirstDocBySourceIds,
  selectedDocSlug,
  sourceGroups,
} = useDesktopDocsBrowser()
const {
  createWorkspace,
  currentWorkspace,
  currentWorkspaceId,
  currentWorkspaceSourceIds,
  ensureLoaded,
  isLoadingWorkspaces,
  isSavingWorkspace,
  isSavingWorkspaceSources,
  saveWorkspaceSources,
  selectWorkspace,
  updateWorkspaceMeta,
  workspaces,
} =
  useWorkspaceSelection(sourceGroups)
const {
  activeResult,
  close: closeSearch,
  isOpen,
  moveSelection,
  open: openSearch,
  query,
  results,
  scope,
  selectedIndex,
  setQuery,
  setScope,
} = useDesktopDocsSearch({
  workspaceSourceIds: currentWorkspaceSourceIds,
})
const { accentOptions, preferences, setAccent, setThemeMode } = useDesktopPreferences()
const { activeId, scrollToHeading } = useDesktopActiveHeadings(headings)

const isSettingsOpen = shallowRef(false)
const isSourceTreeDialogOpen = shallowRef(false)
const isWorkspaceDialogOpen = shallowRef(false)
const workspaceDialogMode = shallowRef<'create' | 'edit'>('create')
const searchPanelRef = useTemplateRef<InstanceType<typeof DesktopSearchPanel>>('searchPanel')

const floatingPanelVisible = computed(() => isOpen.value || isSettingsOpen.value)
const searchQuery = computed({
  get: () => query.value,
  set: (value: string) => {
    setQuery(value)
  },
})
const sourceCount = computed(() => countWorkspaceFolderSources(currentWorkspace.value?.sources ?? []))
const visibleSourceGroups = computed(() => filterSourceGroups(sourceGroups, new Set(currentWorkspaceSourceIds.value)))
const docCount = computed(() => countDocs(visibleSourceGroups.value))
const workspaceDialogWorkspace = computed(() => (workspaceDialogMode.value === 'edit' ? currentWorkspace.value : null))

function handleSelectWorkspace(workspaceId: string) {
  void selectWorkspace(workspaceId)
  isSettingsOpen.value = false
}

function handleSelectDoc(slug: string) {
  selectDoc(slug)
}

async function toggleSearchPanel() {
  if (isOpen.value) {
    closeSearch()
    return
  }

  isSettingsOpen.value = false
  openSearch()
  await nextTick()
  searchPanelRef.value?.focusInput()
}

function toggleSettingsPanel() {
  const nextOpen = !isSettingsOpen.value
  isSettingsOpen.value = nextOpen

  if (nextOpen) {
    closeSearch()
  }
}

function openSourceTreeDialog() {
  if (!currentWorkspace.value) {
    return
  }

  closeFloatingPanels()
  isSourceTreeDialogOpen.value = true
}

function handleSubmitSearch(slug?: string) {
  const targetSlug = slug || activeResult.value?.slug
  if (!targetSlug) {
    return
  }

  selectDoc(targetSlug)
  closeSearch()
}

function closeFloatingPanels() {
  closeSearch()
  isSettingsOpen.value = false
}

async function handleCreateWorkspace(payload: {
  name: string
  description: string
  color: string
  defaultSearchScope: 'global' | 'workspace'
}) {
  const workspace =
    workspaceDialogMode.value === 'edit' && currentWorkspace.value
      ? await updateWorkspaceMeta(currentWorkspace.value.id, payload)
      : await createWorkspace({
          name: payload.name,
          description: payload.description,
          color: payload.color,
          defaultSearchScope: payload.defaultSearchScope,
          icon: 'folder',
          lastOpenedAt: new Date().toISOString(),
        })

  if (!workspace) {
    return
  }

  isWorkspaceDialogOpen.value = false
}

function openCreateWorkspaceDialog() {
  workspaceDialogMode.value = 'create'
  isWorkspaceDialogOpen.value = true
}

function openEditWorkspaceDialog() {
  if (!currentWorkspace.value) {
    return
  }

  workspaceDialogMode.value = 'edit'
  isWorkspaceDialogOpen.value = true
}

async function handleSaveWorkspaceSources(sources: Parameters<typeof saveWorkspaceSources>[1]) {
  if (!currentWorkspace.value) {
    return
  }

  const updated = await saveWorkspaceSources(currentWorkspace.value.id, sources)
  if (!updated) {
    return
  }

  isSourceTreeDialogOpen.value = false
}

onMounted(() => {
  void ensureLoaded()
})

watch(
  [currentWorkspaceSourceIds, currentSourceId],
  ([sourceIds, activeSourceId]) => {
    if (isLoadingWorkspaces.value) {
      return
    }

    if (sourceIds.length === 0) {
      clearSelection()
      return
    }

    if (!activeSourceId || !sourceIds.includes(activeSourceId)) {
      selectFirstDocBySourceIds(sourceIds)
    }
  },
  { immediate: true },
)

watch(
  () => currentWorkspace.value?.defaultSearchScope,
  (defaultScope) => {
    setScope(defaultScope ?? 'global')
  },
  { immediate: true },
)

function countDocs(groups: typeof sourceGroups): number {
  return groups.reduce((count, group) => {
    const sectionDocs = group.sections.reduce((sectionCount, section) => sectionCount + section.docs.length, 0)
    const childDocs = countDocs(group.children)
    return count + group.rootDocs.length + sectionDocs + childDocs
  }, 0)
}

function countWorkspaceFolderSources(nodes: WorkspaceSourceNode[]): number {
  return nodes.reduce((count, node) => {
    const selfCount = node.kind === 'folder' ? 1 : 0
    return count + selfCount + countWorkspaceFolderSources(node.children)
  }, 0)
}

function filterSourceGroups(groups: typeof sourceGroups, allowedSourceIds: Set<string>) {
  return groups
    .map((group) => {
      const children = filterSourceGroups(group.children, allowedSourceIds)
      const isAllowedSource = group.sourceId !== null && allowedSourceIds.has(group.sourceId)
      return {
        ...group,
        children,
      }
    })
    .filter((group) => {
      const isAllowedSource = group.sourceId !== null && allowedSourceIds.has(group.sourceId)
      return isAllowedSource || group.children.length > 0
    })
}
</script>

<template>
  <div class="desktop-app-shell">
    <header class="desktop-titlebar">
      <div
        class="desktop-titlebar__brand"
        data-tauri-drag-region
      >
        <span class="desktop-titlebar__traffic-gap" />
        <span class="desktop-titlebar__brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 8.5C5 6.57 6.57 5 8.5 5H15.5C17.43 5 19 6.57 19 8.5V15.5C19 17.43 17.43 19 15.5 19H8.5C6.57 19 5 17.43 5 15.5V8.5Z"
              stroke="currentColor"
              stroke-width="1.6"
            />
            <path d="M8.5 9.5H15.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
            <path d="M8.5 13H13.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
          </svg>
        </span>
        <span class="desktop-titlebar__brand-copy">
          <strong>Docs Atlas</strong>
          <span>{{ currentWorkspace?.name ?? 'Desktop' }}</span>
        </span>
      </div>

      <div class="desktop-titlebar__actions">
        <button
          aria-label="打开搜索"
          :class="['desktop-titlebar__icon-button', { 'desktop-titlebar__icon-button--active': isOpen }]"
          type="button"
          @click="toggleSearchPanel"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <path d="M16 16L20.5 20.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          </svg>
        </button>

        <button
          aria-label="打开设置"
          :class="['desktop-titlebar__icon-button', { 'desktop-titlebar__icon-button--active': isSettingsOpen }]"
          type="button"
          @click="toggleSettingsPanel"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.75L13.37 5.12L15.37 4.82L16.19 6.67L18.11 7.36L17.81 9.36L19.25 10.75L17.81 12.14L18.11 14.14L16.19 14.83L15.37 16.68L13.37 16.38L12 17.75L10.63 16.38L8.63 16.68L7.81 14.83L5.89 14.14L6.19 12.14L4.75 10.75L6.19 9.36L5.89 7.36L7.81 6.67L8.63 4.82L10.63 5.12L12 3.75Z"
              stroke="currentColor"
              stroke-linejoin="round"
              stroke-width="1.35"
            />
            <circle cx="12" cy="10.75" r="2.45" stroke="currentColor" stroke-width="1.5" />
            <path d="M10.3 14.5H13.7" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
          </svg>
        </button>
      </div>
    </header>

    <div
      v-if="floatingPanelVisible"
      class="desktop-floating-layer"
      @click="closeFloatingPanels"
    >
      <div
        v-if="isOpen"
        class="desktop-floating-layer__search"
      >
        <DesktopSearchPanel
          ref="searchPanel"
          v-model="searchQuery"
          :results="results"
          :scope="scope"
          :selected-index="selectedIndex"
          :workspace-name="currentWorkspace?.name ?? '当前工作区'"
          @close="closeSearch"
          @move-selection="moveSelection"
          @set-scope="setScope"
          @submit="handleSubmitSearch"
        />
      </div>

      <div
        v-if="isSettingsOpen"
        class="desktop-floating-layer__settings"
        @click.stop
      >
        <DesktopSystemSettingsPanel
          :accent-id="preferences.accentId"
          :accent-options="accentOptions"
          :theme-mode="preferences.themeMode"
          @update-accent="setAccent"
          @update-theme-mode="setThemeMode"
        />
      </div>
    </div>

    <div class="desktop-workbench">
      <aside class="desktop-workbench__sidebar">
        <DesktopDocsSidebar
          :current-doc-slug="selectedDocSlug || null"
          :current-workspace-doc-count="docCount"
          :current-section-id="currentSectionId"
          :current-source-id="currentSourceId"
          :current-workspace-id="currentWorkspaceId"
          :current-workspace-source-count="sourceCount"
          :source-groups="visibleSourceGroups"
          :workspaces="workspaces"
          @create-workspace="openCreateWorkspaceDialog"
          @edit-workspace="openEditWorkspaceDialog"
          @edit-sources="openSourceTreeDialog"
          @select-doc="handleSelectDoc"
          @select-workspace="handleSelectWorkspace"
        />
      </aside>

      <main
        class="desktop-workbench__main"
        :class="{ 'desktop-workbench__main--with-toc': headings.length > 0 }"
      >
        <DesktopDocReader
          :doc="currentDoc"
          :highlight-query="query"
          :next-doc="nextDoc"
          :prev-doc="prevDoc"
          @select-doc="handleSelectDoc"
        />

        <aside
          v-if="headings.length > 0"
          class="desktop-workbench__toc"
        >
          <DesktopDocToc
            :active-id="activeId"
            :headings="headings"
            @select="scrollToHeading"
          />
        </aside>
      </main>
    </div>

    <DesktopWorkspaceDialog
      v-model:open="isWorkspaceDialogOpen"
      :accent-options="accentOptions"
      :is-saving="isSavingWorkspace"
      :mode="workspaceDialogMode"
      :workspace="workspaceDialogWorkspace"
      @close="isWorkspaceDialogOpen = false"
      @submit="handleCreateWorkspace"
    />

    <DesktopSourceTreeDialog
      v-model:open="isSourceTreeDialogOpen"
      :is-saving="isSavingWorkspaceSources"
      :workspace="currentWorkspace"
      @close="isSourceTreeDialogOpen = false"
      @save="handleSaveWorkspaceSources"
    />
  </div>
</template>

<style scoped>
.desktop-app-shell {
  position: relative;
  display: grid;
  grid-template-rows: 46px minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
}

.desktop-titlebar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.9rem 0 0.2rem;
  background: rgba(226, 234, 247, 0.82);
  border-bottom: 1px solid var(--desktop-line);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.desktop-titlebar__brand {
  display: flex;
  align-items: center;
  gap: 0.72rem;
  min-width: 0;
  height: 100%;
}

.desktop-titlebar__traffic-gap {
  flex: none;
  width: 72px;
  height: 100%;
}

.desktop-titlebar__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-accent);
}

.desktop-titlebar__brand-mark svg {
  width: 1rem;
  height: 1rem;
}

.desktop-titlebar__brand-copy {
  display: grid;
  gap: 0.05rem;
  min-width: 0;
}

.desktop-titlebar__brand-copy strong,
.desktop-titlebar__brand-copy span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desktop-titlebar__brand-copy strong {
  color: var(--desktop-ink);
  font-size: 0.82rem;
  font-weight: 650;
}

.desktop-titlebar__brand-copy span {
  color: var(--desktop-soft);
  font-size: 0.68rem;
}

.desktop-titlebar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.desktop-titlebar__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.05rem;
  height: 2.05rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.64);
  color: var(--desktop-muted);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.desktop-titlebar__icon-button svg {
  width: 1rem;
  height: 1rem;
}

.desktop-titlebar__icon-button:hover,
.desktop-titlebar__icon-button--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.12);
  color: var(--desktop-accent);
  transform: translateY(-1px);
}

.desktop-floating-layer {
  position: absolute;
  inset: 46px 0 0;
  z-index: 25;
}

.desktop-floating-layer__search {
  position: absolute;
  top: 0.9rem;
  right: 0.95rem;
}

.desktop-floating-layer__settings {
  position: absolute;
  top: 0.9rem;
  right: 0.95rem;
}

.desktop-workbench {
  display: grid;
  grid-template-columns: 318px minmax(0, 1fr);
  gap: 0.9rem;
  min-height: 0;
  padding: 0.9rem;
  overflow: hidden;
}

.desktop-workbench__sidebar,
.desktop-workbench__main {
  min-height: 0;
}

.desktop-workbench__main {
  display: grid;
  min-width: 0;
}

.desktop-workbench__main--with-toc {
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 0.9rem;
}

.desktop-workbench__toc {
  min-height: 0;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .desktop-titlebar {
    background: rgba(18, 27, 42, 0.86);
  }

  .desktop-titlebar__icon-button {
    background: rgba(20, 30, 46, 0.8);
  }
}

:global(:root[data-theme-mode='dark']) .desktop-titlebar {
  background: rgba(18, 27, 42, 0.86);
}

:global(:root[data-theme-mode='dark']) .desktop-titlebar__icon-button {
  background: rgba(20, 30, 46, 0.8);
}

@media (max-width: 1320px) {
  .desktop-workbench {
    grid-template-columns: 300px minmax(0, 1fr);
  }
}

@media (max-width: 1180px) {
  .desktop-workbench {
    grid-template-columns: 290px minmax(0, 1fr);
  }
}
</style>
