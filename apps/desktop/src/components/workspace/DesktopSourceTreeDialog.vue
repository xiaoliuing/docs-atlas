<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'
import { pickFolderPath, validateSourcePath } from '@/api/workspaces'
import DesktopSourceTreeNodeEditor from './DesktopSourceTreeNodeEditor.vue'
import {
  collectSourceTreeIssues,
  countDraftGroups,
  countDraftSources,
  createFolderDraft,
  createGroupDraft,
  findDraftNode,
  flattenDraftNodes,
  inferFolderDisplayName,
  insertDraftChild,
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
  workspace: WorkspaceDetail | null
}>()

const emit = defineEmits<{
  close: []
  save: [sources: ReturnType<typeof serializeWorkspaceSources>]
}>()

const state = reactive({
  draftNodes: [] as WorkspaceSourceNodeDraft[],
  pathStatuses: {} as Record<string, { exists: boolean; isDirectory: boolean } | undefined>,
  pathValidationTokens: {} as Record<string, number>,
  validatingPathIds: {} as Record<string, boolean | undefined>,
})

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
  state.draftNodes = insertDraftChild(state.draftNodes, null, (index) => createGroupDraft(null, index))
  syncDraftParentIds(state.draftNodes)
}

function handleAddRootFolder() {
  addFolderNode(null)
}

async function handleAddNestedGroup(parentId: string) {
  state.draftNodes = insertDraftChild(state.draftNodes, parentId, (index) => createGroupDraft(parentId, index))
  syncDraftParentIds(state.draftNodes)
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
    target.name = inferFolderDisplayName(folderPath)
  }
  await validateFolderNode(target.id, target.path)
}

function handleRemoveNode(nodeId: string) {
  state.draftNodes = removeDraftNode(state.draftNodes, nodeId)
  delete state.pathStatuses[nodeId]
  syncDraftParentIds(state.draftNodes)
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
  state.draftNodes = insertDraftChild(state.draftNodes, parentId, (index) =>
    createFolderDraft(parentId, index),
  )
  syncDraftParentIds(state.draftNodes)
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
    target.name = nextName
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
            {{ groupCount }} 个分组 · {{ sourceCount }} 个目录源
          </p>
        </div>

        <button
          aria-label="关闭文档源编辑器"
          class="desktop-source-tree-dialog__close"
          type="button"
          @click="handleClose"
        >
          <span />
          <span />
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
          :is-validating-path-by-node-id="state.validatingPathIds"
          :issues-by-node-id="issuesByNodeId"
          :path-statuses-by-node-id="state.pathStatuses"
          @add-folder="handleAddNestedFolder"
          @add-group="handleAddNestedGroup"
          @browse-folder="handleBrowseFolder"
          @remove-node="handleRemoveNode"
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
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
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
  position: relative;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-muted);
  cursor: pointer;
}

.desktop-source-tree-dialog__close span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.78rem;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
}

.desktop-source-tree-dialog__close span:first-child {
  transform: translate(-50%, -50%) rotate(45deg);
}

.desktop-source-tree-dialog__close span:last-child {
  transform: translate(-50%, -50%) rotate(-45deg);
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
