<script setup lang="ts">
import type {
  DesktopAccentId,
  DesktopAccentOption,
  DesktopMarkdownThemeId,
  DesktopMarkdownThemeOption,
  DesktopThemeMode,
} from '@/composables/useDesktopPreferences'
import type { DesktopLatestRelease, DesktopReleaseUpdateStatus } from '@/composables/useDesktopReleaseUpdates'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopAppearanceSettingsPanel from '@/components/settings/DesktopAppearanceSettingsPanel.vue'
import DesktopDataSettingsPanel from '@/components/settings/DesktopDataSettingsPanel.vue'
import DesktopSettingsNav, { type DesktopSettingsSection } from '@/components/settings/DesktopSettingsNav.vue'
import DesktopUpdatesSettingsPanel from '@/components/settings/DesktopUpdatesSettingsPanel.vue'

const props = defineProps<{
  accentId: DesktopAccentId
  accentOptions: DesktopAccentOption[]
  actionMessage?: string
  activeSection: DesktopSettingsSection
  busyAction?: 'app-data' | 'logs' | 'export' | null
  currentVersion?: string
  lastCheckedAt?: string
  latestRelease: DesktopLatestRelease | null
  markdownThemeId: DesktopMarkdownThemeId
  markdownThemeOptions: DesktopMarkdownThemeOption[]
  themeMode: DesktopThemeMode
  updateMessage?: string
  updateStatus: DesktopReleaseUpdateStatus
}>()

const emit = defineEmits<{
  checkUpdates: []
  close: []
  exportLogs: []
  installUpdate: []
  openLatestRelease: []
  openAppDataDirectory: []
  openLogsDirectory: []
  selectSection: [section: DesktopSettingsSection]
  updateAccent: [accentId: DesktopAccentId]
  updateMarkdownTheme: [themeId: DesktopMarkdownThemeId]
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
          <p class="desktop-settings-view__summary">这里只保留主题、更新、数据与日志等系统级配置。</p>
        </div>
      </div>

      <button class="desktop-settings-view__back" type="button" @click="emit('close')">
        <DesktopUiIcon name="chevron-left" :size="16" />
        <span>返回阅读</span>
      </button>
    </header>

    <div class="desktop-settings-view__shell">
      <aside class="desktop-settings-view__nav">
        <div class="desktop-settings-view__nav-copy">
          <p class="desktop-settings-view__nav-kicker">System</p>
          <h3>配置分组</h3>
          <p>设置不会影响当前阅读位置，返回后会回到你上次停留的文档。</p>
        </div>

        <DesktopSettingsNav :active-section="props.activeSection" @select="emit('selectSection', $event)" />
      </aside>

      <div class="desktop-settings-view__content desktop-scroll">
        <div class="desktop-settings-view__content-stage">
          <DesktopAppearanceSettingsPanel
            v-if="props.activeSection === 'appearance'"
            :accent-id="props.accentId"
            :accent-options="props.accentOptions"
            :markdown-theme-id="props.markdownThemeId"
            :markdown-theme-options="props.markdownThemeOptions"
            :theme-mode="props.themeMode"
            @update-accent="emit('updateAccent', $event)"
            @update-markdown-theme="emit('updateMarkdownTheme', $event)"
            @update-theme-mode="emit('updateThemeMode', $event)"
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
    </div>
  </section>
</template>

<style scoped>
.desktop-settings-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.desktop-settings-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.05rem;
  padding: 0.1rem 0.08rem 0;
}

.desktop-settings-view__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.76rem;
  min-width: 0;
}

.desktop-settings-view__title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.08rem;
  height: 2.08rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.14);
  border-radius: 13px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.12), rgba(var(--desktop-accent-rgb), 0.05)),
    var(--desktop-surface-strong);
  color: var(--desktop-accent);
}

.desktop-settings-view__title-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.desktop-settings-view__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.06rem;
  font-weight: 680;
}

.desktop-settings-view__summary {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.76rem;
  line-height: 1.56;
}

.desktop-settings-view__back {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  padding: 0.54rem 0.74rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
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
  grid-template-columns: 224px minmax(0, 1fr);
  gap: 0.9rem;
  min-height: 0;
  height: 100%;
}

.desktop-settings-view__nav {
  display: grid;
  align-content: start;
  gap: 0.92rem;
  min-height: 0;
  padding: 1rem 0.84rem;
  border: 1px solid var(--desktop-line);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.06), transparent 26%),
    var(--desktop-surface);
  box-shadow: var(--shadow-panel);
}

.desktop-settings-view__nav-copy {
  display: grid;
  gap: 0.22rem;
  padding: 0.12rem 0.28rem 0;
}

.desktop-settings-view__nav-kicker {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-settings-view__nav-copy h3 {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.92rem;
  font-weight: 680;
}

.desktop-settings-view__nav-copy p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.73rem;
  line-height: 1.55;
}

.desktop-settings-view__content {
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.032), transparent 18%),
    var(--desktop-surface);
  box-shadow: var(--shadow-panel);
}

.desktop-settings-view__content-stage {
  display: grid;
  align-content: start;
  width: 100%;
  min-height: 100%;
  padding: 1.18rem 1.24rem 1.26rem;
}

@media (max-width: 1180px) {
  .desktop-settings-view__shell {
    grid-template-columns: 1fr;
  }

  .desktop-settings-view__nav {
    padding: 0.84rem;
  }
}
</style>
