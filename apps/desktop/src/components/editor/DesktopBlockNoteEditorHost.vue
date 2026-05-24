<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { createRoot, type Root } from 'react-dom/client'
import { createElement, type ReactElement } from 'react'
import type { BlockNoteMarkdownEditorProps } from './BlockNoteMarkdownEditor'

const props = withDefaults(
  defineProps<{
    editable?: boolean
    markdown: string
  }>(),
  {
    editable: true,
  },
)

const emit = defineEmits<{
  change: [markdown: string]
  ready: []
}>()

const hostRef = useTemplateRef<HTMLElement>('host')
const reactTheme = computed(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
let root: Root | null = null
let editorComponent: ((props: BlockNoteMarkdownEditorProps) => ReactElement) | null = null

onMounted(() => {
  renderReactEditor()
})

onBeforeUnmount(() => {
  root?.unmount()
  root = null
})

watch(
  () => [props.markdown, props.editable, reactTheme.value] as const,
  () => {
    renderReactEditor()
  },
)

async function renderReactEditor() {
  if (!hostRef.value) {
    return
  }

  if (!editorComponent) {
    const module = await import('./BlockNoteMarkdownEditor')
    editorComponent = module.BlockNoteMarkdownEditor
  }

  root ??= createRoot(hostRef.value)
  root.render(
    createElement(editorComponent, {
      editable: props.editable,
      markdown: props.markdown,
      theme: reactTheme.value,
      onChange: (markdown: string) => emit('change', markdown),
      onReady: () => emit('ready'),
    }),
  )
}
</script>

<template>
  <div ref="host" class="desktop-blocknote-editor-host" />
</template>

<style scoped>
.desktop-blocknote-editor-host {
  min-width: 0;
  min-height: 100%;
}

.desktop-blocknote-editor-host :deep(.docs-atlas-blocknote-editor) {
  min-height: 100%;
  color: var(--desktop-ink);
}

.desktop-blocknote-editor-host :deep(.bn-container) {
  min-height: 100%;
  border-radius: 18px;
  background: var(--desktop-surface-strong);
}

.desktop-blocknote-editor-host :deep(.bn-editor) {
  min-height: 62vh;
  padding: 1rem 1.1rem;
  font-size: 0.95rem;
  line-height: 1.72;
}
</style>
