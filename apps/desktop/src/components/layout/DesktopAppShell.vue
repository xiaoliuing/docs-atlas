<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { WorkspaceSourceNode } from '@docs-atlas/shared-types/workspace'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  exportLogsFile,
  listenDesktopMenuActions,
  openAppDataDirectory,
  openLogsDirectory,
  type DesktopMenuAction,
} from '@/api/system'
import DesktopDocReader from '@/components/docs/DesktopDocReader.vue'
import DesktopDocsSidebar from '@/components/docs/DesktopDocsSidebar.vue'
import DesktopDocToc from '@/components/docs/DesktopDocToc.vue'
import DesktopSearchPanel from '@/components/docs/DesktopSearchPanel.vue'
import DesktopSettingsView from '@/components/settings/DesktopSettingsView.vue'
import type { DesktopSettingsSection } from '@/components/settings/DesktopSettingsNav.vue'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopSourceTreeDialog from '@/components/workspace/DesktopSourceTreeDialog.vue'
import DesktopWorkspaceDialog from '@/components/workspace/DesktopWorkspaceDialog.vue'
import { useDesktopActiveHeadings } from '@/composables/useDesktopActiveHeadings'
import { useDesktopDocsBrowser } from '@/composables/useDesktopDocsBrowser'
import { useDesktopPreferences } from '@/composables/useDesktopPreferences'
import { useDesktopReleaseUpdates } from '@/composables/useDesktopReleaseUpdates'
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
const {
  checkForUpdates,
  currentVersion,
  installUpdate,
  lastCheckedAt,
  latestRelease,
  loadCurrentVersion,
  message: updateMessage,
  openLatestRelease,
  status: updateStatus,
} = useDesktopReleaseUpdates()

type DesktopPrimaryView = 'reader' | 'settings'

const primaryView = shallowRef<DesktopPrimaryView>('reader')
const settingsSection = shallowRef<DesktopSettingsSection>('appearance')
const isSourceTreeDialogOpen = shallowRef(false)
const isWorkspaceDialogOpen = shallowRef(false)
const currentReaderScrollTop = shallowRef(0)
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
let desktopMenuActionUnlisten: UnlistenFn | null = null
let settingsActionMessageTimer: number | null = null

const isReaderView = computed(() => primaryView.value === 'reader')
const isSettingsView = computed(() => primaryView.value === 'settings')
const floatingPanelVisible = computed(() => isOpen.value)
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

  closeSearch()
}

function handleSelectDoc(slug: string) {
  selectDoc(slug)
}

async function toggleSearchPanel() {
  if (isOpen.value) {
    closeSearch()
    return
  }

  await showSearchPanel()
}

async function showSearchPanel() {
  openSearch()
  await nextTick()
  searchPanelRef.value?.focusInput()
}

function toggleSettingsPanel() {
  if (isSettingsView.value) {
    closeSettingsView()
    return
  }

  openSettingsView('appearance')
}

function openSettingsView(section: DesktopSettingsSection = 'appearance') {
  persistCurrentDocScrollTop()
  settingsSection.value = section
  primaryView.value = 'settings'
  closeSearch()
}

function closeSettingsView() {
  restoreCurrentDocScrollTop()
  primaryView.value = 'reader'
  clearSettingsActionMessage()
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

async function handleTitlebarMouseDown(event: MouseEvent) {
  if (!isTauriRuntime() || event.button !== 0) {
    return
  }

  if (event.detail === 2) {
    // Tauri already toggles maximize on double click for drag regions.
    return
  }

  event.preventDefault()
  await getCurrentWindow().startDragging()
}

async function handleDesktopMenuAction(action: DesktopMenuAction) {
  switch (action) {
    case 'open-search':
      await showSearchPanel()
      break
    case 'open-settings':
      openSettingsView('appearance')
      break
    case 'import-workspace':
      await handleImportWorkspace()
      break
    case 'export-workspace':
      await handleExportWorkspace()
      break
  }
}

async function bindDesktopMenuActions() {
  desktopMenuActionUnlisten = await listenDesktopMenuActions((action) => {
    void handleDesktopMenuAction(action)
  })
}

onMounted(() => {
  void restoreInitialWorkspace()
  void bindDesktopMenuActions()
  void loadCurrentVersion()
})

onBeforeUnmount(() => {
  clearSettingsActionMessage()
  desktopMenuActionUnlisten?.()
  desktopMenuActionUnlisten = null
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
      currentReaderScrollTop.value = 0
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
    currentReaderScrollTop.value = restoredScrollTop.value
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

  currentReaderScrollTop.value = Math.max(0, Math.round(top))

  if (!workspaceId || !slug) {
    return
  }

  readingState.setDocScrollTop(workspaceId, slug, currentReaderScrollTop.value)
}

function persistCurrentDocScrollTop() {
  const workspaceId = currentWorkspaceId.value
  const slug = selectedDocSlug.value

  if (!workspaceId || !slug) {
    return
  }

  restoredScrollTop.value = currentReaderScrollTop.value
  readingState.setDocScrollTop(workspaceId, slug, currentReaderScrollTop.value)
}

function restoreCurrentDocScrollTop() {
  const workspaceId = currentWorkspaceId.value
  const slug = selectedDocSlug.value

  if (!workspaceId || !slug) {
    return
  }

  const savedScrollTop = readingState.getDocScrollTop(workspaceId, slug)
  restoredScrollTop.value = currentReaderScrollTop.value || savedScrollTop
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

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
</script>

<template>
  <div class="desktop-app-shell">
    <header class="desktop-titlebar">
      <div
        class="desktop-titlebar__drag-region"
        data-tauri-drag-region
        @mousedown="handleTitlebarMouseDown"
      >
        <span class="desktop-titlebar__traffic-gap" data-tauri-drag-region />
        <div class="desktop-titlebar__drag-pad" data-tauri-drag-region />
      </div>

      <div class="desktop-titlebar__actions">
        <button
          aria-label="打开搜索"
          :class="['desktop-titlebar__icon-button', { 'desktop-titlebar__icon-button--active': isOpen }]"
          type="button"
          @mousedown.stop
          @dblclick.stop
          @click="toggleSearchPanel"
        >
          <DesktopUiIcon name="search" :size="18" />
        </button>

        <button
          aria-label="打开设置"
          :class="['desktop-titlebar__icon-button', { 'desktop-titlebar__icon-button--active': isSettingsView }]"
          type="button"
          @mousedown.stop
          @dblclick.stop
          @click="toggleSettingsPanel"
        >
          <DesktopUiIcon name="settings" :size="19" />
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

    </div>

    <div class="desktop-workbench" :class="{ 'desktop-workbench--settings': isSettingsView }">
      <template v-if="isReaderView">
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
      </template>

      <DesktopSettingsView
        v-else
        :accent-id="preferences.accentId"
        :accent-options="accentOptions"
        :action-message="settingsActionMessage"
        :active-section="settingsSection"
        :busy-action="settingsBusyAction"
        :current-version="currentVersion"
        :current-workspace="currentWorkspace"
        :doc-count="docCount"
        :is-exporting-workspace="isExportingWorkspace"
        :is-importing-workspace="isImportingWorkspace"
        :last-checked-at="lastCheckedAt"
        :latest-release="latestRelease"
        :source-count="sourceCount"
        :theme-mode="preferences.themeMode"
        :update-message="updateMessage"
        :update-status="updateStatus"
        :unhealthy-source-count="workspaceDocs.unhealthySourceCount"
        :workspace-count="workspaces.length"
        @check-updates="checkForUpdates"
        @close="closeSettingsView"
        @create-workspace="openCreateWorkspaceDialog"
        @edit-sources="openSourceTreeDialog"
        @edit-workspace="openEditWorkspaceDialog"
        @export-logs="handleExportLogsFile"
        @export-workspace="handleExportWorkspace"
        @import-workspace="handleImportWorkspace"
        @install-update="installUpdate"
        @open-latest-release="openLatestRelease"
        @open-app-data-directory="handleOpenAppDataDirectory"
        @open-logs-directory="handleOpenLogsDirectory"
        @select-section="settingsSection = $event"
        @update-accent="setAccent"
        @update-theme-mode="setThemeMode"
      />
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
  grid-template-rows: 38px minmax(0, 1fr);
  height: 100vh;
  overflow: hidden;
}

.desktop-titlebar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.7rem 0 0.12rem;
  background: var(--desktop-titlebar-bg-runtime, var(--desktop-titlebar-bg));
  border-bottom: 1px solid var(--desktop-titlebar-line);
  box-shadow: none;
  user-select: none;
}

.desktop-titlebar__drag-region {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
}

.desktop-titlebar__drag-pad {
  flex: 1 1 auto;
  min-width: 2rem;
  height: 100%;
}

.desktop-titlebar__traffic-gap {
  flex: none;
  width: 72px;
  height: 100%;
}

.desktop-titlebar__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 100%;
}

.desktop-titlebar__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  border: 0;
  border-radius: 10px;
  background: var(--desktop-titlebar-control-bg);
  border: 1px solid var(--desktop-titlebar-control-border);
  color: var(--desktop-titlebar-control-ink);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.desktop-titlebar__icon-button svg {
  width: 1rem;
  height: 1rem;
}

.desktop-titlebar__icon-button:hover,
.desktop-titlebar__icon-button--active {
  background: var(--desktop-titlebar-control-bg-hover);
  border-color: color-mix(in srgb, var(--desktop-titlebar-control-border) 40%, transparent);
  color: var(--desktop-titlebar-control-ink-hover);
  transform: translateY(-1px);
}

.desktop-floating-layer {
  position: absolute;
  inset: 38px 0 0;
  z-index: 25;
}

.desktop-floating-layer__search {
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

.desktop-workbench--settings {
  grid-template-columns: minmax(0, 1fr);
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
