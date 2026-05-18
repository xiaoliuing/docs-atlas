<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { WorkspaceDetail, WorkspaceSourceStatus } from '@docs-atlas/shared-types/workspace'
import { pickFolderPath, pickFolderPaths, validateSourcePath } from '@/api/workspaces'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopSourceTreeNodeEditor from './DesktopSourceTreeNodeEditor.vue'
import {
  collectSourceTreeIssues,
  countDraftGroups,
  countDraftSources,
  createFolderDraft,
  createGroupDraft,
  type DraftNodeDropPlacement,
  findDraftNode,
  flattenDraftNodes,
  inferFolderDisplayName,
  insertDraftChild,
  moveDraftNodeByDrop,
  moveDraftNode,
  normalizeDraftPositions,
  removeDraftNode,
  serializeWorkspaceSources,
  syncDraftParentIds,
  cloneSourceNodes,
  type WorkspaceSourceNodeDraft,
} from '@/utils/workspaceTree'

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  isSaving: boolean
  isScanning: boolean
  runtimeSourceStatusesByNodeId: Record<string, WorkspaceSourceStatus | undefined>
  workspace: WorkspaceDetail | null
}>()

const emit = defineEmits<{
  close: []
  save: [sources: ReturnType<typeof serializeWorkspaceSources>]
}>()

const state = reactive({
  draftNodes: [] as WorkspaceSourceNodeDraft[],
  dragOverNodeId: null as string | null,
  dragPlacement: null as DraftNodeDropPlacement | null,
  draggedNodeId: null as string | null,
  expandedNodeIds: [] as string[],
  feedbackMessage: '',
  feedbackTone: 'muted' as 'muted' | 'success' | 'warning',
  pathStatuses: {} as Record<string, { exists: boolean; isDirectory: boolean } | undefined>,
  pathValidationTokens: {} as Record<string, number>,
  validatingPathIds: {} as Record<string, boolean | undefined>,
})

let dragExpandTimer: ReturnType<typeof window.setTimeout> | null = null
let dragExpandTargetId: string | null = null

const issues = computed(() => collectSourceTreeIssues(state.draftNodes, state.pathStatuses))
const issuesByNodeId = computed<Record<string, string[]>>(() =>
  issues.value.reduce<Record<string, string[]>>((result, issue) => {
    result[issue.nodeId] = [...(result[issue.nodeId] ?? []), issue.message]
    return result
  }, {}),
)
const folderPathSnapshot = computed(() =>
  flattenDraftNodes(state.draftNodes)
    .filter((node) => node.kind === 'folder')
    .map((node) => ({
      id: node.id,
      path: node.path.trim(),
    })),
)
const sourceCount = computed(() => countDraftSources(state.draftNodes))
const groupCount = computed(() => countDraftGroups(state.draftNodes))
const hasErrors = computed(() => issues.value.some((issue) => issue.severity === 'error'))
const canSave = computed(() => !props.isSaving && !hasErrors.value && props.workspace !== null)

watch(
  () => [isOpen.value, props.workspace?.id] as const,
  ([open]) => {
    if (!open || !props.workspace) {
      return
    }

    state.draftNodes = cloneSourceNodes(props.workspace.sources)
    state.expandedNodeIds = collectExpandedNodeIds(state.draftNodes)
    resetDragState()
    clearFeedback()
    state.pathStatuses = {}
    void validateAllFolderNodes()
  },
  { immediate: true },
)

watch(folderPathSnapshot, (entries, previousEntries = []) => {
  if (!isOpen.value) {
    return
  }

  const previousMap = new Map(previousEntries.map((entry) => [entry.id, entry.path]))
  const nextNodeIds = new Set(entries.map((entry) => entry.id))

  entries.forEach((entry) => {
    if (previousMap.get(entry.id) !== entry.path) {
      syncFolderNameFromPath(entry.id, entry.path, previousMap.get(entry.id) ?? '')
      void validateFolderNode(entry.id, entry.path)
    }
  })

  Object.keys(state.pathStatuses).forEach((nodeId) => {
    if (!nextNodeIds.has(nodeId)) {
      delete state.pathStatuses[nodeId]
      delete state.pathValidationTokens[nodeId]
      delete state.validatingPathIds[nodeId]
    }
  })
})

async function handleAddRootGroup() {
  const draft = createGroupDraft(null, state.draftNodes.length)
  state.draftNodes = insertDraftChild(state.draftNodes, null, () => draft)
  syncDraftParentIds(state.draftNodes)
  ensureNodeExpanded(draft.id)
  setFeedback('已添加根分组。')
}

function handleAddRootFolder() {
  addFolderNode(null)
}

async function handleAddRootFolders() {
  const folderPaths = await pickFolderPaths()
  if (folderPaths.length === 0) {
    return
  }

  const { addedCount, skippedCount } = appendFolderNodes(null, folderPaths)
  if (addedCount === 0 && skippedCount > 0) {
    setFeedback(`没有导入新目录，已跳过 ${skippedCount} 个重复路径。`, 'warning')
    return
  }

  setFeedback(
    skippedCount > 0
      ? `已导入 ${addedCount} 个目录，跳过 ${skippedCount} 个重复路径。`
      : `已导入 ${addedCount} 个目录。`,
    'success',
  )

  await validateAllFolderNodes()
}

async function handleAddNestedGroup(parentId: string) {
  const parentNode = findDraftNode(state.draftNodes, parentId)
  const draft = createGroupDraft(parentId, parentNode?.children.length ?? 0)
  state.draftNodes = insertDraftChild(state.draftNodes, parentId, () => draft)
  syncDraftParentIds(state.draftNodes)
  ensureNodeExpanded(parentId)
  ensureNodeExpanded(draft.id)
  setFeedback('已添加子分组。')
}

function handleAddNestedFolder(parentId: string) {
  addFolderNode(parentId)
}

async function handleBrowseFolder(nodeId: string) {
  const folderPath = await pickFolderPath()
  if (!folderPath) {
    return
  }

  const target = findDraftNode(state.draftNodes, nodeId)
  if (!target) {
    return
  }

  target.path = folderPath
  if (!target.name.trim() || target.name === '新文档源') {
    target.name = inferUniqueFolderName(folderPath, target.parentId, target.id)
  }
  await validateFolderNode(target.id, target.path)
}

function handleRemoveNode(nodeId: string) {
  const targetNode = findDraftNode(state.draftNodes, nodeId)
  state.draftNodes = removeDraftNode(state.draftNodes, nodeId)
  if (targetNode) {
    const relatedNodeIds = flattenDraftNodes([targetNode]).map((node) => node.id)
    const relatedNodeIdSet = new Set(relatedNodeIds)
    state.expandedNodeIds = state.expandedNodeIds.filter((id) => !relatedNodeIdSet.has(id))
    relatedNodeIds.forEach((relatedNodeId) => {
      delete state.pathStatuses[relatedNodeId]
      delete state.pathValidationTokens[relatedNodeId]
      delete state.validatingPathIds[relatedNodeId]
    })
  }
  syncDraftParentIds(state.draftNodes)
  setFeedback('已删除当前节点。')
}

function handleMoveNode(nodeId: string, direction: -1 | 1) {
  const nextNodes = moveDraftNode(state.draftNodes, nodeId, direction)
  if (nextNodes === state.draftNodes) {
    return
  }

  state.draftNodes = nextNodes
  syncDraftParentIds(state.draftNodes)
  setFeedback(direction < 0 ? '已上移节点。' : '已下移节点。', 'success')
}

function handleDragStart(nodeId: string) {
  state.draggedNodeId = nodeId
}

function handleDragOver(payload: { targetNodeId: string; placement: DraftNodeDropPlacement }) {
  if (!state.draggedNodeId || state.draggedNodeId === payload.targetNodeId) {
    return
  }

  state.dragOverNodeId = payload.targetNodeId
  state.dragPlacement = payload.placement

  if (payload.placement === 'inside') {
    scheduleDragExpand(payload.targetNodeId)
    return
  }

  clearDragExpandTimer()
}

function handleDrop(payload: { targetNodeId: string; placement: DraftNodeDropPlacement }) {
  if (!state.draggedNodeId) {
    return
  }

  const nextNodes = moveDraftNodeByDrop(
    state.draftNodes,
    state.draggedNodeId,
    payload.targetNodeId,
    payload.placement,
  )
  const didMove = nextNodes !== state.draftNodes
  state.draftNodes = nextNodes
  syncDraftParentIds(state.draftNodes)
  if (didMove && payload.placement === 'inside') {
    ensureNodeExpanded(payload.targetNodeId)
  }
  setFeedback(didMove ? '已更新文档源层级。' : '当前拖拽位置无效。', didMove ? 'success' : 'warning')
  resetDragState()
}

function resetDragState() {
  clearDragExpandTimer()
  state.dragOverNodeId = null
  state.dragPlacement = null
  state.draggedNodeId = null
}

function handleClose() {
  isOpen.value = false
  emit('close')
}

function handleSave() {
  if (!canSave.value) {
    return
  }

  normalizeDraftPositions(state.draftNodes)
  syncDraftParentIds(state.draftNodes)
  emit('save', serializeWorkspaceSources(state.draftNodes))
}

function addFolderNode(parentId: string | null) {
  const parentNode = parentId ? findDraftNode(state.draftNodes, parentId) : null
  const draft = createFolderDraft(parentId, parentNode?.children.length ?? state.draftNodes.length)
  state.draftNodes = insertDraftChild(state.draftNodes, parentId, () => draft)
  syncDraftParentIds(state.draftNodes)
  if (parentId) {
    ensureNodeExpanded(parentId)
  }
  setFeedback(parentId ? '已添加子目录卡片。' : '已添加根目录卡片。')
}

function appendFolderNodes(parentId: string | null, folderPaths: string[]) {
  let addedCount = 0
  let skippedCount = 0
  const normalizedExistingPaths = new Set(
    flattenDraftNodes(state.draftNodes)
      .filter((node) => node.kind === 'folder')
      .map((node) => normalizePathValue(node.path)),
  )

  for (const rawPath of folderPaths) {
    const normalizedPath = normalizePathValue(rawPath)
    if (!normalizedPath || normalizedExistingPaths.has(normalizedPath)) {
      skippedCount += 1
      continue
    }

    normalizedExistingPaths.add(normalizedPath)
    const draft = createFolderDraft(
      parentId,
      getSiblingNodes(parentId).length,
      rawPath,
      inferUniqueFolderName(rawPath, parentId),
    )
    state.draftNodes = insertDraftChild(state.draftNodes, parentId, () => draft)
    syncDraftParentIds(state.draftNodes)
    if (parentId) {
      ensureNodeExpanded(parentId)
    }
    addedCount += 1
  }

  return { addedCount, skippedCount }
}

async function validateAllFolderNodes() {
  const folderNodes = flattenDraftNodes(state.draftNodes).filter((node) => node.kind === 'folder')
  await Promise.all(folderNodes.map((node) => validateFolderNode(node.id, node.path)))
}

function syncFolderNameFromPath(nodeId: string, nextPath: string, previousPath: string) {
  const target = findDraftNode(state.draftNodes, nodeId)
  if (!target || target.kind !== 'folder') {
    return
  }

  const normalizedNextPath = nextPath.trim()
  const normalizedPreviousPath = previousPath.trim()
  const nextName = normalizedNextPath ? inferFolderDisplayName(normalizedNextPath) : '新文档源'
  const previousAutoName = normalizedPreviousPath ? inferFolderDisplayName(normalizedPreviousPath) : '新文档源'

  if (!target.name.trim() || target.name === '新文档源' || target.name === previousAutoName) {
    target.name = normalizedNextPath
      ? inferUniqueFolderName(normalizedNextPath, target.parentId, target.id)
      : nextName
  }
}

async function validateFolderNode(nodeId: string, pathValue: string) {
  if (!pathValue.trim()) {
    state.pathStatuses[nodeId] = undefined
    delete state.validatingPathIds[nodeId]
    return
  }

  const token = (state.pathValidationTokens[nodeId] ?? 0) + 1
  state.pathValidationTokens[nodeId] = token
  state.validatingPathIds[nodeId] = true

  const status = await validateSourcePath(pathValue)
  const target = findDraftNode(state.draftNodes, nodeId)
  const currentPath = target?.kind === 'folder' ? target.path.trim() : ''

  if (state.pathValidationTokens[nodeId] !== token || currentPath !== pathValue.trim()) {
    return
  }

  state.pathStatuses[nodeId] = status
  delete state.validatingPathIds[nodeId]
}

function inferUniqueFolderName(pathValue: string, parentId: string | null, excludeNodeId?: string) {
  const normalizedPath = pathValue.trim().replace(/[\\/]+$/, '')
  const segments = normalizedPath.split(/[\\/]/).filter(Boolean)
  const baseName = inferFolderDisplayName(normalizedPath)
  const siblingNames = new Set(
    getSiblingNodes(parentId)
      .filter((node) => node.id !== excludeNodeId)
      .map((node) => node.name.trim())
      .filter(Boolean),
  )

  if (!siblingNames.has(baseName)) {
    return baseName
  }

  const parentSegment = segments.at(-2)
  const compositeName = parentSegment ? `${parentSegment} / ${baseName}` : baseName
  if (!siblingNames.has(compositeName)) {
    return compositeName
  }

  let counter = 2
  let candidate = `${baseName} (${counter})`
  while (siblingNames.has(candidate)) {
    counter += 1
    candidate = `${baseName} (${counter})`
  }

  return candidate
}

function getSiblingNodes(parentId: string | null) {
  if (!parentId) {
    return state.draftNodes
  }

  const parentNode = findDraftNode(state.draftNodes, parentId)
  return parentNode?.children ?? []
}

function normalizePathValue(pathValue: string) {
  return pathValue.replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase()
}

function toggleExpand(nodeId: string) {
  if (state.expandedNodeIds.includes(nodeId)) {
    state.expandedNodeIds = state.expandedNodeIds.filter((id) => id !== nodeId)
    return
  }

  state.expandedNodeIds = [...state.expandedNodeIds, nodeId]
}

function ensureNodeExpanded(nodeId: string) {
  if (!nodeId || state.expandedNodeIds.includes(nodeId)) {
    return
  }

  state.expandedNodeIds = [...state.expandedNodeIds, nodeId]
}

function collectExpandedNodeIds(nodes: WorkspaceSourceNodeDraft[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.children.length > 0 ? [node.id] : []),
    ...collectExpandedNodeIds(node.children),
  ])
}

function clearFeedback() {
  state.feedbackMessage = ''
  state.feedbackTone = 'muted'
}

function setFeedback(message: string, tone: 'muted' | 'success' | 'warning' = 'muted') {
  state.feedbackMessage = message
  state.feedbackTone = tone
}

function scheduleDragExpand(nodeId: string) {
  const targetNode = findDraftNode(state.draftNodes, nodeId)
  if (!targetNode || targetNode.children.length === 0 || state.expandedNodeIds.includes(nodeId)) {
    clearDragExpandTimer()
    return
  }

  if (dragExpandTargetId === nodeId && dragExpandTimer !== null) {
    return
  }

  clearDragExpandTimer()
  dragExpandTargetId = nodeId
  dragExpandTimer = window.setTimeout(() => {
    ensureNodeExpanded(nodeId)
    dragExpandTimer = null
    dragExpandTargetId = null
  }, 380)
}

function clearDragExpandTimer() {
  if (dragExpandTimer !== null) {
    window.clearTimeout(dragExpandTimer)
  }

  dragExpandTimer = null
  dragExpandTargetId = null
}
</script>

<template>
  <div
    v-if="isOpen"
    class="desktop-source-tree-dialog"
    @click="handleClose"
  >
    <section
      class="desktop-source-tree-dialog__panel"
      @click.stop
    >
      <header class="desktop-source-tree-dialog__header">
        <div class="desktop-source-tree-dialog__header-copy">
          <p class="desktop-source-tree-dialog__eyebrow">Source Tree</p>
          <h2 class="desktop-source-tree-dialog__title">
            {{ props.workspace?.name ?? '当前工作区' }} 的文档源
          </h2>
          <p class="desktop-source-tree-dialog__summary">
            {{ groupCount }} 个分组 · {{ sourceCount }} 个目录源{{ props.isScanning ? ' · 检查中' : '' }}
          </p>
        </div>

        <button
          aria-label="关闭文档源编辑器"
          class="desktop-source-tree-dialog__close"
          type="button"
          @click="handleClose"
        >
          <DesktopUiIcon name="close" :size="16" />
        </button>
      </header>

      <div class="desktop-source-tree-dialog__toolbar">
        <button
          :disabled="props.isSaving"
          class="desktop-source-tree-dialog__tool"
          type="button"
          @click="handleAddRootGroup"
        >
          添加根分组
        </button>
        <button
          :disabled="props.isSaving"
          class="desktop-source-tree-dialog__tool"
          type="button"
          @click="handleAddRootFolder"
        >
          新建根目录卡片
        </button>
        <button
          :disabled="props.isSaving"
          class="desktop-source-tree-dialog__tool"
          type="button"
          @click="handleAddRootFolders"
        >
          批量导入目录
        </button>
      </div>

      <div
        v-if="state.feedbackMessage"
        :class="[
          'desktop-source-tree-dialog__toolbar-note',
          `desktop-source-tree-dialog__toolbar-note--${state.feedbackTone}`,
        ]"
      >
        {{ state.feedbackMessage }}
      </div>

      <div
        v-if="state.draftNodes.length === 0"
        class="desktop-source-tree-dialog__empty"
      >
        当前工作区还没有文档源。先新建一个目录卡片，再手动输入路径或点击“选择目录”完成配置。
      </div>

      <div
        v-else
        class="desktop-source-tree-dialog__tree desktop-scroll"
      >
        <DesktopSourceTreeNodeEditor
          v-for="(node, index) in state.draftNodes"
          :key="node.id"
          v-model:node="state.draftNodes[index]"
          :depth="0"
          :disabled="props.isSaving"
          :drag-over-node-id="state.dragOverNodeId"
          :drag-placement="state.dragPlacement"
          :dragged-node-id="state.draggedNodeId"
          :expanded-node-ids="state.expandedNodeIds"
          :is-validating-path-by-node-id="state.validatingPathIds"
          :issues-by-node-id="issuesByNodeId"
          :sibling-count="state.draftNodes.length"
          :sibling-index="index"
          :path-statuses-by-node-id="state.pathStatuses"
          :runtime-source-statuses-by-node-id="props.runtimeSourceStatusesByNodeId"
          @add-folder="handleAddNestedFolder"
          @add-group="handleAddNestedGroup"
          @browse-folder="handleBrowseFolder"
          @drag-end="resetDragState"
          @drag-over-node="handleDragOver"
          @drag-start="handleDragStart"
          @move-node="handleMoveNode"
          @drop-node="handleDrop"
          @remove-node="handleRemoveNode"
          @toggle-expand="toggleExpand"
        />
      </div>

      <div
        v-if="issues.length > 0"
        class="desktop-source-tree-dialog__footer-note"
      >
        还有 {{ issues.length }} 个问题需要处理后才能保存。
      </div>

      <footer class="desktop-source-tree-dialog__footer">
        <button
          class="desktop-source-tree-dialog__ghost"
          type="button"
          @click="handleClose"
        >
          取消
        </button>
        <button
          :disabled="!canSave"
          class="desktop-source-tree-dialog__primary"
          type="button"
          @click="handleSave"
        >
          {{ props.isSaving ? '保存中...' : '保存文档源' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.desktop-source-tree-dialog {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.2rem;
  background: rgba(7, 13, 24, 0.26);
  backdrop-filter: blur(10px);
}

.desktop-source-tree-dialog__panel {
  width: min(62rem, calc(100vw - 2rem));
  max-height: min(82vh, 56rem);
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
  gap: 0.95rem;
  padding: 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 28%),
    var(--desktop-surface-strong);
  box-shadow: 0 24px 60px rgba(var(--desktop-shadow), 0.18);
}

.desktop-source-tree-dialog__header,
.desktop-source-tree-dialog__toolbar,
.desktop-source-tree-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.desktop-source-tree-dialog__toolbar-note {
  margin-top: -0.2rem;
  color: var(--desktop-soft);
  font-size: 0.74rem;
  line-height: 1.45;
}

.desktop-source-tree-dialog__toolbar-note--success {
  color: #2f7b5f;
}

.desktop-source-tree-dialog__toolbar-note--warning {
  color: #b87529;
}

.desktop-source-tree-dialog__header-copy {
  display: grid;
  gap: 0.16rem;
}

.desktop-source-tree-dialog__eyebrow {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-source-tree-dialog__title,
.desktop-source-tree-dialog__summary {
  margin: 0;
}

.desktop-source-tree-dialog__title {
  color: var(--desktop-ink);
  font-size: 1.08rem;
  font-weight: 650;
}

.desktop-source-tree-dialog__summary {
  color: var(--desktop-muted);
  font-size: 0.8rem;
}

.desktop-source-tree-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-muted);
  cursor: pointer;
}

.desktop-source-tree-dialog__tool,
.desktop-source-tree-dialog__ghost,
.desktop-source-tree-dialog__primary {
  min-height: 2.4rem;
  padding: 0.52rem 0.85rem;
  border-radius: 12px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
}

.desktop-source-tree-dialog__tool,
.desktop-source-tree-dialog__ghost {
  border: 1px solid var(--desktop-line);
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-ink);
  cursor: pointer;
}

.desktop-source-tree-dialog__primary {
  border: 0;
  background: var(--desktop-accent);
  color: white;
  cursor: pointer;
}

.desktop-source-tree-dialog__primary:disabled,
.desktop-source-tree-dialog__tool:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.desktop-source-tree-dialog__tree {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 0.65rem;
  padding-right: 0.2rem;
}

.desktop-source-tree-dialog__empty,
.desktop-source-tree-dialog__footer-note {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  font-size: 0.8rem;
}

.desktop-source-tree-dialog__empty {
  border: 1px dashed rgba(var(--desktop-accent-rgb), 0.18);
  color: var(--desktop-muted);
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-source-tree-dialog__footer-note {
  background: rgba(217, 72, 95, 0.08);
  color: #b14656;
}

.desktop-source-tree-dialog__footer {
  justify-content: flex-end;
}
</style>
