<script setup lang="ts">
import { computed } from 'vue'
import type { WorkspaceSourceNodeDraft } from '@/utils/workspaceTree'

const node = defineModel<WorkspaceSourceNodeDraft>('node', { required: true })

const props = defineProps<{
  depth: number
  disabled?: boolean
  isValidatingPathByNodeId: Record<string, boolean | undefined>
  issuesByNodeId: Record<string, string[]>
  pathStatusesByNodeId: Record<string, {
    exists: boolean
    isDirectory: boolean
  } | undefined>
}>()

const emit = defineEmits<{
  addFolder: [parentId: string]
  addGroup: [parentId: string]
  browseFolder: [nodeId: string]
  removeNode: [nodeId: string]
}>()

const nodeIssues = computed(() => props.issuesByNodeId[node.value.id] ?? [])
const pathStatus = computed(() => props.pathStatusesByNodeId[node.value.id])
const isValidatingPath = computed(() => Boolean(props.isValidatingPathByNodeId[node.value.id]))
const pathStatusLabel = computed(() => {
  if (node.value.kind !== 'folder') {
    return ''
  }

  if (!node.value.path.trim()) {
    return '支持手动输入目录，或点击右侧选择目录。'
  }

  if (isValidatingPath.value) {
    return '正在校验目录...'
  }

  if (!pathStatus.value) {
    return '等待目录校验结果。'
  }

  if (!pathStatus.value.exists) {
    return '目录不存在'
  }

  if (!pathStatus.value.isDirectory) {
    return '路径不是目录'
  }

  return '目录有效'
})

const pathStatusTone = computed(() => {
  if (node.value.kind !== 'folder' || !node.value.path.trim()) {
    return 'muted'
  }

  if (isValidatingPath.value) {
    return 'pending'
  }

  if (pathStatus.value?.exists && pathStatus.value.isDirectory) {
    return 'success'
  }

  return 'error'
})
</script>

<template>
  <section
    class="desktop-source-tree-node"
    :style="{ '--source-tree-depth': depth }"
  >
    <div class="desktop-source-tree-node__card">
      <div class="desktop-source-tree-node__row">
        <span
          :class="[
            'desktop-source-tree-node__kind',
            `desktop-source-tree-node__kind--${node.kind}`,
          ]"
        >
          {{ node.kind === 'group' ? 'Group' : 'Source' }}
        </span>

        <input
          v-model="node.name"
          :disabled="disabled"
          class="desktop-source-tree-node__name"
          :placeholder="node.kind === 'group' ? '分组名称' : '文档源名称'"
          type="text"
        />

        <label class="desktop-source-tree-node__switch">
          <input
            v-model="node.enabled"
            :disabled="disabled"
            type="checkbox"
          />
          <span>{{ node.enabled ? '启用' : '停用' }}</span>
        </label>
      </div>

      <div
        v-if="node.kind === 'folder'"
        class="desktop-source-tree-node__path-row"
      >
        <input
          v-model="node.path"
          :disabled="disabled"
          class="desktop-source-tree-node__path"
          placeholder="输入本地文档目录路径"
          type="text"
        />
        <button
          :disabled="disabled"
          class="desktop-source-tree-node__browse"
          type="button"
          @click="emit('browseFolder', node.id)"
        >
          选择目录
        </button>
      </div>

      <div
        v-if="node.kind === 'folder'"
        :class="[
          'desktop-source-tree-node__path-hint',
          `desktop-source-tree-node__path-hint--${pathStatusTone}`,
        ]"
      >
        {{ pathStatusLabel }}
      </div>

      <div
        v-if="nodeIssues.length > 0"
        class="desktop-source-tree-node__issues"
      >
        <span
          v-for="issue in nodeIssues"
          :key="issue"
          class="desktop-source-tree-node__issue"
        >
          {{ issue }}
        </span>
      </div>

      <div class="desktop-source-tree-node__actions">
        <button
          :disabled="disabled"
          class="desktop-source-tree-node__action"
          type="button"
          @click="emit('addGroup', node.id)"
        >
          添加分组
        </button>
        <button
          :disabled="disabled"
          class="desktop-source-tree-node__action"
          type="button"
          @click="emit('addFolder', node.id)"
        >
          新建目录卡片
        </button>
        <button
          :disabled="disabled"
          class="desktop-source-tree-node__action desktop-source-tree-node__action--danger"
          type="button"
          @click="emit('removeNode', node.id)"
        >
          删除
        </button>
      </div>
    </div>

    <div
      v-if="node.children.length > 0"
      class="desktop-source-tree-node__children"
    >
      <DesktopSourceTreeNodeEditor
        v-for="(child, index) in node.children"
        :key="child.id"
        v-model:node="node.children[index]"
        :depth="depth + 1"
        :disabled="disabled"
        :is-validating-path-by-node-id="isValidatingPathByNodeId"
        :issues-by-node-id="issuesByNodeId"
        :path-statuses-by-node-id="pathStatusesByNodeId"
        @add-folder="emit('addFolder', $event)"
        @add-group="emit('addGroup', $event)"
        @browse-folder="emit('browseFolder', $event)"
        @remove-node="emit('removeNode', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.desktop-source-tree-node {
  display: grid;
  gap: 0.55rem;
}

.desktop-source-tree-node__card {
  display: grid;
  gap: 0.6rem;
  padding: 0.8rem;
  margin-left: calc(var(--source-tree-depth, 0) * 0.85rem);
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  background: var(--desktop-surface);
}

.desktop-source-tree-node__row,
.desktop-source-tree-node__path-row,
.desktop-source-tree-node__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.desktop-source-tree-node__kind {
  flex: none;
  min-height: 1.75rem;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-source-tree-node__kind--group {
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
}

.desktop-source-tree-node__kind--folder {
  background: rgba(47, 123, 95, 0.1);
  color: #2f7b5f;
}

.desktop-source-tree-node__name,
.desktop-source-tree-node__path {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--desktop-ink);
  font: inherit;
  padding: 0.58rem 0.72rem;
}

.desktop-source-tree-node__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--desktop-muted);
  font-size: 0.78rem;
}

.desktop-source-tree-node__switch input {
  margin: 0;
}

.desktop-source-tree-node__browse,
.desktop-source-tree-node__action {
  flex: none;
  min-height: 2.2rem;
  padding: 0.45rem 0.72rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-ink);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.desktop-source-tree-node__path-hint {
  font-size: 0.74rem;
  line-height: 1.45;
  color: var(--desktop-muted);
}

.desktop-source-tree-node__path-hint--pending {
  color: var(--desktop-soft);
}

.desktop-source-tree-node__path-hint--success {
  color: #2f7b5f;
}

.desktop-source-tree-node__path-hint--error {
  color: #c53c53;
}

.desktop-source-tree-node__action--danger {
  color: #c55353;
}

.desktop-source-tree-node__actions {
  flex-wrap: wrap;
}

.desktop-source-tree-node__issues {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.desktop-source-tree-node__issue {
  min-height: 1.75rem;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  background: rgba(217, 72, 95, 0.12);
  color: #c53c53;
  font-size: 0.72rem;
  font-weight: 600;
}

.desktop-source-tree-node__children {
  display: grid;
  gap: 0.55rem;
}

@media (prefers-color-scheme: dark) {
  .desktop-source-tree-node__name,
  .desktop-source-tree-node__path {
    background: rgba(14, 22, 36, 0.84);
  }
}

:global(:root[data-theme-mode='dark']) .desktop-source-tree-node__name,
:global(:root[data-theme-mode='dark']) .desktop-source-tree-node__path {
  background: rgba(14, 22, 36, 0.84);
}
</style>
