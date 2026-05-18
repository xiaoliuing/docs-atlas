<script setup lang="ts">
import type { WorkspaceSourceNode } from '@docs-atlas/shared-types/workspace'

defineProps<{
  node: WorkspaceSourceNode
}>()
</script>

<template>
  <div class="workspace-source-node">
    <div class="workspace-source-node__row">
      <span
        :class="[
          'workspace-source-node__kind',
          {
            'workspace-source-node__kind--group': node.kind === 'group',
          },
        ]"
      >
        {{ node.kind === 'group' ? 'Group' : 'Folder' }}
      </span>
      <strong class="workspace-source-node__name">{{ node.name }}</strong>
      <code class="workspace-source-node__path">{{ node.path || '/' }}</code>
    </div>

    <div
      v-if="node.children.length"
      class="workspace-source-node__children"
    >
      <WorkspaceSourceNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
      />
    </div>
  </div>
</template>

<style scoped>
.workspace-source-node {
  display: grid;
  gap: 0.5rem;
}

.workspace-source-node__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.4rem 0.75rem;
  align-items: center;
  padding: 0.72rem 0.78rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-sm);
  background: var(--desktop-surface-strong);
}

.workspace-source-node__kind {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.14);
  background: rgba(var(--desktop-accent-rgb), 0.06);
  color: var(--desktop-accent);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workspace-source-node__kind--group {
  background: rgba(var(--desktop-accent-rgb), 0.1);
}

.workspace-source-node__name {
  min-width: 0;
  font-size: 0.92rem;
}

.workspace-source-node__path {
  color: var(--desktop-soft);
  font-family: var(--desktop-font-mono);
  font-size: 0.76rem;
  overflow-wrap: anywhere;
  text-align: right;
}

.workspace-source-node__children {
  display: grid;
  gap: 0.5rem;
  margin-left: 0.7rem;
  padding-left: 0.8rem;
  border-left: 1px solid var(--desktop-line);
}

@media (max-width: 720px) {
  .workspace-source-node__row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .workspace-source-node__path {
    grid-column: 2;
    text-align: left;
  }
}
</style>
