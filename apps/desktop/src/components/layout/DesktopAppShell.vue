<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { WorkspaceSourceNode } from '@docs-atlas/shared-types/workspace'
import { exportLogsFile, openAppDataDirectory, openLogsDirectory } from '@/api/system'
import DesktopDocReader from '@/components/docs/DesktopDocReader.vue'
import DesktopDocsSidebar from '@/components/docs/DesktopDocsSidebar.vue'
import DesktopDocToc from '@/components/docs/DesktopDocToc.vue'
import DesktopSearchPanel from '@/components/docs/DesktopSearchPanel.vue'
import DesktopSystemSettingsPanel from '@/components/settings/DesktopSystemSettingsPanel.vue'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopSourceTreeDialog from '@/components/workspace/DesktopSourceTreeDialog.vue'
import DesktopWorkspaceDialog from '@/components/workspace/DesktopWorkspaceDialog.vue'
import { useDesktopActiveHeadings } from '@/composables/useDesktopActiveHeadings'
import { useDesktopDocsBrowser } from '@/composables/useDesktopDocsBrowser'
import { useDesktopPreferences } from '@/composables/useDesktopPreferences'
import { useDesktopReadingState } from '@/composables/useDesktopReadingState'
import { useDesktopDocsSearch } from '@/composables/useDesktopDocsSearch'
import { useDesktopSearchCatalog } from '@/composables/useDesktopSearchCatalog'
import { useDesktopWorkspaceDocs } from '@/composables/useDesktopWorkspaceDocs'
import { useWorkspaceSelection } from '@/composables/useWorkspaceSelection'

const {
  createWorkspace,
  currentWorkspace,
  currentWorkspaceId,
  currentWorkspaceSourceIds,
  deleteWorkspace,
  ensureLoaded,
  exportWorkspaceConfig,
  importWorkspaceConfig,
  isDeletingWorkspace,
  isExportingWorkspace,
  isImportingWorkspace,
  isLoadingWorkspaces,
  isSavingWorkspace,
  isSavingWorkspaceSources,
  saveWorkspaceSources,
  selectWorkspace,
  updateWorkspaceMeta,
  workspaces,
} = useWorkspaceSelection()
const workspaceDocs = useDesktopWorkspaceDocs({
  workspace: currentWorkspace,
})
const searchCatalog = useDesktopSearchCatalog({
  workspaces,
})
const {
  clearSelection,
  currentDoc,
  currentSectionId,
  currentSourceId,
  docs,
  headings,
  nextDoc,
  prevDoc,
  selectDoc,
  selectFirstDocBySourceIds,
  selectedDocSlug,
  sourceGroups,
} = useDesktopDocsBrowser({
  docs: workspaceDocs.docs,
  docsBySlug: workspaceDocs.docsBySlug,
  docDetailsBySlug: workspaceDocs.docDetailsBySlug,
  sourceGroups: workspaceDocs.sourceGroups,
})
const readingState = useDesktopReadingState()
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
  docsBySlug: searchCatalog.docsBySlug,
  searchIndex: searchCatalog.searchIndex,
  workspaceSourceIds: currentWorkspaceSourceIds,
})
const { accentOptions, preferences, setAccent, setThemeMode } = useDesktopPreferences()
const { activeId, scrollToHeading } = useDesktopActiveHeadings(headings)

const isSettingsOpen = shallowRef(false)
const isSourceTreeDialogOpen = shallowRef(false)
const isWorkspaceDialogOpen = shallowRef(false)
const restoredScrollTop = shallowRef(0)
const settingsActionMessage = shallowRef('')
const settingsBusyAction = shallowRef<'app-data' | 'logs' | 'export' | null>(null)
const sidebarOpenBranchIds = shallowRef<string[]>([])
const sidebarOpenSectionId = shallowRef<string | null>(null)
const workspaceDialogMode = shallowRef<'create' | 'edit'>('create')
const hasRestoredInitialWorkspace = shallowRef(false)
const pendingRestoreWorkspaceId = shallowRef('')
const pendingRestoreDocSlug = shallowRef('')
const searchPanelRef = useTemplateRef<InstanceType<typeof DesktopSearchPanel>>('searchPanel')
let settingsActionMessageTimer: number | null = null

const floatingPanelVisible = computed(() => isOpen.value || isSettingsOpen.value)
const searchQuery = computed({
  get: () => query.value,
  set: (value: string) => {
    setQuery(value)
  },
})
const sourceCount = computed(() => countWorkspaceFolderSources(currentWorkspace.value?.sources ?? []))
const visibleSourceGroups = computed(() => sourceGroups.value)
const docCount = computed(() => docs.value.length)
const workspaceDialogWorkspace = computed(() => (workspaceDialogMode.value === 'edit' ? currentWorkspace.value : null))

async function handleSelectWorkspace(workspaceId: string) {
  const restoredSlug = readingState.getSelectedDocForWorkspace(workspaceId)

  await selectWorkspace(workspaceId)

  if (restoredSlug) {
    await waitForDocAvailability(restoredSlug)
    selectDoc(restoredSlug)
  }

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
  } else {
    clearSettingsActionMessage()
  }
}

function openSourceTreeDialog() {
  if (!currentWorkspace.value) {
    return
  }

  closeFloatingPanels()
  isSourceTreeDialogOpen.value = true
}

async function handleSubmitSearch(slug?: string) {
  const targetSearchSlug = slug || activeResult.value?.slug
  if (!targetSearchSlug) {
    return
  }

  const targetWorkspaceId = searchCatalog.workspaceIdBySearchSlug.value[targetSearchSlug]
  const targetDocSlug = searchCatalog.docSlugBySearchSlug.value[targetSearchSlug] ?? targetSearchSlug

  if (targetWorkspaceId && targetWorkspaceId !== currentWorkspaceId.value) {
    await selectWorkspace(targetWorkspaceId)
    await waitForDocAvailability(targetDocSlug)
  }

  selectDoc(targetDocSlug)
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

async function handleDeleteWorkspace() {
  if (!currentWorkspace.value) {
    return
  }

  const deletedWorkspaceId = currentWorkspace.value.id
  const nextWorkspaceId = await deleteWorkspace(deletedWorkspaceId)
  if (!nextWorkspaceId) {
    return
  }

  isWorkspaceDialogOpen.value = false
  sidebarOpenBranchIds.value = []
  sidebarOpenSectionId.value = null

  if (readingState.currentWorkspaceId.value === deletedWorkspaceId) {
    readingState.setCurrentWorkspaceId(nextWorkspaceId)
  }
}

async function handleImportWorkspace() {
  const importedWorkspace = await importWorkspaceConfig()
  if (!importedWorkspace) {
    return
  }

  pendingRestoreWorkspaceId.value = ''
  pendingRestoreDocSlug.value = ''
  isWorkspaceDialogOpen.value = false
}

async function handleExportWorkspace() {
  if (!currentWorkspace.value) {
    return
  }

  await exportWorkspaceConfig(currentWorkspace.value.id)
}

function setSettingsActionFeedback(message: string) {
  settingsActionMessage.value = message

  if (settingsActionMessageTimer !== null) {
    window.clearTimeout(settingsActionMessageTimer)
  }

  settingsActionMessageTimer = window.setTimeout(() => {
    settingsActionMessage.value = ''
    settingsActionMessageTimer = null
  }, 3200)
}

function clearSettingsActionMessage() {
  settingsActionMessage.value = ''

  if (settingsActionMessageTimer !== null) {
    window.clearTimeout(settingsActionMessageTimer)
    settingsActionMessageTimer = null
  }
}

async function runSystemSettingsAction(
  action: 'app-data' | 'logs' | 'export',
  task: () => Promise<boolean>,
  successMessage: string,
) {
  settingsBusyAction.value = action

  try {
    const success = await task()
    setSettingsActionFeedback(success ? successMessage : '操作已取消')
  } catch (error) {
    setSettingsActionFeedback(error instanceof Error ? error.message : '操作失败，请稍后重试')
  } finally {
    settingsBusyAction.value = null
  }
}

async function handleOpenAppDataDirectory() {
  await runSystemSettingsAction('app-data', openAppDataDirectory, '已打开应用数据目录')
}

async function handleOpenLogsDirectory() {
  await runSystemSettingsAction('logs', openLogsDirectory, '已打开日志目录')
}

async function handleExportLogsFile() {
  await runSystemSettingsAction('export', exportLogsFile, '日志文件已导出')
}

onMounted(() => {
  void restoreInitialWorkspace()
})

onBeforeUnmount(() => {
  clearSettingsActionMessage()
})

watch(
  [currentWorkspaceId, currentWorkspaceSourceIds, docs, selectedDocSlug],
  ([workspaceId, sourceIds, docsList, activeSlug]) => {
    if (isLoadingWorkspaces.value) {
      return
    }

    if (docsList.length === 0 || sourceIds.length === 0) {
      clearSelection()
      restoredScrollTop.value = 0
      return
    }

    const docsBySlug = workspaceDocs.docsBySlug.value
    const currentDocMeta = activeSlug ? docsBySlug[activeSlug] ?? null : null
    const isCurrentDocValid = Boolean(currentDocMeta && sourceIds.includes(currentDocMeta.sourceId))
    const restoreSlug =
      workspaceId && pendingRestoreWorkspaceId.value === workspaceId ? pendingRestoreDocSlug.value : ''
    const restoreDocMeta = restoreSlug ? docsBySlug[restoreSlug] ?? null : null
    const isRestoreDocValid = Boolean(restoreDocMeta && sourceIds.includes(restoreDocMeta.sourceId))

    if (restoreSlug) {
      if (isRestoreDocValid && activeSlug !== restoreSlug) {
        selectDoc(restoreSlug)
        return
      }

      pendingRestoreWorkspaceId.value = ''
      pendingRestoreDocSlug.value = ''
    }

    if (!isCurrentDocValid) {
      selectFirstDocBySourceIds(sourceIds)
    }
  },
  { immediate: true },
)

watch(
  [currentWorkspaceId, () => currentWorkspace.value?.defaultSearchScope],
  ([workspaceId, defaultScope]) => {
    if (!workspaceId) {
      setScope(defaultScope ?? 'global')
      return
    }

    setScope(readingState.getSearchScopeForWorkspace(workspaceId, defaultScope ?? 'global'))
  },
  { immediate: true },
)

watch(
  currentWorkspaceId,
  (workspaceId) => {
    if (!workspaceId) {
      sidebarOpenBranchIds.value = []
      sidebarOpenSectionId.value = null
      return
    }

    if (hasRestoredInitialWorkspace.value) {
      readingState.setCurrentWorkspaceId(workspaceId)
    }

    const restoredSlug = readingState.getSelectedDocForWorkspace(workspaceId)
    pendingRestoreWorkspaceId.value = restoredSlug ? workspaceId : ''
    pendingRestoreDocSlug.value = restoredSlug

    const restoredSidebarState = readingState.getSidebarStateForWorkspace(workspaceId)
    sidebarOpenBranchIds.value = restoredSidebarState?.openBranchIds ?? []
    sidebarOpenSectionId.value = restoredSidebarState?.openSectionId ?? null
  },
  { immediate: true },
)

watch(
  [currentWorkspaceId, selectedDocSlug],
  ([workspaceId, slug]) => {
    if (!workspaceId || !slug) {
      restoredScrollTop.value = 0
      return
    }

    if (pendingRestoreWorkspaceId.value === workspaceId && pendingRestoreDocSlug.value && pendingRestoreDocSlug.value !== slug) {
      return
    }

    const currentDocMeta = workspaceDocs.docsBySlug.value[slug]
    if (!currentDocMeta || !currentWorkspaceSourceIds.value.includes(currentDocMeta.sourceId)) {
      return
    }

    readingState.setSelectedDocForWorkspace(workspaceId, slug)
    restoredScrollTop.value = readingState.getDocScrollTop(workspaceId, slug)
  },
  { immediate: true },
)

watch(
  [currentWorkspaceId, scope],
  ([workspaceId, nextScope]) => {
    if (!workspaceId) {
      return
    }

    readingState.setSearchScopeForWorkspace(workspaceId, nextScope)
  },
  { immediate: true },
)

watch(
  [currentWorkspaceId, sidebarOpenBranchIds, sidebarOpenSectionId],
  ([workspaceId, openBranchIds, openSectionId]) => {
    if (!workspaceId) {
      return
    }

    readingState.setSidebarStateForWorkspace(workspaceId, {
      openBranchIds,
      openSectionId,
    })
  },
  { deep: true, immediate: true },
)

function countWorkspaceFolderSources(nodes: WorkspaceSourceNode[]): number {
  return nodes.reduce((count, node) => {
    const selfCount = node.kind === 'folder' ? 1 : 0
    return count + selfCount + countWorkspaceFolderSources(node.children)
  }, 0)
}

async function restoreInitialWorkspace() {
  const restoredWorkspaceId = readingState.currentWorkspaceId.value
  await ensureLoaded()

  if (
    restoredWorkspaceId &&
    restoredWorkspaceId !== currentWorkspaceId.value &&
    workspaces.value.some((workspace) => workspace.id === restoredWorkspaceId)
  ) {
    await selectWorkspace(restoredWorkspaceId)
  }

  const activeWorkspaceId = currentWorkspaceId.value
  if (activeWorkspaceId) {
    readingState.setCurrentWorkspaceId(activeWorkspaceId)
  }

  hasRestoredInitialWorkspace.value = true
}

function handleDocScrollTopChange(top: number) {
  const workspaceId = currentWorkspaceId.value
  const slug = selectedDocSlug.value

  if (!workspaceId || !slug) {
    return
  }

  readingState.setDocScrollTop(workspaceId, slug, top)
}

function waitForDocAvailability(slug: string, timeoutMs = 5000) {
  if (workspaceDocs.docsBySlug.value[slug]) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const stop = watch(
      [workspaceDocs.docsBySlug, workspaceDocs.isLoading],
      ([docsBySlugValue, isLoadingValue]) => {
        if (docsBySlugValue[slug] || (!isLoadingValue && Object.keys(docsBySlugValue).length > 0)) {
          stop()
          resolve()
        }
      },
      { immediate: true },
    )

    window.setTimeout(() => {
      stop()
      resolve()
    }, timeoutMs)
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
          <DesktopUiIcon name="atlas" :size="16" />
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
          <DesktopUiIcon name="search" :size="18" />
        </button>

        <button
          aria-label="打开设置"
          :class="['desktop-titlebar__icon-button', { 'desktop-titlebar__icon-button--active': isSettingsOpen }]"
          type="button"
          @click="toggleSettingsPanel"
        >
          <DesktopUiIcon name="settings" :size="18" />
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
          :action-message="settingsActionMessage"
          :busy-action="settingsBusyAction"
          :theme-mode="preferences.themeMode"
          @export-logs="handleExportLogsFile"
          @open-app-data-directory="handleOpenAppDataDirectory"
          @open-logs-directory="handleOpenLogsDirectory"
          @update-accent="setAccent"
          @update-theme-mode="setThemeMode"
        />
      </div>
    </div>

    <div class="desktop-workbench">
      <aside class="desktop-workbench__sidebar">
        <DesktopDocsSidebar
          v-model:open-branch-ids="sidebarOpenBranchIds"
          v-model:open-section-id="sidebarOpenSectionId"
          :current-doc-slug="selectedDocSlug || null"
          :current-workspace-doc-count="docCount"
          :current-section-id="currentSectionId"
          :current-source-id="currentSourceId"
          :current-workspace-id="currentWorkspaceId"
          :current-workspace-unhealthy-source-count="workspaceDocs.unhealthySourceCount"
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
          :restore-scroll-top="restoredScrollTop"
          @select-doc="handleSelectDoc"
          @scroll-top-change="handleDocScrollTopChange"
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
      :can-delete="workspaces.length > 1"
      :is-deleting="isDeletingWorkspace"
      :is-exporting="isExportingWorkspace"
      :is-importing="isImportingWorkspace"
      :is-saving="isSavingWorkspace"
      :mode="workspaceDialogMode"
      :workspace-count="workspaces.length"
      :workspace="workspaceDialogWorkspace"
      @close="isWorkspaceDialogOpen = false"
      @delete="handleDeleteWorkspace"
      @export="handleExportWorkspace"
      @import="handleImportWorkspace"
      @submit="handleCreateWorkspace"
    />

    <DesktopSourceTreeDialog
      v-model:open="isSourceTreeDialogOpen"
      :is-saving="isSavingWorkspaceSources"
      :is-scanning="workspaceDocs.isLoading"
      :runtime-source-statuses-by-node-id="workspaceDocs.sourceStatusesByNodeId"
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
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.15), rgba(var(--desktop-accent-rgb), 0.05) 62%, transparent),
    var(--desktop-surface-strong);
  border-bottom: 1px solid var(--desktop-line);
  box-shadow: inset 0 -1px 0 rgba(var(--desktop-accent-rgb), 0.08);
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
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.09), transparent 85%),
    var(--desktop-surface);
  color: var(--desktop-muted);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.desktop-titlebar__icon-button svg {
  width: 1.1rem;
  height: 1.1rem;
}

.desktop-titlebar__icon-button:hover,
.desktop-titlebar__icon-button--active {
  border-color: var(--desktop-line-strong);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.18), rgba(var(--desktop-accent-rgb), 0.08)),
    var(--desktop-surface-strong);
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
