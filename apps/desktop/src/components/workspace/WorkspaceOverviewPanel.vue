<script setup lang="ts">
import { computed } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import WorkspaceSourceTree from '@/components/workspace/WorkspaceSourceTree.vue'

const props = defineProps<{
  workspace: WorkspaceDetail | null
}>()

const stats = computed(() => {
  const workspace = props.workspace
  if (!workspace) {
    return {
      folders: 0,
      groups: 0,
      lastOpenedLabel: '未记录',
    }
  }

  let folders = 0
  let groups = 0
  const stack = [...workspace.sources]

  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }

    if (node.kind === 'group') {
      groups += 1
    } else {
      folders += 1
    }

    stack.push(...node.children)
  }

  return {
    folders,
    groups,
    lastOpenedLabel: workspace.lastOpenedAt ? '近期使用' : '未记录',
  }
})
</script>

<template>
  <section class="workspace-overview-panel">
    <template v-if="workspace">
      <header class="workspace-overview-panel__header">
        <div>
          <p class="workspace-overview-panel__eyebrow">Current Workspace</p>
          <h2 class="workspace-overview-panel__title">{{ workspace.name }}</h2>
          <p class="workspace-overview-panel__summary">{{ workspace.description }}</p>
        </div>
        <div class="workspace-overview-panel__badges">
          <code class="workspace-overview-panel__code">{{ workspace.id }}</code>
          <span class="workspace-overview-panel__badge">Nested Sources</span>
        </div>
      </header>

      <div class="workspace-overview-panel__meta">
        <div class="workspace-overview-panel__meta-item">
          <span>根节点</span>
          <strong>{{ workspace.sources.length }}</strong>
        </div>
        <div class="workspace-overview-panel__meta-item">
          <span>Folder</span>
          <strong>{{ stats.folders }}</strong>
        </div>
        <div class="workspace-overview-panel__meta-item">
          <span>Group</span>
          <strong>{{ stats.groups }}</strong>
        </div>
        <div class="workspace-overview-panel__meta-item">
          <span>活跃状态</span>
          <strong>{{ stats.lastOpenedLabel }}</strong>
        </div>
      </div>

      <div class="workspace-overview-panel__body">
        <div class="workspace-overview-panel__section">
          <div class="workspace-overview-panel__section-head">
            <h3>Source Tree</h3>
            <span>支持 Group / Folder 嵌套与独立工作环境</span>
          </div>
          <div class="workspace-overview-panel__tree-shell">
            <WorkspaceSourceTree :nodes="workspace.sources" />
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="workspace-overview-panel__empty"
    >
      暂无工作环境。
    </div>
  </section>
</template>

<style scoped>
.workspace-overview-panel {
  display: grid;
  gap: 0.95rem;
  padding: 1.15rem;
  border-radius: var(--desktop-radius-lg);
}

.workspace-overview-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding-bottom: 0.95rem;
  border-bottom: 1px solid var(--desktop-line);
}

.workspace-overview-panel__eyebrow {
  margin: 0 0 0.4rem;
  color: var(--desktop-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.workspace-overview-panel__title {
  margin: 0;
  font-size: 1.28rem;
}

.workspace-overview-panel__summary {
  margin: 0.5rem 0 0;
  color: var(--desktop-muted);
  line-height: 1.58;
  font-size: 0.95rem;
}

.workspace-overview-panel__badges {
  display: grid;
  gap: 0.45rem;
  justify-items: end;
}

.workspace-overview-panel__code {
  padding: 0.4rem 0.68rem;
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-soft);
  font-family: var(--desktop-font-mono);
  font-size: 0.78rem;
}

.workspace-overview-panel__badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0.18rem 0.58rem;
  border-radius: 999px;
  background: var(--desktop-surface-muted);
  color: var(--desktop-soft);
  font-size: 0.78rem;
}

.workspace-overview-panel__meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.workspace-overview-panel__meta-item {
  display: grid;
  gap: 0.28rem;
  min-height: 82px;
  padding: 0.82rem 0.9rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
}

.workspace-overview-panel__meta-item span {
  color: var(--desktop-soft);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.workspace-overview-panel__meta-item strong {
  font-size: 1.06rem;
}

.workspace-overview-panel__section {
  display: grid;
  gap: 0.8rem;
}

.workspace-overview-panel__section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.workspace-overview-panel__section-head h3,
.workspace-overview-panel__section-head span {
  margin: 0;
}

.workspace-overview-panel__section-head span {
  color: var(--desktop-soft);
  font-size: 0.88rem;
}

.workspace-overview-panel__tree-shell {
  padding: 0.8rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-muted);
}

.workspace-overview-panel__empty {
  padding: 1.5rem;
  border-radius: var(--desktop-radius-lg);
  background: rgba(var(--desktop-accent-rgb), 0.08);
}

@media (max-width: 720px) {
  .workspace-overview-panel {
    padding: 1rem;
  }

  .workspace-overview-panel__header,
  .workspace-overview-panel__section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-overview-panel__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .workspace-overview-panel__meta {
    grid-template-columns: 1fr;
  }
}
</style>
