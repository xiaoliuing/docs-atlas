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
      <p class="workspace-sidebar__eyebrow">WS</p>
      <h2 class="workspace-sidebar__title">空间</h2>
    </div>

    <div class="workspace-sidebar__list desktop-scroll">
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
          <strong>{{ workspace.name }}</strong>
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
  justify-items: center;
  gap: 0.25rem;
  padding: 1rem 0.55rem 0.85rem;
  border-bottom: 1px solid var(--desktop-line);
  background: var(--desktop-surface-strong);
}

.workspace-sidebar__eyebrow {
  margin: 0;
  color: var(--desktop-accent);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.workspace-sidebar__title {
  margin: 0;
  font-size: 0.92rem;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.08em;
}

.workspace-sidebar__list {
  display: grid;
  gap: 0.5rem;
  padding: 0.7rem 0.55rem;
  overflow-y: auto;
  align-content: start;
}

.workspace-sidebar__item {
  display: grid;
  justify-items: center;
  gap: 0.42rem;
  align-items: start;
  width: 100%;
  min-height: 84px;
  padding: 0.7rem 0.45rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
  text-align: center;
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
  width: 28px;
  height: 4px;
  border-radius: 999px;
}

.workspace-sidebar__item-copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  justify-items: center;
}

.workspace-sidebar__item-copy strong {
  max-width: 100%;
  font-size: 0.78rem;
  line-height: 1.35;
  word-break: break-word;
}

.workspace-sidebar__item-summary {
  color: var(--desktop-soft);
  line-height: 1.32;
  font-size: 0.7rem;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
