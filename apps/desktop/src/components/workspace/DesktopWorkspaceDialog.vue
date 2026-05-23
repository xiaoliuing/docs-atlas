<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import type { WorkspaceDetail, WorkspaceSourceNode, WorkspaceSourceNodeInput } from '@docs-atlas/shared-types/workspace'
import type { DesktopAccentOption } from '@/composables/useDesktopPreferences'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'
import DesktopSourceTreeDialog from './DesktopSourceTreeDialog.vue'

type WorkspaceForm = {
  name: string
  description: string
  color: string
  sources: WorkspaceSourceNodeInput[]
}

type CreateEntryMode = 'create' | 'import'

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  accentOptions: DesktopAccentOption[]
  canDelete?: boolean
  docCount?: number
  isDeleting?: boolean
  isExporting?: boolean
  isImporting?: boolean
  isSaving: boolean
  mode: 'create' | 'edit'
  sourceCount?: number
  unhealthySourceCount?: number
  workspaceCount?: number
  workspace?: WorkspaceDetail | null
}>()

const emit = defineEmits<{
  close: []
  delete: []
  export: []
  import: []
  submit: [payload: WorkspaceForm]
}>()

const form = reactive<WorkspaceForm>({
  name: '',
  description: '',
  color: '#1f54d9',
  sources: [],
})
const deleteConfirmState = reactive({ value: false })
const createEntryMode = shallowRef<CreateEntryMode>('create')
const isSourceDialogOpen = shallowRef(false)

const isValid = computed(() => form.name.trim().length > 0)
const isCreateMode = computed(() => props.mode === 'create')
const isEditMode = computed(() => props.mode === 'edit')
const isImportMode = computed(() => isCreateMode.value && createEntryMode.value === 'import')
const dialogTitle = computed(() => (isEditMode.value ? '编辑文档仓库' : '新建文档仓库'))
const submitLabel = computed(() => {
  if (props.isSaving) {
    return isEditMode.value ? '保存中...' : '创建中...'
  }

  return isEditMode.value ? '保存文档仓库' : '创建文档仓库'
})
const canDeleteWorkspace = computed(() => isEditMode.value && Boolean(props.canDelete))
const canExportWorkspace = computed(() => isEditMode.value && Boolean(props.workspace))
const deleteLabel = computed(() => {
  if (props.isDeleting) {
    return '删除中...'
  }

  return deleteConfirmState.value ? '确认删除文档仓库' : '删除文档仓库'
})
const importLabel = computed(() => (props.isImporting ? '导入中...' : '导入文档仓库'))
const totalSourceCount = computed(() => countFolderSources(form.sources))
const totalGroupCount = computed(() => countGroupSources(form.sources))
const draftWorkspace = computed<WorkspaceDetail | null>(() => ({
  id: props.workspace?.id ?? 'workspace:draft',
  name: form.name.trim() || '未命名文档仓库',
  description: form.description.trim(),
  icon: props.workspace?.icon ?? 'folder',
  color: form.color,
  defaultSearchScope: props.workspace?.defaultSearchScope ?? 'global',
  sortOrder: props.workspace?.sortOrder ?? 0,
  createdAt: props.workspace?.createdAt ?? '',
  updatedAt: props.workspace?.updatedAt ?? '',
  lastOpenedAt: props.workspace?.lastOpenedAt ?? null,
  sources: toWorkspaceNodes(form.sources, props.workspace?.id ?? 'workspace:draft'),
}))

watch(
  () => [isOpen.value, props.mode, props.workspace?.id] as const,
  ([open]) => {
    if (open) {
      fillForm()
      return
    }

    resetForm()
  },
  { immediate: true },
)

function resetForm() {
  form.name = ''
  form.description = ''
  form.color = props.accentOptions[0]?.hex ?? '#1f54d9'
  form.sources = []
  deleteConfirmState.value = false
  createEntryMode.value = 'create'
  isSourceDialogOpen.value = false
}

function fillForm() {
  deleteConfirmState.value = false
  isSourceDialogOpen.value = false
  createEntryMode.value = 'create'

  if (isEditMode.value && props.workspace) {
    form.name = props.workspace.name
    form.description = props.workspace.description
    form.color = props.workspace.color
    form.sources = cloneSourceInputs(toSourceInputs(props.workspace.sources))
    return
  }

  resetForm()
}

function handleSubmit() {
  if (!isValid.value || props.isSaving || isImportMode.value) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color,
    sources: cloneSourceInputs(form.sources),
  })
}

function handleClose() {
  isOpen.value = false
  emit('close')
}

function handleDelete() {
  if (!canDeleteWorkspace.value || props.isDeleting) {
    return
  }

  if (!deleteConfirmState.value) {
    deleteConfirmState.value = true
    return
  }

  emit('delete')
}

function handleImport() {
  if (props.isImporting) {
    return
  }

  emit('import')
}

function handleExport() {
  if (!canExportWorkspace.value || props.isExporting) {
    return
  }

  emit('export')
}

function handleSourceSave(sources: WorkspaceSourceNodeInput[]) {
  form.sources = cloneSourceInputs(sources)
  isSourceDialogOpen.value = false
}

function countFolderSources(nodes: WorkspaceSourceNodeInput[]) {
  return nodes.reduce((count, node) => {
    const selfCount = node.kind === 'folder' ? 1 : 0
    return count + selfCount + countFolderSources(node.children ?? [])
  }, 0)
}

function countGroupSources(nodes: WorkspaceSourceNodeInput[]) {
  return nodes.reduce((count, node) => {
    const selfCount = node.kind === 'group' ? 1 : 0
    return count + selfCount + countGroupSources(node.children ?? [])
  }, 0)
}

function cloneSourceInputs(nodes: WorkspaceSourceNodeInput[]): WorkspaceSourceNodeInput[] {
  return nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId ?? null,
    kind: node.kind,
    name: node.name,
    path: node.path ?? '',
    enabled: node.enabled ?? true,
    position: node.position ?? 0,
    children: cloneSourceInputs(node.children ?? []),
  }))
}

function toSourceInputs(nodes: WorkspaceSourceNode[]): WorkspaceSourceNodeInput[] {
  return nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    kind: node.kind,
    name: node.name,
    path: node.path,
    enabled: node.enabled,
    position: node.position,
    children: toSourceInputs(node.children),
  }))
}

function toWorkspaceNodes(nodes: WorkspaceSourceNodeInput[], workspaceId: string): WorkspaceSourceNode[] {
  return nodes.map((node, index) => ({
    id: node.id,
    workspaceId,
    parentId: node.parentId ?? null,
    kind: node.kind,
    name: node.name,
    path: node.path ?? '',
    enabled: node.enabled ?? true,
    position: node.position ?? index,
    children: toWorkspaceNodes(node.children ?? [], workspaceId),
  }))
}
</script>

<template>
  <div
    v-if="isOpen"
    class="desktop-workspace-dialog"
    @click="handleClose"
  >
    <section
      class="desktop-workspace-dialog__panel"
      @click.stop
    >
      <header class="desktop-workspace-dialog__header">
        <div>
          <p class="desktop-workspace-dialog__eyebrow">Repository</p>
          <h2 class="desktop-workspace-dialog__title">{{ dialogTitle }}</h2>
          <p class="desktop-workspace-dialog__summary">
            {{ isEditMode ? '修改当前文档仓库及其文档源。' : '创建新的文档仓库，或切换到导入已有配置。' }}
          </p>
        </div>

        <button
          :aria-label="isEditMode ? '关闭编辑文档仓库对话框' : '关闭新建文档仓库对话框'"
          class="desktop-workspace-dialog__close"
          type="button"
          @click="handleClose"
        >
          <DesktopUiIcon name="close" :size="16" />
        </button>
      </header>

      <div v-if="isCreateMode" class="desktop-workspace-dialog__entry-switch">
        <button
          :class="[
            'desktop-workspace-dialog__entry-option',
            { 'desktop-workspace-dialog__entry-option--active': createEntryMode === 'create' },
          ]"
          type="button"
          @click="createEntryMode = 'create'"
        >
          创建文档仓库
        </button>
        <button
          :class="[
            'desktop-workspace-dialog__entry-option',
            { 'desktop-workspace-dialog__entry-option--active': createEntryMode === 'import' },
          ]"
          type="button"
          @click="createEntryMode = 'import'"
        >
          导入配置
        </button>
      </div>

      <div v-if="isImportMode" class="desktop-workspace-dialog__import-state">
        <div class="desktop-workspace-dialog__import-card">
          <p class="desktop-workspace-dialog__section-kicker">Import</p>
          <h3 class="desktop-workspace-dialog__section-title">从配置文件导入文档仓库</h3>
          <p class="desktop-workspace-dialog__import-copy">
            适合直接接管已有的文档仓库定义。导入会写入一个完整的新文档仓库，创建表单不会参与这次操作。
          </p>
          <button
            :disabled="props.isImporting"
            class="desktop-workspace-dialog__primary"
            type="button"
            @click="handleImport"
          >
            {{ importLabel }}
          </button>
        </div>
      </div>

      <div v-else class="desktop-workspace-dialog__body">
        <section class="desktop-workspace-dialog__section">
          <div class="desktop-workspace-dialog__section-head">
            <div>
              <p class="desktop-workspace-dialog__section-kicker">Metadata</p>
              <h3 class="desktop-workspace-dialog__section-title">基础信息</h3>
            </div>
            <button
              v-if="canExportWorkspace"
              :disabled="props.isExporting"
              class="desktop-workspace-dialog__section-action"
              type="button"
              @click="handleExport"
            >
              {{ props.isExporting ? '导出中...' : '导出配置' }}
            </button>
          </div>

          <label class="desktop-workspace-dialog__field">
            <span>名称</span>
            <input
              v-model="form.name"
              class="desktop-workspace-dialog__input"
              maxlength="48"
              placeholder="例如：后端设计 / 个人知识库"
              type="text"
            />
          </label>

          <label class="desktop-workspace-dialog__field">
            <span>描述</span>
            <textarea
              v-model="form.description"
              class="desktop-workspace-dialog__textarea"
              maxlength="160"
              placeholder="一句话说明这个文档仓库的用途。"
              rows="3"
            />
          </label>

          <div class="desktop-workspace-dialog__field">
            <span>文档仓库标识色</span>
            <div class="desktop-workspace-dialog__colors">
              <button
                v-for="accent in props.accentOptions"
                :key="accent.id"
                :aria-label="`选择主题色 ${accent.label}`"
                :class="[
                  'desktop-workspace-dialog__color',
                  { 'desktop-workspace-dialog__color--active': form.color === accent.hex },
                ]"
                :style="{ '--workspace-color': accent.hex }"
                type="button"
                @click="form.color = accent.hex"
              />
            </div>
            <p class="desktop-workspace-dialog__field-hint">
              仅用于文档仓库圆点和识别标记，不会修改应用的全局主题配色。
            </p>
          </div>
        </section>

        <section class="desktop-workspace-dialog__section">
          <div class="desktop-workspace-dialog__section-head">
            <div>
              <p class="desktop-workspace-dialog__section-kicker">Sources</p>
              <h3 class="desktop-workspace-dialog__section-title">文档源</h3>
            </div>
            <button
              class="desktop-workspace-dialog__section-action"
              type="button"
              @click="isSourceDialogOpen = true"
            >
              {{ totalSourceCount > 0 || totalGroupCount > 0 ? '编辑文档源' : '设置文档源' }}
            </button>
          </div>

          <div class="desktop-workspace-dialog__repository-card">
            <div class="desktop-workspace-dialog__repository-metrics">
              <span class="desktop-workspace-dialog__repository-chip">{{ `${totalSourceCount} 个文档源` }}</span>
              <span class="desktop-workspace-dialog__repository-chip">{{ `${totalGroupCount} 个分组` }}</span>
              <span
                v-if="isEditMode"
                class="desktop-workspace-dialog__repository-chip"
              >
                {{ `${props.docCount ?? 0} 篇文档` }}
              </span>
              <span
                v-if="isEditMode && (props.unhealthySourceCount ?? 0) > 0"
                class="desktop-workspace-dialog__repository-chip desktop-workspace-dialog__repository-chip--warning"
              >
                {{ `${props.unhealthySourceCount} 个异常` }}
              </span>
            </div>
            <p class="desktop-workspace-dialog__repository-summary">
              文档源是非必填项。你可以现在配置，也可以先创建文档仓库，后续再补充目录结构。
            </p>
          </div>
        </section>

        <div
          v-if="canDeleteWorkspace"
          class="desktop-workspace-dialog__danger"
        >
          <div class="desktop-workspace-dialog__danger-copy">
            <strong>删除当前文档仓库</strong>
            <p v-if="props.workspaceCount && props.workspaceCount > 1">
              删除后会移除该文档仓库及其文档源配置，不会删除原始文档目录。
            </p>
            <p v-else>
              至少保留一个文档仓库，当前文档仓库不可删除。
            </p>
          </div>

          <button
            :disabled="props.isDeleting || !props.canDelete"
            :class="[
              'desktop-workspace-dialog__danger-button',
              { 'desktop-workspace-dialog__danger-button--confirming': deleteConfirmState.value },
            ]"
            type="button"
            @click="handleDelete"
          >
            {{ deleteLabel }}
          </button>
        </div>
      </div>

      <footer class="desktop-workspace-dialog__footer">
        <button
          class="desktop-workspace-dialog__ghost"
          type="button"
          @click="handleClose"
        >
          取消
        </button>
        <button
          v-if="!isImportMode"
          :disabled="!isValid || props.isSaving"
          class="desktop-workspace-dialog__primary"
          type="button"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </button>
      </footer>

      <DesktopSourceTreeDialog
        v-model:open="isSourceDialogOpen"
        :is-saving="false"
        :is-scanning="false"
        :runtime-source-statuses-by-node-id="{}"
        :workspace="draftWorkspace"
        @close="isSourceDialogOpen = false"
        @save="handleSourceSave"
      />
    </section>
  </div>
</template>

<style scoped>
.desktop-workspace-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  overflow: auto;
  background: rgba(7, 13, 24, 0.26);
  backdrop-filter: blur(10px);
}

.desktop-workspace-dialog__panel {
  width: min(38rem, calc(100vw - 2rem));
  max-height: min(86vh, 52rem);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 28%),
    var(--desktop-surface-strong);
  box-shadow: 0 24px 60px rgba(var(--desktop-shadow), 0.18);
}

.desktop-workspace-dialog__header,
.desktop-workspace-dialog__footer,
.desktop-workspace-dialog__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
}

.desktop-workspace-dialog__eyebrow,
.desktop-workspace-dialog__section-kicker {
  margin: 0 0 0.18rem;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-workspace-dialog__title,
.desktop-workspace-dialog__section-title {
  margin: 0;
  color: var(--desktop-ink);
}

.desktop-workspace-dialog__title {
  font-size: 1.06rem;
  font-weight: 650;
}

.desktop-workspace-dialog__summary,
.desktop-workspace-dialog__repository-summary,
.desktop-workspace-dialog__field-hint,
.desktop-workspace-dialog__danger-copy p,
.desktop-workspace-dialog__import-copy {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.55;
}

.desktop-workspace-dialog__section-title {
  font-size: 0.94rem;
  font-weight: 660;
}

.desktop-workspace-dialog__close {
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

.desktop-workspace-dialog__entry-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.34rem;
  padding: 0.26rem;
  border: 1px solid var(--desktop-line);
  border-radius: 16px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
}

.desktop-workspace-dialog__entry-option {
  min-height: 2.35rem;
  padding: 0.46rem 0.7rem;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--desktop-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 630;
  cursor: pointer;
}

.desktop-workspace-dialog__entry-option--active {
  background: var(--desktop-surface);
  color: var(--desktop-accent);
  box-shadow: inset 0 0 0 1px rgba(var(--desktop-accent-rgb), 0.12);
}

.desktop-workspace-dialog__import-state,
.desktop-workspace-dialog__body {
  display: grid;
  gap: 0.82rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.14rem;
}

.desktop-workspace-dialog__import-card,
.desktop-workspace-dialog__section,
.desktop-workspace-dialog__danger {
  display: grid;
  gap: 0.68rem;
  padding: 0.88rem 0.92rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.06), transparent 78%),
    var(--desktop-surface);
}

.desktop-workspace-dialog__import-card {
  justify-items: start;
}

.desktop-workspace-dialog__section-action,
.desktop-workspace-dialog__ghost,
.desktop-workspace-dialog__primary,
.desktop-workspace-dialog__danger-button {
  min-height: 2.2rem;
  padding: 0.45rem 0.82rem;
  border-radius: 14px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
}

.desktop-workspace-dialog__section-action,
.desktop-workspace-dialog__ghost {
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-ink);
  cursor: pointer;
}

.desktop-workspace-dialog__primary {
  border: 0;
  background: var(--desktop-accent);
  color: white;
  cursor: pointer;
}

.desktop-workspace-dialog__primary:disabled,
.desktop-workspace-dialog__danger-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.desktop-workspace-dialog__field {
  display: grid;
  gap: 0.42rem;
}

.desktop-workspace-dialog__field span {
  color: var(--desktop-ink);
  font-size: 0.78rem;
  font-weight: 620;
}

.desktop-workspace-dialog__input,
.desktop-workspace-dialog__textarea {
  width: 100%;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  font: inherit;
  font-size: 0.82rem;
  padding: 0.7rem 0.8rem;
  resize: vertical;
}

.desktop-workspace-dialog__colors {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.48rem;
}

.desktop-workspace-dialog__color {
  width: 100%;
  height: 2.15rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: color-mix(in srgb, var(--workspace-color) 16%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace-color) 22%, transparent);
  cursor: pointer;
}

.desktop-workspace-dialog__color--active {
  border-color: color-mix(in srgb, var(--workspace-color) 62%, white);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--workspace-color) 34%, transparent),
    0 0 0 2px rgba(var(--desktop-accent-rgb), 0.12);
}

.desktop-workspace-dialog__repository-card {
  display: grid;
  gap: 0.48rem;
}

.desktop-workspace-dialog__repository-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.36rem;
}

.desktop-workspace-dialog__repository-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.52rem;
  padding: 0.14rem 0.52rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.1);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
  font-size: 0.67rem;
  font-weight: 620;
}

.desktop-workspace-dialog__repository-chip--warning {
  border-color: rgba(217, 131, 40, 0.18);
  background: rgba(217, 131, 40, 0.11);
  color: #b56a1f;
}

.desktop-workspace-dialog__danger {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.desktop-workspace-dialog__danger-copy {
  display: grid;
  gap: 0.22rem;
}

.desktop-workspace-dialog__danger-copy strong {
  color: var(--desktop-ink);
  font-size: 0.82rem;
  font-weight: 650;
}

.desktop-workspace-dialog__danger-button {
  border: 1px solid rgba(199, 72, 92, 0.2);
  background: rgba(199, 72, 92, 0.08);
  color: #b14656;
  cursor: pointer;
}

.desktop-workspace-dialog__danger-button--confirming {
  background: rgba(199, 72, 92, 0.16);
}

.desktop-workspace-dialog__footer {
  flex: none;
  justify-content: flex-end;
  padding-top: 0.1rem;
}
</style>
