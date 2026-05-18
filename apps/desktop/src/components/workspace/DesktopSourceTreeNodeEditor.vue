<script setup lang="ts">
import { computed } from 'vue'
import type { WorkspaceSourceStatus } from '@docs-atlas/shared-types/workspace'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import type { DraftNodeDropPlacement, WorkspaceSourceNodeDraft } from '@/utils/workspaceTree'

const node = defineModel<WorkspaceSourceNodeDraft>('node', { required: true })

const props = defineProps<{
  depth: number
  disabled?: boolean
  dragOverNodeId?: string | null
  dragPlacement?: DraftNodeDropPlacement | null
  draggedNodeId?: string | null
  expandedNodeIds: string[]
  isValidatingPathByNodeId: Record<string, boolean | undefined>
  issuesByNodeId: Record<string, string[]>
  siblingCount?: number
  siblingIndex?: number
  runtimeSourceStatusesByNodeId: Record<string, WorkspaceSourceStatus | undefined>
  pathStatusesByNodeId: Record<string, {
    exists: boolean
    isDirectory: boolean
  } | undefined>
}>()

const emit = defineEmits<{
  addFolder: [parentId: string]
  addGroup: [parentId: string]
  browseFolder: [nodeId: string]
  dragEnd: []
  dragOverNode: [payload: { targetNodeId: string; placement: DraftNodeDropPlacement }]
  dragStart: [nodeId: string]
  moveNode: [nodeId: string, direction: -1 | 1]
  dropNode: [payload: { targetNodeId: string; placement: DraftNodeDropPlacement }]
  removeNode: [nodeId: string]
  toggleExpand: [nodeId: string]
}>()

const nodeIssues = computed(() => props.issuesByNodeId[node.value.id] ?? [])
const pathStatus = computed(() => props.pathStatusesByNodeId[node.value.id])
const isValidatingPath = computed(() => Boolean(props.isValidatingPathByNodeId[node.value.id]))
const runtimeSourceStatus = computed(() => props.runtimeSourceStatusesByNodeId[node.value.id])
const pathStatusLabel = computed(() => {
  if (node.value.kind !== 'folder') {
    return ''
  }

  if (!node.value.path.trim()) {
    return '支持手动输入目录，也可以在上方批量导入多个目录。'
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

  return '目录有效，保存后会参与文档扫描。'
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

const runtimeStatusTone = computed(() => {
  const status = runtimeSourceStatus.value
  if (!status || node.value.kind !== 'folder') {
    return 'muted'
  }

  return status.state === 'ready' ? 'success' : 'error'
})
const canMoveUp = computed(() => (props.siblingIndex ?? 0) > 0)
const canMoveDown = computed(() => (props.siblingIndex ?? 0) < (props.siblingCount ?? 1) - 1)
const isDraggingSelf = computed(() => props.draggedNodeId === node.value.id)
const isDropBeforeActive = computed(() => props.dragOverNodeId === node.value.id && props.dragPlacement === 'before')
const isDropInsideActive = computed(() => props.dragOverNodeId === node.value.id && props.dragPlacement === 'inside')
const isDropAfterActive = computed(() => props.dragOverNodeId === node.value.id && props.dragPlacement === 'after')
const hasChildren = computed(() => node.value.children.length > 0)
const isExpanded = computed(() => props.expandedNodeIds.includes(node.value.id))

function forwardMoveNode(nodeId: string, direction: -1 | 1) {
  emit('moveNode', nodeId, direction)
}

function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer || props.disabled) {
    return
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', node.value.id)
  emit('dragStart', node.value.id)
}

function handleDragEnd() {
  emit('dragEnd')
}

function handleDragOver(event: DragEvent) {
  if (props.disabled || props.draggedNodeId === node.value.id) {
    return
  }

  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  emit('dragOverNode', {
    targetNodeId: node.value.id,
    placement: resolveDropPlacement(event),
  })
}

function handleDrop(event: DragEvent) {
  if (props.disabled || props.draggedNodeId === node.value.id) {
    return
  }

  event.preventDefault()
  emit('dropNode', {
    targetNodeId: node.value.id,
    placement: resolveDropPlacement(event),
  })
}

function resolveDropPlacement(event: DragEvent): DraftNodeDropPlacement {
  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) {
    return 'inside'
  }

  const { top, height } = currentTarget.getBoundingClientRect()
  const offsetY = event.clientY - top
  const threshold = Math.min(18, height * 0.24)

  if (offsetY <= threshold) {
    return 'before'
  }

  if (offsetY >= height - threshold) {
    return 'after'
  }

  return 'inside'
}
</script>

<template>
  <section
    class="desktop-source-tree-node"
    :style="{ '--source-tree-depth': depth }"
  >
    <div
      :class="[
        'desktop-source-tree-node__card',
        {
          'desktop-source-tree-node__card--dragging': isDraggingSelf,
          'desktop-source-tree-node__card--drop-before': isDropBeforeActive,
          'desktop-source-tree-node__card--drop-inside': isDropInsideActive,
          'desktop-source-tree-node__card--drop-after': isDropAfterActive,
        },
      ]"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <div class="desktop-source-tree-node__row">
        <button
          v-if="hasChildren"
          :aria-label="isExpanded ? '收起子节点' : '展开子节点'"
          :disabled="disabled"
          class="desktop-source-tree-node__expand"
          type="button"
          @click="emit('toggleExpand', node.id)"
        >
          <DesktopUiIcon
            name="chevron-down"
            :size="14"
            :class="[
              'desktop-source-tree-node__expand-icon',
              { 'desktop-source-tree-node__expand-icon--collapsed': !isExpanded },
            ]"
          />
        </button>
        <button
          :disabled="disabled"
          class="desktop-source-tree-node__drag-handle"
          draggable="true"
          type="button"
          @dragstart="handleDragStart"
          @dragend="handleDragEnd"
        >
          <DesktopUiIcon name="grip" :size="15" />
        </button>
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
        v-if="node.kind === 'folder' && runtimeSourceStatus"
        :class="[
          'desktop-source-tree-node__runtime-status',
          `desktop-source-tree-node__runtime-status--${runtimeStatusTone}`,
        ]"
      >
        {{ runtimeSourceStatus.message }}
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
          :disabled="disabled || !canMoveUp"
          class="desktop-source-tree-node__icon-action"
          type="button"
          @click="emit('moveNode', node.id, -1)"
        >
          <DesktopUiIcon name="chevron-down" :size="14" class="desktop-source-tree-node__icon-action-icon desktop-source-tree-node__icon-action-icon--up" />
          <span>上移</span>
        </button>
        <button
          :disabled="disabled || !canMoveDown"
          class="desktop-source-tree-node__icon-action"
          type="button"
          @click="emit('moveNode', node.id, 1)"
        >
          <DesktopUiIcon name="chevron-down" :size="14" class="desktop-source-tree-node__icon-action-icon" />
          <span>下移</span>
        </button>
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
      v-if="hasChildren && isExpanded"
      class="desktop-source-tree-node__children"
    >
      <DesktopSourceTreeNodeEditor
        v-for="(child, index) in node.children"
        :key="child.id"
        v-model:node="node.children[index]"
        :depth="depth + 1"
        :disabled="disabled"
        :drag-over-node-id="dragOverNodeId"
        :drag-placement="dragPlacement"
        :dragged-node-id="draggedNodeId"
        :expanded-node-ids="expandedNodeIds"
        :is-validating-path-by-node-id="isValidatingPathByNodeId"
        :issues-by-node-id="issuesByNodeId"
        :sibling-count="node.children.length"
        :sibling-index="index"
        :runtime-source-statuses-by-node-id="runtimeSourceStatusesByNodeId"
        :path-statuses-by-node-id="pathStatusesByNodeId"
        @add-folder="emit('addFolder', $event)"
        @add-group="emit('addGroup', $event)"
        @browse-folder="emit('browseFolder', $event)"
        @drag-end="emit('dragEnd')"
        @drag-over-node="emit('dragOverNode', $event)"
        @drag-start="emit('dragStart', $event)"
        @move-node="forwardMoveNode"
        @drop-node="emit('dropNode', $event)"
        @remove-node="emit('removeNode', $event)"
        @toggle-expand="emit('toggleExpand', $event)"
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
  position: relative;
  display: grid;
  gap: 0.6rem;
  padding: 0.8rem;
  margin-left: calc(var(--source-tree-depth, 0) * 0.85rem);
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  background: var(--desktop-surface);
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}

.desktop-source-tree-node__card--dragging {
  opacity: 0.56;
}

.desktop-source-tree-node__card--drop-inside {
  border-color: rgba(var(--desktop-accent-rgb), 0.38);
  background: rgba(var(--desktop-accent-rgb), 0.06);
  box-shadow: inset 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.12);
}

.desktop-source-tree-node__card--drop-before::before,
.desktop-source-tree-node__card--drop-after::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  height: 2px;
  border-radius: 999px;
  background: var(--desktop-accent);
}

.desktop-source-tree-node__card--drop-before::before {
  top: -1px;
}

.desktop-source-tree-node__card--drop-after::after {
  bottom: -1px;
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

.desktop-source-tree-node__expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.7rem;
  min-height: 1.7rem;
  padding: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 10px;
  background: rgba(var(--desktop-accent-rgb), 0.03);
  color: var(--desktop-soft);
  cursor: pointer;
}

.desktop-source-tree-node__expand-icon {
  transition: transform 0.16s ease;
}

.desktop-source-tree-node__expand-icon--collapsed {
  transform: rotate(-90deg);
}

.desktop-source-tree-node__drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.9rem;
  min-height: 1.9rem;
  padding: 0;
  border: 1px solid var(--desktop-line);
  border-radius: 10px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-soft);
  cursor: grab;
}

.desktop-source-tree-node__drag-handle:active {
  cursor: grabbing;
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

.desktop-source-tree-node__icon-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
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

.desktop-source-tree-node__icon-action:disabled,
.desktop-source-tree-node__action:disabled,
.desktop-source-tree-node__browse:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.desktop-source-tree-node__icon-action-icon--up {
  transform: rotate(180deg);
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

.desktop-source-tree-node__runtime-status {
  font-size: 0.73rem;
  line-height: 1.45;
  color: var(--desktop-soft);
}

.desktop-source-tree-node__runtime-status--success {
  color: #2f7b5f;
}

.desktop-source-tree-node__runtime-status--error {
  color: #c56b2f;
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
