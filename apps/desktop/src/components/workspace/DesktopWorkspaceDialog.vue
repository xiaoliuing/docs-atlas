<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

type WorkspaceForm = {
  name: string
  description: string
  color: string
}

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  isSaving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: WorkspaceForm]
}>()

const colorOptions = ['#1f54d9', '#2f7b5f', '#7a5af8', '#d97706', '#d9485f']
const form = reactive<WorkspaceForm>({
  name: '',
  description: '',
  color: colorOptions[0],
})
const isValid = computed(() => form.name.trim().length > 0)

watch(
  isOpen,
  (open) => {
    if (!open) {
      resetForm()
    }
  },
)

function resetForm() {
  form.name = ''
  form.description = ''
  form.color = colorOptions[0]
}

function handleSubmit() {
  if (!isValid.value || props.isSaving) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color,
  })
}

function handleClose() {
  isOpen.value = false
  emit('close')
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
          <p class="desktop-workspace-dialog__eyebrow">Workspace</p>
          <h2 class="desktop-workspace-dialog__title">新建工作区</h2>
        </div>

        <button
          aria-label="关闭新建工作区对话框"
          class="desktop-workspace-dialog__close"
          type="button"
          @click="handleClose"
        >
          <span />
          <span />
        </button>
      </header>

      <div class="desktop-workspace-dialog__body">
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
            placeholder="一句话说明这个工作区的用途。"
            rows="4"
          />
        </label>

        <div class="desktop-workspace-dialog__field">
          <span>主题色</span>
          <div class="desktop-workspace-dialog__colors">
            <button
              v-for="color in colorOptions"
              :key="color"
              :aria-label="`选择主题色 ${color}`"
              :class="[
                'desktop-workspace-dialog__color',
                { 'desktop-workspace-dialog__color--active': form.color === color },
              ]"
              :style="{ '--workspace-color': color }"
              type="button"
              @click="form.color = color"
            />
          </div>
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
          {{ props.isSaving ? '创建中...' : '创建工作区' }}
        </button>
      </footer>
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
  background: rgba(7, 13, 24, 0.26);
  backdrop-filter: blur(10px);
}

.desktop-workspace-dialog__panel {
  width: min(31rem, calc(100vw - 2rem));
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
  position: relative;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: rgba(var(--desktop-accent-rgb), 0.04);
  color: var(--desktop-muted);
  cursor: pointer;
}

.desktop-workspace-dialog__close span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.78rem;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
}

.desktop-workspace-dialog__close span:first-child {
  transform: translate(-50%, -50%) rotate(45deg);
}

.desktop-workspace-dialog__close span:last-child {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.desktop-workspace-dialog__body {
  display: grid;
  gap: 0.9rem;
}

.desktop-workspace-dialog__field {
  display: grid;
  gap: 0.45rem;
}

.desktop-workspace-dialog__field span {
  color: var(--desktop-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.desktop-workspace-dialog__input,
.desktop-workspace-dialog__textarea {
  width: 100%;
  border: 1px solid var(--desktop-line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  color: var(--desktop-ink);
  font: inherit;
  padding: 0.8rem 0.9rem;
}

.desktop-workspace-dialog__textarea {
  resize: vertical;
  min-height: 6rem;
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

.desktop-workspace-dialog__footer {
  justify-content: flex-end;
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

@media (prefers-color-scheme: dark) {
  .desktop-workspace-dialog__input,
  .desktop-workspace-dialog__textarea {
    background: rgba(14, 22, 36, 0.84);
  }
}
</style>
