<script setup lang="ts">
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import type { DesktopAccentId, DesktopAccentOption, DesktopThemeMode } from '@/composables/useDesktopPreferences'
import type { DesktopLatestRelease, DesktopReleaseUpdateStatus } from '@/composables/useDesktopReleaseUpdates'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopAppearanceSettingsPanel from '@/components/settings/DesktopAppearanceSettingsPanel.vue'
import DesktopDataSettingsPanel from '@/components/settings/DesktopDataSettingsPanel.vue'
import DesktopSettingsNav, { type DesktopSettingsSection } from '@/components/settings/DesktopSettingsNav.vue'
import DesktopUpdatesSettingsPanel from '@/components/settings/DesktopUpdatesSettingsPanel.vue'
import DesktopWorkspaceSettingsPanel from '@/components/settings/DesktopWorkspaceSettingsPanel.vue'

const props = defineProps<{
  accentId: DesktopAccentId
  accentOptions: DesktopAccentOption[]
  actionMessage?: string
  activeSection: DesktopSettingsSection
  busyAction?: 'app-data' | 'logs' | 'export' | null
  currentVersion?: string
  currentWorkspace: WorkspaceDetail | null
  docCount: number
  isExportingWorkspace: boolean
  isImportingWorkspace: boolean
  lastCheckedAt?: string
  latestRelease: DesktopLatestRelease | null
  sourceCount: number
  themeMode: DesktopThemeMode
  updateMessage?: string
  updateStatus: DesktopReleaseUpdateStatus
  unhealthySourceCount: number
  workspaceCount: number
}>()

const emit = defineEmits<{
  checkUpdates: []
  close: []
  createWorkspace: []
  editSources: []
  editWorkspace: []
  exportLogs: []
  exportWorkspace: []
  importWorkspace: []
  installUpdate: []
  openLatestRelease: []
  openAppDataDirectory: []
  openLogsDirectory: []
  selectSection: [section: DesktopSettingsSection]
  updateAccent: [accentId: DesktopAccentId]
  updateThemeMode: [themeMode: DesktopThemeMode]
}>()
</script>

<template>
  <section class="desktop-settings-view">
    <header class="desktop-settings-view__header">
      <div class="desktop-settings-view__title-wrap">
        <span class="desktop-settings-view__title-mark" aria-hidden="true">
          <DesktopUiIcon name="settings" :size="16" />
        </span>
        <div class="desktop-settings-view__title-copy">
          <h2 class="desktop-settings-view__title">应用设置</h2>
          <p class="desktop-settings-view__summary">系统外观、仓库管理、更新与本地数据。</p>
        </div>
      </div>

      <button class="desktop-settings-view__back" type="button" @click="emit('close')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-settings-view__shell">
      <aside class="desktop-settings-view__nav">
        <DesktopSettingsNav :active-section="props.activeSection" @select="emit('selectSection', $event)" />
      </aside>

      <div class="desktop-settings-view__content desktop-scroll">
        <DesktopAppearanceSettingsPanel
          v-if="props.activeSection === 'appearance'"
          :accent-id="props.accentId"
          :accent-options="props.accentOptions"
          :theme-mode="props.themeMode"
          @update-accent="emit('updateAccent', $event)"
          @update-theme-mode="emit('updateThemeMode', $event)"
        />

        <DesktopWorkspaceSettingsPanel
          v-else-if="props.activeSection === 'workspace'"
          :current-workspace="props.currentWorkspace"
          :doc-count="props.docCount"
          :is-exporting-workspace="props.isExportingWorkspace"
          :is-importing-workspace="props.isImportingWorkspace"
          :source-count="props.sourceCount"
          :unhealthy-source-count="props.unhealthySourceCount"
          :workspace-count="props.workspaceCount"
          @create-workspace="emit('createWorkspace')"
          @edit-sources="emit('editSources')"
          @edit-workspace="emit('editWorkspace')"
          @export-workspace="emit('exportWorkspace')"
          @import-workspace="emit('importWorkspace')"
        />

        <DesktopUpdatesSettingsPanel
          v-else-if="props.activeSection === 'updates'"
          :current-version="props.currentVersion"
          :last-checked-at="props.lastCheckedAt"
          :latest-release="props.latestRelease"
          :update-message="props.updateMessage"
          :update-status="props.updateStatus"
          @check-updates="emit('checkUpdates')"
          @install-update="emit('installUpdate')"
          @open-latest-release="emit('openLatestRelease')"
        />

        <DesktopDataSettingsPanel
          v-else
          :action-message="props.actionMessage"
          :busy-action="props.busyAction"
          @export-logs="emit('exportLogs')"
          @open-app-data-directory="emit('openAppDataDirectory')"
          @open-logs-directory="emit('openLogsDirectory')"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.desktop-settings-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.88rem;
  min-height: 0;
  height: 100%;
}

.desktop-settings-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 0.15rem 0.05rem 0;
}

.desktop-settings-view__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.72rem;
  min-width: 0;
}

.desktop-settings-view__title-mark {
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

.desktop-settings-view__title-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.desktop-settings-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.08rem;
  font-weight: 670;
}

.desktop-settings-view__summary {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.75rem;
  line-height: 1.52;
}

.desktop-settings-view__back {
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

.desktop-settings-view__back:hover {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-settings-view__back span {
  font-size: 0.74rem;
  font-weight: 600;
}

.desktop-settings-view__shell {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 0;
  min-height: 0;
  height: 100%;
  border: 1px solid var(--desktop-line);
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(var(--desktop-accent-rgb), 0.06), transparent 28%),
    var(--desktop-surface-strong);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.desktop-settings-view__nav {
  min-height: 0;
  padding: 0.92rem 0.62rem;
  border-right: 1px solid var(--desktop-line);
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.04), transparent 28%),
    color-mix(in srgb, var(--desktop-surface) 88%, rgba(var(--desktop-accent-rgb), 0.03));
}

.desktop-settings-view__content {
  min-height: 0;
  overflow: auto;
  padding: 0.94rem 1.05rem 1.12rem;
}

@media (max-width: 1180px) {
  .desktop-settings-view__shell {
    grid-template-columns: 1fr;
  }

  .desktop-settings-view__nav {
    padding: 0.8rem;
    border-right: 0;
    border-bottom: 1px solid var(--desktop-line);
  }
}
</style>
