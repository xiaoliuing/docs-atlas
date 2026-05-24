<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { DesktopMarkdownThemeId } from '@/composables/useDesktopPreferences'
import type { DocDetail, DocMeta } from '@/types/docs'
import { readMarkdownDocumentFile, writeMarkdownDocumentFile } from '@/api/docs'
import DesktopBlockNoteEditorHost from '@/components/editor/DesktopBlockNoteEditorHost.vue'
import DesktopDocContent from './DesktopDocContent.vue'
import DesktopDocPager from './DesktopDocPager.vue'

const props = withDefaults(
  defineProps<{
    doc: DocDetail | null
    highlightQuery: string
    isFavorite?: boolean
    markdownThemeId?: DesktopMarkdownThemeId
    nextDoc: DocMeta | null
    prevDoc: DocMeta | null
    restoreScrollTop?: number
  }>(),
  {
    isFavorite: false,
    markdownThemeId: 'atlas',
    restoreScrollTop: 0,
  },
)

const emit = defineEmits<{
  docSaved: []
  selectDoc: [slug: string]
  scrollTopChange: [top: number]
  toggleFavorite: []
}>()

type SaveStatus = 'error' | 'idle' | 'saving' | 'saved' | 'unsaved'

const scrollRef = useTemplateRef<HTMLElement>('scroll')
const editorMarkdown = shallowRef('')
const editorError = shallowRef('')
const isEditing = shallowRef(false)
const isEditorLoading = shallowRef(false)
const saveStatus = shallowRef<SaveStatus>('idle')
const savedMarkdown = shallowRef('')
const lastEditedAt = shallowRef('')
let autoSaveTimer: number | null = null

const saveStatusText = computed(() => {
  if (isEditorLoading.value) {
    return '正在加载编辑器'
  }

  switch (saveStatus.value) {
    case 'error':
      return '保存失败'
    case 'saving':
      return '保存中...'
    case 'saved':
      return '已保存'
    case 'unsaved':
      return '有未保存修改'
    default:
      return '编辑模式'
  }
})

const formattedLastEditedAt = computed(() => formatTimestamp(lastEditedAt.value || props.doc?.updatedAt || ''))

watch(
  () => [props.doc?.slug ?? '', props.restoreScrollTop, props.highlightQuery] as const,
  async ([slug, restoreScrollTop, highlightQuery]) => {
    if (!slug) {
      return
    }

    await nextTick()

    const scrollElement = scrollRef.value
    if (!scrollElement) {
      return
    }

    scrollElement.scrollTop = highlightQuery.trim() ? 0 : Math.max(0, restoreScrollTop)
    emit('scrollTopChange', scrollElement.scrollTop)
  },
  { immediate: true },
)

watch(
  () => props.doc?.slug ?? '',
  () => {
    clearAutoSaveTimer()
    isEditing.value = false
    editorMarkdown.value = ''
    savedMarkdown.value = ''
    editorError.value = ''
    saveStatus.value = 'idle'
    lastEditedAt.value = props.doc?.updatedAt ?? ''
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleEditorShortcut)
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  window.removeEventListener('keydown', handleEditorShortcut)
})

function handleScroll(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  emit('scrollTopChange', target.scrollTop)
}

async function toggleEditing() {
  if (!isEditing.value) {
    await enterEditing()
    return
  }

  await saveEditorMarkdown()
  isEditing.value = false
}

async function enterEditing() {
  if (!props.doc || isEditorLoading.value) {
    return
  }

  isEditing.value = true
  isEditorLoading.value = true
  editorError.value = ''
  saveStatus.value = 'idle'

  try {
    const file = await readMarkdownDocumentFile(props.doc.absolutePath)
    editorMarkdown.value = file.markdown
    savedMarkdown.value = file.markdown
    lastEditedAt.value = file.updatedAt
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '读取 Markdown 文件失败'
    saveStatus.value = 'error'
  } finally {
    isEditorLoading.value = false
  }
}

function handleEditorChange(markdown: string) {
  editorMarkdown.value = markdown
  if (markdown === savedMarkdown.value) {
    saveStatus.value = 'saved'
    return
  }

  saveStatus.value = 'unsaved'
  scheduleAutoSave()
}

function scheduleAutoSave() {
  clearAutoSaveTimer()
  autoSaveTimer = window.setTimeout(() => {
    void saveEditorMarkdown()
  }, 1800)
}

async function saveEditorMarkdown() {
  if (!props.doc || saveStatus.value === 'saving' || editorMarkdown.value === savedMarkdown.value) {
    return
  }

  clearAutoSaveTimer()
  saveStatus.value = 'saving'
  editorError.value = ''

  try {
    const file = await writeMarkdownDocumentFile(props.doc.absolutePath, editorMarkdown.value)
    editorMarkdown.value = file.markdown
    savedMarkdown.value = file.markdown
    lastEditedAt.value = file.updatedAt
    saveStatus.value = 'saved'
    emit('docSaved')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : '保存 Markdown 文件失败'
    saveStatus.value = 'error'
  }
}

function handleEditorShortcut(event: KeyboardEvent) {
  if (!isEditing.value || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
    return
  }

  event.preventDefault()
  void saveEditorMarkdown()
}

function clearAutoSaveTimer() {
  if (autoSaveTimer === null) {
    return
  }

  window.clearTimeout(autoSaveTimer)
  autoSaveTimer = null
}

function formatTimestamp(value: string) {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '未知'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000))
}
</script>

<template>
  <section
    v-if="doc"
    class="desktop-doc-reader"
  >
    <div
      id="desktop-doc-scroll"
      ref="scroll"
      class="desktop-doc-reader__scroll desktop-scroll"
      @scroll="handleScroll"
    >
      <div class="desktop-doc-reader__editor-toolbar">
        <div class="desktop-doc-reader__editor-meta">
          <span>{{ saveStatusText }}</span>
          <span>最后编辑：{{ formattedLastEditedAt }}</span>
          <strong v-if="editorError">{{ editorError }}</strong>
        </div>
        <div class="desktop-doc-reader__editor-actions">
          <button
            v-if="isEditing"
            class="desktop-doc-reader__editor-button"
            type="button"
            :disabled="saveStatus === 'saving' || editorMarkdown === savedMarkdown"
            @click="saveEditorMarkdown"
          >
            保存
          </button>
          <button
            class="desktop-doc-reader__editor-button desktop-doc-reader__editor-button--primary"
            type="button"
            :disabled="isEditorLoading || saveStatus === 'saving'"
            @click="toggleEditing"
          >
            {{ isEditing ? '完成' : '编辑' }}
          </button>
        </div>
      </div>

      <DesktopBlockNoteEditorHost
        v-if="isEditing && !isEditorLoading && !editorError"
        :markdown="editorMarkdown"
        @change="handleEditorChange"
      />

      <DesktopDocContent
        v-else
        :doc="doc"
        :is-favorite="props.isFavorite"
        :highlight-query="highlightQuery"
        :markdown-theme-id="props.markdownThemeId"
        @select-doc="emit('selectDoc', $event)"
        @toggle-favorite="emit('toggleFavorite')"
      />
      <DesktopDocPager
        v-if="!isEditing"
        :next-doc="nextDoc"
        :prev-doc="prevDoc"
        @select-doc="emit('selectDoc', $event)"
      />
    </div>
  </section>

  <section
    v-else
    class="desktop-doc-reader__empty"
  >
    <h2>未加载到文档</h2>
    <p>请从左侧目录中选择一篇文档。</p>
  </section>
</template>

<style scoped>
.desktop-doc-reader {
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.desktop-doc-reader__scroll {
  display: grid;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.desktop-doc-reader__editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.72rem 0.82rem;
  border: 1px solid var(--desktop-line);
  border-radius: 18px;
  background: var(--desktop-surface);
}

.desktop-doc-reader__editor-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  color: var(--desktop-muted);
  font-size: 0.74rem;
}

.desktop-doc-reader__editor-meta strong {
  color: #dc2626;
  font-weight: 650;
}

.desktop-doc-reader__editor-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.46rem;
  flex: none;
}

.desktop-doc-reader__editor-button {
  min-height: 2rem;
  padding: 0.36rem 0.72rem;
  border: 1px solid var(--desktop-line);
  border-radius: 999px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
}

.desktop-doc-reader__editor-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.desktop-doc-reader__editor-button--primary {
  border-color: rgba(var(--desktop-accent-rgb), 0.28);
  background: rgba(var(--desktop-accent-rgb), 0.1);
  color: var(--desktop-accent);
}

.desktop-doc-reader__empty {
  display: grid;
  gap: 0.45rem;
  padding: 1.2rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
}

.desktop-doc-reader__empty h2,
.desktop-doc-reader__empty p {
  margin: 0;
}

.desktop-doc-reader__empty p {
  color: var(--desktop-muted);
}
</style>
