<script setup lang="ts">
import type { WorkspaceSummary } from '@docs-atlas/shared-types/workspace'

defineProps<{
  currentWorkspaceId: string
  workspaces: WorkspaceSummary[]
}>()

const emit = defineEmits<{
  selectWorkspace: [workspaceId: string]
}>()
</script>

<template>
  <section class="workspace-sidebar">
    <div class="workspace-sidebar__header">
      <p class="workspace-sidebar__eyebrow">Workspace</p>
      <h2 class="workspace-sidebar__title">工作环境</h2>
      <p class="workspace-sidebar__summary">本地知识库按工作环境隔离管理。</p>
    </div>

    <div class="workspace-sidebar__list desktop-scroll">
      <p class="workspace-sidebar__section-label">最近打开</p>
      <button
        v-for="workspace in workspaces"
        :key="workspace.id"
        :class="[
          'workspace-sidebar__item',
          {
            'workspace-sidebar__item--active':
              workspace.id === currentWorkspaceId,
          },
        ]"
        type="button"
        @click="emit('selectWorkspace', workspace.id)"
      >
        <span class="workspace-sidebar__accent" :style="{ backgroundColor: workspace.color || '#1f54d9' }" />
        <span class="workspace-sidebar__item-copy">
          <span class="workspace-sidebar__item-top">
            <strong>{{ workspace.name }}</strong>
            <small>{{ workspace.lastOpenedAt ? '已使用' : '未使用' }}</small>
          </span>
          <small class="workspace-sidebar__item-summary">
            {{ workspace.description || '未填写描述' }}
          </small>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.workspace-sidebar {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100%;
}

.workspace-sidebar__header {
  display: grid;
  gap: 0.35rem;
  padding: 1.1rem 1.05rem 0.9rem;
  border-bottom: 1px solid var(--desktop-line);
  background: var(--desktop-surface-strong);
}

.workspace-sidebar__eyebrow {
  margin: 0;
  color: var(--desktop-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.workspace-sidebar__title {
  margin: 0;
  font-size: 1.05rem;
}

.workspace-sidebar__summary {
  margin: 0;
  color: var(--desktop-muted);
  line-height: 1.5;
  font-size: 0.88rem;
}

.workspace-sidebar__list {
  display: grid;
  gap: 0.55rem;
  padding: 0.85rem;
  overflow-y: auto;
}

.workspace-sidebar__section-label {
  margin: 0 0 0.1rem;
  color: var(--desktop-soft);
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-sidebar__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 0.78rem 0.85rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.workspace-sidebar__item:hover,
.workspace-sidebar__item--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.06);
  transform: translateY(-1px);
}

.workspace-sidebar__accent {
  width: 4px;
  align-self: stretch;
  border-radius: 999px;
}

.workspace-sidebar__item-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.workspace-sidebar__item-top {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.workspace-sidebar__item-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
}

.workspace-sidebar__item-top small {
  flex-shrink: 0;
  color: var(--desktop-soft);
  font-size: 0.74rem;
}

.workspace-sidebar__item-summary {
  color: var(--desktop-soft);
  line-height: 1.42;
  font-size: 0.84rem;
  text-wrap: balance;
}
</style>
