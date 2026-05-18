<script setup lang="ts">
import { computed } from 'vue'
import DesktopSettingsPanel from '@/components/settings/DesktopSettingsPanel.vue'
import WorkspaceOverviewPanel from '@/components/workspace/WorkspaceOverviewPanel.vue'
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar.vue'
import { useWorkspaceSelection } from '@/composables/useWorkspaceSelection'

const { currentWorkspace, currentWorkspaceId, selectWorkspace, workspaces } = useWorkspaceSelection()

const sourceCount = computed(() => currentWorkspace.value?.sources.length ?? 0)
const workspaceLabel = computed(() => currentWorkspace.value?.name ?? '未选择工作环境')
</script>

<template>
  <div class="desktop-app-shell">
    <aside class="desktop-app-shell__sidebar">
      <WorkspaceSidebar
        :current-workspace-id="currentWorkspaceId"
        :workspaces="workspaces"
        @select-workspace="selectWorkspace"
      />
    </aside>

    <main class="desktop-app-shell__main">
      <header class="desktop-app-shell__hero">
        <div class="desktop-app-shell__hero-copy">
          <div class="desktop-app-shell__eyebrow-row">
            <p class="desktop-app-shell__eyebrow">Desktop Preview</p>
            <span class="desktop-app-shell__status">Local-first / SQLite</span>
          </div>
          <h1 class="desktop-app-shell__title">{{ workspaceLabel }}</h1>
          <p class="desktop-app-shell__summary">
            这里会成为用户管理多个工作环境、本地文档来源和后续知识问答的主入口。
            当前版本优先把信息结构和阅读氛围做舒服。
          </p>
        </div>

        <div class="desktop-app-shell__hero-meta">
          <div class="desktop-app-shell__metric">
            <span class="desktop-app-shell__metric-label">Workspaces</span>
            <strong>{{ workspaces.length }}</strong>
          </div>
          <div class="desktop-app-shell__metric">
            <span class="desktop-app-shell__metric-label">Sources</span>
            <strong>{{ sourceCount }}</strong>
          </div>
          <div class="desktop-app-shell__metric">
            <span class="desktop-app-shell__metric-label">Storage</span>
            <strong>SQLite</strong>
          </div>
        </div>
      </header>

      <div class="desktop-app-shell__grid">
        <WorkspaceOverviewPanel :workspace="currentWorkspace" />
        <DesktopSettingsPanel />
      </div>
    </main>
  </div>
</template>

<style scoped>
.desktop-app-shell {
  display: grid;
  grid-template-columns: 308px minmax(0, 1fr);
  gap: 0.95rem;
  min-height: 100vh;
  padding: 0.95rem;
}

.desktop-app-shell__sidebar,
.desktop-app-shell__hero,
.desktop-app-shell__grid > * {
  border: 1px solid var(--desktop-line);
  background: var(--desktop-surface);
  box-shadow: 0 14px 34px rgba(var(--desktop-shadow), 0.08);
}

.desktop-app-shell__sidebar {
  min-height: calc(100vh - 1.9rem);
  border-radius: var(--desktop-radius-lg);
  overflow: hidden;
}

.desktop-app-shell__main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.desktop-app-shell__hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: stretch;
  padding: 1.15rem 1.2rem;
  border-radius: var(--desktop-radius-lg);
}

.desktop-app-shell__hero-copy {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.desktop-app-shell__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.desktop-app-shell__eyebrow {
  margin: 0;
  color: var(--desktop-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-app-shell__status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0.18rem 0.58rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-soft);
  font-size: 0.78rem;
}

.desktop-app-shell__title {
  margin: 0;
  font-size: clamp(1.55rem, 2.5vw, 2.1rem);
  line-height: 1.08;
}

.desktop-app-shell__summary {
  margin: 0;
  max-width: 44rem;
  color: var(--desktop-muted);
  line-height: 1.6;
  font-size: 0.96rem;
}

.desktop-app-shell__hero-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(108px, 1fr));
  gap: 0.65rem;
  min-width: min(100%, 24rem);
  align-self: center;
}

.desktop-app-shell__metric {
  display: grid;
  gap: 0.28rem;
  min-height: 86px;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
}

.desktop-app-shell__metric-label {
  color: var(--desktop-soft);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.desktop-app-shell__metric strong {
  font-size: 1.28rem;
  line-height: 1.1;
}

.desktop-app-shell__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.88fr);
  gap: 0.95rem;
  align-items: start;
}

@media (max-width: 1180px) {
  .desktop-app-shell {
    grid-template-columns: 1fr;
  }

  .desktop-app-shell__sidebar {
    min-height: auto;
  }
}

@media (max-width: 960px) {
  .desktop-app-shell {
    padding: 0.75rem;
  }

  .desktop-app-shell__hero {
    flex-direction: column;
  }

  .desktop-app-shell__hero-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .desktop-app-shell__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .desktop-app-shell__hero-meta {
    grid-template-columns: 1fr;
  }
}
</style>
