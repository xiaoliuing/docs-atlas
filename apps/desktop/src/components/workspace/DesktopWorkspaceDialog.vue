<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { WorkspaceDetail, WorkspaceSearchScope } from '@docs-atlas/shared-types/workspace'
import type { DesktopAccentOption } from '@/composables/useDesktopPreferences'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'

type WorkspaceForm = {
  name: string
  description: string
  color: string
  defaultSearchScope: WorkspaceSearchScope
}

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  accentOptions: DesktopAccentOption[]
  canDelete?: boolean
  docCount?: number
  isSaving: boolean
  isDeleting?: boolean
  isExporting?: boolean
  isImporting?: boolean
  mode: 'create' | 'edit'
  sourceCount?: number
  unhealthySourceCount?: number
  workspaceCount?: number
  workspace?: WorkspaceDetail | null
}>()

const emit = defineEmits<{
  close: []
  delete: []
  editSources: []
  export: []
  import: []
  submit: [payload: WorkspaceForm]
}>()

const scopeOptions: Array<{ id: WorkspaceSearchScope; label: string; description: string }> = [
  { id: 'global', label: '全局', description: '默认跨全部文档仓库搜索' },
  { id: 'workspace', label: '当前文档仓库', description: '默认只检索当前文档仓库内容' },
]

const form = reactive<WorkspaceForm>({
  name: '',
  description: '',
  color: '#1f54d9',
  defaultSearchScope: 'global',
})
const deleteConfirmState = reactive({ value: false })

const isValid = computed(() => form.name.trim().length > 0)
const dialogTitle = computed(() => (props.mode === 'edit' ? '文档仓库设置' : '新建文档仓库'))
const submitLabel = computed(() => {
  if (props.isSaving) {
    return props.mode === 'edit' ? '保存中...' : '创建中...'
  }

  return props.mode === 'edit' ? '保存设置' : '创建文档仓库'
})
const canDeleteWorkspace = computed(() => props.mode === 'edit' && Boolean(props.canDelete))
const canExportWorkspace = computed(() => props.mode === 'edit' && Boolean(props.workspace))
const canManageSources = computed(() => props.mode === 'edit' && Boolean(props.workspace))
const deleteLabel = computed(() => {
  if (props.isDeleting) {
    return '删除中...'
  }

  return deleteConfirmState.value ? '确认删除文档仓库' : '删除文档仓库'
})
const importLabel = computed(() => (props.isImporting ? '导入中...' : '导入文档仓库'))
const exportLabel = computed(() => (props.isExporting ? '导出中...' : '导出配置'))

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
  form.defaultSearchScope = 'global'
  deleteConfirmState.value = false
}

function fillForm() {
  deleteConfirmState.value = false

  if (props.mode === 'edit' && props.workspace) {
    form.name = props.workspace.name
    form.description = props.workspace.description
    form.color = props.workspace.color
    form.defaultSearchScope = props.workspace.defaultSearchScope
    return
  }

  resetForm()
}

function handleSubmit() {
  if (!isValid.value || props.isSaving) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color,
    defaultSearchScope: form.defaultSearchScope,
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

function handleEditSources() {
  if (!canManageSources.value) {
    return
  }

  emit('editSources')
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
        </div>

        <button
          :aria-label="props.mode === 'edit' ? '关闭文档仓库设置对话框' : '关闭新建文档仓库对话框'"
          class="desktop-workspace-dialog__close"
          type="button"
          @click="handleClose"
        >
          <DesktopUiIcon name="close" :size="16" />
        </button>
      </header>

      <div class="desktop-workspace-dialog__body">
        <section v-if="canManageSources" class="desktop-workspace-dialog__section">
          <div class="desktop-workspace-dialog__section-head">
            <div>
              <p class="desktop-workspace-dialog__section-kicker">Current Repository</p>
              <h3 class="desktop-workspace-dialog__section-title">当前文档仓库设置</h3>
            </div>
            <button
              class="desktop-workspace-dialog__section-action"
              type="button"
              @click="handleEditSources"
            >
              文档源设置
            </button>
          </div>

          <div class="desktop-workspace-dialog__repository-card">
            <div class="desktop-workspace-dialog__repository-metrics">
              <span class="desktop-workspace-dialog__repository-chip">{{ `${props.sourceCount ?? 0} 个文档源` }}</span>
              <span class="desktop-workspace-dialog__repository-chip">{{ `${props.docCount ?? 0} 篇文档` }}</span>
              <span
                v-if="(props.unhealthySourceCount ?? 0) > 0"
                class="desktop-workspace-dialog__repository-chip desktop-workspace-dialog__repository-chip--warning"
              >
                {{ `${props.unhealthySourceCount} 个异常` }}
              </span>
            </div>
            <p class="desktop-workspace-dialog__repository-summary">
              文档源树、目录校验和分组结构统一从这里进入管理。
            </p>
          </div>
        </section>

        <div class="desktop-workspace-dialog__utility">
          <button
            :disabled="props.isImporting"
            class="desktop-workspace-dialog__utility-button"
            type="button"
            @click="handleImport"
          >
            {{ importLabel }}
          </button>
          <button
            v-if="canExportWorkspace"
            :disabled="props.isExporting"
            class="desktop-workspace-dialog__utility-button"
            type="button"
            @click="handleExport"
          >
            {{ exportLabel }}
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

        <div class="desktop-workspace-dialog__field">
          <span>默认搜索范围</span>
          <div class="desktop-workspace-dialog__scope-grid">
            <button
              v-for="option in scopeOptions"
              :key="option.id"
              :class="[
                'desktop-workspace-dialog__scope-option',
                { 'desktop-workspace-dialog__scope-option--active': form.defaultSearchScope === option.id },
              ]"
              type="button"
              @click="form.defaultSearchScope = option.id"
            >
              <strong>{{ option.label }}</strong>
              <span>{{ option.description }}</span>
            </button>
          </div>
        </div>

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
          :disabled="!isValid || props.isSaving"
          class="desktop-workspace-dialog__primary"
          type="button"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.desktop-workspace-dialog__utility {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 0.2rem;
}

.desktop-workspace-dialog__utility-button {
  min-height: 2.2rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-workspace-dialog__utility-button:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}
</style>

<style scoped>
.desktop-workspace-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(7, 13, 24, 0.26);
  backdrop-filter: blur(10px);
}

.desktop-workspace-dialog__panel {
  width: min(34rem, calc(100vw - 2rem));
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--desktop-line);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.05), transparent 28%),
    var(--desktop-surface-strong);
  box-shadow: 0 24px 60px rgba(var(--desktop-shadow), 0.18);
}

.desktop-workspace-dialog__header,
.desktop-workspace-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
}

.desktop-workspace-dialog__eyebrow {
  margin: 0 0 0.18rem;
  color: var(--desktop-soft);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-workspace-dialog__title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 1.06rem;
  font-weight: 650;
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

.desktop-workspace-dialog__body {
  display: grid;
  gap: 0.82rem;
}

.desktop-workspace-dialog__section {
  display: grid;
  gap: 0.68rem;
  padding: 0.8rem 0.84rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(var(--desktop-accent-rgb), 0.06), transparent 78%),
    var(--desktop-surface);
}

.desktop-workspace-dialog__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.desktop-workspace-dialog__section-kicker {
  margin: 0 0 0.14rem;
  color: var(--desktop-soft);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-workspace-dialog__section-title {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.94rem;
  font-weight: 660;
}

.desktop-workspace-dialog__section-action {
  min-height: 2.2rem;
  padding: 0.45rem 0.82rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 14px;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  cursor: pointer;
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
  border-color: rgba(186, 75, 56, 0.16);
  background: rgba(186, 75, 56, 0.08);
  color: #b14d34;
}

.desktop-workspace-dialog__repository-summary {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.72rem;
  line-height: 1.48;
}

.desktop-workspace-dialog__field {
  display: grid;
  gap: 0.42rem;
}

.desktop-workspace-dialog__field span {
  color: var(--desktop-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.desktop-workspace-dialog__field-hint {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.72rem;
  line-height: 1.45;
}

.desktop-workspace-dialog__input,
.desktop-workspace-dialog__textarea {
  width: 100%;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: var(--desktop-field-bg);
  color: var(--desktop-ink);
  font: inherit;
  padding: 0.74rem 0.86rem;
}

.desktop-workspace-dialog__textarea {
  resize: vertical;
  min-height: 5rem;
}

.desktop-workspace-dialog__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.desktop-workspace-dialog__color {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: var(--workspace-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  cursor: pointer;
}

.desktop-workspace-dialog__color--active {
  box-shadow:
    0 0 0 3px rgba(var(--desktop-accent-rgb), 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.desktop-workspace-dialog__scope-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.desktop-workspace-dialog__scope-option {
  display: grid;
  gap: 0.14rem;
  padding: 0.7rem 0.78rem;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: rgba(var(--desktop-accent-rgb), 0.03);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-workspace-dialog__scope-option strong {
  color: var(--desktop-ink);
  font-size: 0.8rem;
  font-weight: 600;
}

.desktop-workspace-dialog__scope-option span {
  color: var(--desktop-muted);
  font-size: 0.71rem;
  line-height: 1.4;
}

.desktop-workspace-dialog__scope-option:hover,
.desktop-workspace-dialog__scope-option--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.08);
  transform: translateY(-1px);
}

.desktop-workspace-dialog__footer {
  justify-content: flex-end;
}

.desktop-workspace-dialog__danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid rgba(186, 75, 56, 0.16);
  border-radius: 16px;
  background: rgba(186, 75, 56, 0.05);
}

.desktop-workspace-dialog__danger-copy {
  display: grid;
  gap: 0.18rem;
}

.desktop-workspace-dialog__danger-copy strong {
  color: var(--desktop-ink);
  font-size: 0.82rem;
}

.desktop-workspace-dialog__danger-copy p {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.74rem;
  line-height: 1.5;
}

.desktop-workspace-dialog__danger-button {
  flex: none;
  min-height: 2.35rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(186, 75, 56, 0.2);
  border-radius: 12px;
  background: rgba(186, 75, 56, 0.1);
  color: #b14d34;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.desktop-workspace-dialog__danger-button--confirming {
  background: #b14d34;
  border-color: #b14d34;
  color: white;
}

.desktop-workspace-dialog__ghost,
.desktop-workspace-dialog__primary {
  min-height: 2.5rem;
  padding: 0.55rem 0.95rem;
  border-radius: 12px;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-workspace-dialog__ghost {
  border: 1px solid var(--desktop-line);
  background: transparent;
  color: var(--desktop-muted);
}

.desktop-workspace-dialog__primary {
  border: 0;
  background: var(--desktop-accent);
  color: white;
}

.desktop-workspace-dialog__primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

</style>
