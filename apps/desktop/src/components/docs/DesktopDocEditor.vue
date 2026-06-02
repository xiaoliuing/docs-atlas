<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import Vditor from 'vditor'
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail } from '@/types/docs'
import DesktopUiIcon from '@/components/ui/DesktopUiIcon.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail
    highlightQuery?: string
    markdownThemeId?: DesktopMarkdownThemeId
    saveDoc: (absolutePath: string, markdown: string) => Promise<void>
  }>(),
  {
    highlightQuery: '',
    markdownThemeId: 'atlas',
  },
)

const hostRef = useTemplateRef<HTMLDivElement>('host')
const editorRef = shallowRef<Vditor | null>(null)
const isSaving = shallowRef(false)
const saveError = shallowRef('')
const draftMarkdown = shallowRef(props.doc.markdown ?? '')
const savedMarkdown = shallowRef(props.doc.markdown ?? '')
const themeName = shallowRef<'dark' | 'classic'>('classic')
let themeObserver: MutationObserver | null = null

const hasEditableSource = computed(() => Boolean(props.doc.absolutePath && typeof props.doc.markdown === 'string'))
const isDirty = computed(() => draftMarkdown.value !== savedMarkdown.value)
const statusText = computed(() => {
  if (!hasEditableSource.value) {
    return '当前文档不可编辑'
  }

  if (isSaving.value) {
    return '保存中...'
  }

  if (saveError.value) {
    return saveError.value
  }

  if (isDirty.value) {
    return '已修改，按 Ctrl/Cmd + S 保存'
  }

  return '所见即所得编辑'
})

watch(
  () => [props.doc.slug, props.doc.markdown ?? ''] as const,
  async ([, markdown]) => {
    draftMarkdown.value = markdown
    savedMarkdown.value = markdown
    saveError.value = ''

    await nextTick()

    const editor = editorRef.value
    if (!editor || editor.getValue() === markdown) {
      return
    }

    editor.setValue(markdown, true)
  },
  { immediate: true },
)

watch(
  () => props.markdownThemeId,
  () => {
    applyEditorTheme()
  },
)

watch(hasEditableSource, (nextValue) => {
  const editor = editorRef.value
  if (!editor) {
    return
  }

  if (nextValue) {
    editor.enable()
    return
  }

  editor.disabled()
})

onMounted(async () => {
  await nextTick()
  createEditor()
  syncTheme()
  bindThemeObserver()
  window.addEventListener('keydown', handleWindowKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown, true)
  themeObserver?.disconnect()
  themeObserver = null
  editorRef.value?.destroy()
  editorRef.value = null
})

function createEditor() {
  if (!hostRef.value) {
    return
  }

  const editor = new Vditor(hostRef.value, {
    after() {
      draftMarkdown.value = editor.getValue()
      savedMarkdown.value = editor.getValue()
      applyEditorTheme()
      if (!hasEditableSource.value) {
        editor.disabled()
      }
    },
    cache: {
      enable: false,
    },
    counter: {
      enable: true,
      type: 'markdown',
    },
    height: 'auto',
    i18n: VDITOR_ZH_CN,
    icon: 'ant',
    input(markdown) {
      draftMarkdown.value = markdown
      if (saveError.value) {
        saveError.value = ''
      }
    },
    mode: 'wysiwyg',
    outline: {
      enable: false,
    },
    placeholder: '开始编写 Markdown 文档',
    preview: {
      actions: [],
      delay: 0,
      mode: 'editor',
    },
    theme: resolveThemeName(),
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      'link',
      '|',
      'list',
      'ordered-list',
      'check',
      'quote',
      'line',
      'code',
      'inline-code',
      'table',
      '|',
      'undo',
      'redo',
    ],
    toolbarConfig: {
      hide: false,
      pin: true,
    },
    value: props.doc.markdown ?? '',
  })

  editorRef.value = editor
}

function bindThemeObserver() {
  if (typeof window === 'undefined') {
    return
  }

  themeObserver = new MutationObserver(() => {
    syncTheme()
  })

  themeObserver.observe(document.documentElement, {
    attributeFilter: ['data-theme', 'data-theme-mode'],
    attributes: true,
  })
}

function syncTheme() {
  const nextTheme = resolveThemeName()
  if (nextTheme === themeName.value) {
    return
  }

  themeName.value = nextTheme
  applyEditorTheme()
}

function resolveThemeName(): 'dark' | 'classic' {
  if (typeof document === 'undefined') {
    return 'classic'
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'classic'
}

function applyEditorTheme() {
  const editor = editorRef.value
  if (!editor) {
    return
  }

  editor.setTheme(resolveThemeName())
}

async function handleSave() {
  const editor = editorRef.value
  const absolutePath = props.doc.absolutePath?.trim()
  if (!editor || !absolutePath || isSaving.value) {
    return
  }

  const nextMarkdown = editor.getValue()
  if (nextMarkdown === savedMarkdown.value) {
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    await props.saveDoc(absolutePath, nextMarkdown)
    savedMarkdown.value = nextMarkdown
    draftMarkdown.value = nextMarkdown
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败，请稍后重试'
  } finally {
    isSaving.value = false
  }
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
    return
  }

  const activeElement = document.activeElement
  if (!hostRef.value || !activeElement || !hostRef.value.contains(activeElement)) {
    return
  }

  event.preventDefault()
  void handleSave()
}

const VDITOR_ZH_CN: Record<string, string> = {
  bold: '粗体',
  check: '任务列表',
  code: '代码块',
  edit: '编辑',
  headings: '标题',
  'inline-code': '行内代码',
  italic: '斜体',
  line: '分隔线',
  link: '链接',
  list: '无序列表',
  'ordered-list': '有序列表',
  preview: '预览',
  quote: '引用',
  redo: '重做',
  strike: '删除线',
  table: '表格',
  undo: '撤销',
  wysiwyg: '所见即所得',
}
</script>

<template>
  <section class="desktop-doc-editor">
    <div class="desktop-doc-editor__statusbar">
      <div class="desktop-doc-editor__statuscopy">
        <span class="desktop-doc-editor__statuslabel">编辑器</span>
        <span
          class="desktop-doc-editor__statustext"
          :class="{
            'desktop-doc-editor__statustext--error': !!saveError,
            'desktop-doc-editor__statustext--dirty': isDirty && !isSaving && !saveError,
          }"
        >
          {{ statusText }}
        </span>
      </div>

      <button
        class="desktop-doc-editor__save"
        :disabled="!hasEditableSource || !isDirty || isSaving"
        type="button"
        @click="handleSave"
      >
        <DesktopUiIcon name="bookmark" :size="14" />
        <span>{{ isSaving ? '保存中' : '保存' }}</span>
      </button>
    </div>

    <div
      v-if="props.highlightQuery.trim()"
      class="desktop-doc-editor__searchhint"
    >
      当前文档由搜索结果打开，编辑器模式下不显示命中高亮。
    </div>

    <div
      ref="host"
      class="desktop-doc-editor__editor"
      :data-markdown-theme="props.markdownThemeId"
    />
  </section>
</template>

<style scoped>
.desktop-doc-editor {
  display: grid;
  gap: 0.72rem;
  min-width: 0;
}

.desktop-doc-editor__statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.desktop-doc-editor__statuscopy {
  display: grid;
  gap: 0.14rem;
  min-width: 0;
}

.desktop-doc-editor__statuslabel {
  color: var(--desktop-soft);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.desktop-doc-editor__statustext {
  color: var(--desktop-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.desktop-doc-editor__statustext--dirty {
  color: var(--desktop-accent);
}

.desktop-doc-editor__statustext--error {
  color: #c94d5f;
}

.desktop-doc-editor__save {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2rem;
  padding: 0.36rem 0.82rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
  border-radius: 999px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.desktop-doc-editor__save:hover:not(:disabled) {
  border-color: rgba(var(--desktop-accent-rgb), 0.28);
  background: rgba(var(--desktop-accent-rgb), 0.12);
  transform: translateY(-1px);
}

.desktop-doc-editor__save:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  transform: none;
}

.desktop-doc-editor__searchhint {
  padding: 0.62rem 0.76rem;
  border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
  border-radius: 0.82rem;
  background: rgba(var(--desktop-accent-rgb), 0.05);
  color: var(--desktop-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.desktop-doc-editor__editor {
  min-width: 0;
}

.desktop-doc-editor__editor :deep(.vditor) {
  border: 1px solid color-mix(in srgb, var(--desktop-line-strong) 46%, var(--desktop-line));
  border-radius: 16px;
  overflow: hidden;
  background: var(--desktop-surface-strong);
  box-shadow: 0 10px 22px rgba(var(--desktop-shadow), 0.05);
}

.desktop-doc-editor__editor :deep(.vditor-toolbar) {
  padding: 0.38rem 0.45rem;
  border-bottom: 1px solid var(--desktop-line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 75%),
    rgba(var(--desktop-accent-rgb), 0.035);
}

.desktop-doc-editor__editor :deep(.vditor-toolbar__item) {
  color: var(--desktop-muted);
}

.desktop-doc-editor__editor :deep(.vditor-toolbar__item:hover),
.desktop-doc-editor__editor :deep(.vditor-toolbar__item--current),
.desktop-doc-editor__editor :deep(.vditor-toolbar__item--current:hover) {
  color: var(--desktop-accent);
  background: rgba(var(--desktop-accent-rgb), 0.1);
}

.desktop-doc-editor__editor :deep(.vditor-reset) {
  color: var(--desktop-ink);
  font-family: var(--desktop-font-sans);
}

.desktop-doc-editor__editor :deep(.vditor-content) {
  background: var(--desktop-surface-strong);
}

.desktop-doc-editor__editor :deep(.vditor-wysiwyg) {
  min-height: 28rem;
  padding: 1rem 1.08rem 1.18rem !important;
  background: transparent;
  color: var(--desktop-ink);
}

.desktop-doc-editor__editor[data-markdown-theme='github'] :deep(.vditor-wysiwyg) {
  max-width: min(100%, 94ch);
  margin-inline: auto;
  font-size: 0.94rem;
  line-height: 1.7;
}

.desktop-doc-editor__editor[data-markdown-theme='compact'] :deep(.vditor-wysiwyg) {
  max-width: min(100%, 108ch);
  margin-inline: auto;
  font-size: 0.88rem;
  line-height: 1.58;
}

.desktop-doc-editor__editor[data-markdown-theme='reading'] :deep(.vditor-wysiwyg) {
  max-width: min(100%, 78ch);
  margin-inline: auto;
  font-size: 1rem;
  line-height: 1.84;
}

.desktop-doc-editor__editor :deep(.vditor-counter) {
  padding: 0.45rem 0.8rem 0.62rem;
  border-top: 1px solid var(--desktop-line);
  color: var(--desktop-soft);
  background: rgba(var(--desktop-accent-rgb), 0.025);
  font-size: 0.72rem;
}

.desktop-doc-editor__editor :deep(.vditor-tooltipped:hover::after) {
  z-index: 10;
}
</style>
