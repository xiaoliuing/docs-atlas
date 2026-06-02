<script setup lang="ts">
  import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    shallowRef,
    useTemplateRef,
    watch,
  } from "vue";
  import Vditor from "vditor";
  import type { DesktopMarkdownThemeId } from "@/composables/useDesktopPreferences";
  import type { DocDetail } from "@/types/docs";

  const props = withDefaults(
    defineProps<{
      doc: DocDetail;
      highlightQuery?: string;
      markdownThemeId?: DesktopMarkdownThemeId;
      saveDoc: (absolutePath: string, markdown: string) => Promise<void>;
    }>(),
    {
      highlightQuery: "",
      markdownThemeId: "atlas",
    },
  );

  const hostRef = useTemplateRef<HTMLDivElement>("host");
  const editorRef = shallowRef<Vditor | null>(null);
  const isSaving = shallowRef(false);
  const saveError = shallowRef("");
  const draftMarkdown = shallowRef(props.doc.markdown ?? "");
  const savedMarkdown = shallowRef(props.doc.markdown ?? "");
  const themeName = shallowRef<"dark" | "classic">("classic");
  let themeObserver: MutationObserver | null = null;

  const hasEditableSource = computed(() =>
    Boolean(props.doc.absolutePath && typeof props.doc.markdown === "string"),
  );
  const isDirty = computed(() => draftMarkdown.value !== savedMarkdown.value);

  watch(
    () => [props.doc.slug, props.doc.markdown ?? ""] as const,
    async ([, markdown]) => {
      draftMarkdown.value = markdown;
      savedMarkdown.value = markdown;
      saveError.value = "";

      await nextTick();

      const editor = editorRef.value;
      if (!editor || editor.getValue() === markdown) {
        return;
      }

      editor.setValue(markdown, true);
    },
    { immediate: true },
  );

  watch(
    () => props.markdownThemeId,
    () => {
      applyEditorTheme();
    },
  );

  watch(hasEditableSource, (nextValue) => {
    const editor = editorRef.value;
    if (!editor) {
      return;
    }

    if (nextValue) {
      editor.enable();
      return;
    }

    editor.disabled();
  });

  onMounted(async () => {
    await nextTick();
    createEditor();
    syncTheme();
    bindThemeObserver();
    window.addEventListener("keydown", handleWindowKeydown, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleWindowKeydown, true);
    themeObserver?.disconnect();
    themeObserver = null;
    editorRef.value?.destroy();
    editorRef.value = null;
  });

  function createEditor() {
    if (!hostRef.value) {
      return;
    }

    const editor = new Vditor(hostRef.value, {
      after() {
        draftMarkdown.value = editor.getValue();
        savedMarkdown.value = editor.getValue();
        applyEditorTheme();
        if (!hasEditableSource.value) {
          editor.disabled();
        }
      },
      cache: {
        enable: false,
      },
      counter: {
        enable: false,
        type: "markdown",
      },
      height: "auto",
      i18n: VDITOR_ZH_CN,
      icon: "ant",
      input(markdown) {
        draftMarkdown.value = markdown;
        if (saveError.value) {
          saveError.value = "";
        }
      },
      mode: "wysiwyg",
      outline: {
        enable: false,
      },
      placeholder: "开始编写 Markdown 文档",
      preview: {
        actions: [],
        delay: 0,
        mode: "editor",
      },
      theme: resolveThemeName(),
      toolbar: [],
      toolbarConfig: {
        hide: true,
        pin: true,
      },
      value: props.doc.markdown ?? "",
    });

    editorRef.value = editor;
  }

  function bindThemeObserver() {
    if (typeof window === "undefined") {
      return;
    }

    themeObserver = new MutationObserver(() => {
      syncTheme();
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme", "data-theme-mode"],
      attributes: true,
    });
  }

  function syncTheme() {
    const nextTheme = resolveThemeName();
    if (nextTheme === themeName.value) {
      return;
    }

    themeName.value = nextTheme;
    applyEditorTheme();
  }

  function resolveThemeName(): "dark" | "classic" {
    if (typeof document === "undefined") {
      return "classic";
    }

    return document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "classic";
  }

  function applyEditorTheme() {
    const editor = editorRef.value;
    if (!editor) {
      return;
    }

    editor.setTheme(resolveThemeName());
  }

  async function handleSave() {
    const editor = editorRef.value;
    const absolutePath = props.doc.absolutePath?.trim();
    if (!editor || !absolutePath || isSaving.value) {
      return;
    }

    const nextMarkdown = editor.getValue();
    if (nextMarkdown === savedMarkdown.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = "";

    try {
      await props.saveDoc(absolutePath, nextMarkdown);
      savedMarkdown.value = nextMarkdown;
      draftMarkdown.value = nextMarkdown;
    } catch (error) {
      saveError.value =
        error instanceof Error ? error.message : "保存失败，请稍后重试";
    } finally {
      isSaving.value = false;
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
      return;
    }

    const activeElement = document.activeElement;
    if (
      !hostRef.value ||
      !activeElement ||
      !hostRef.value.contains(activeElement)
    ) {
      return;
    }

    event.preventDefault();
    void handleSave();
  }

  const VDITOR_ZH_CN: Record<string, string> = {};
</script>

<template>
  <div
    ref="host"
    class="desktop-doc-editor__editor"
    :class="{
      'desktop-doc-editor__editor--dirty': isDirty && !isSaving && !saveError,
      'desktop-doc-editor__editor--error': !!saveError,
      'desktop-doc-editor__editor--readonly': !hasEditableSource,
    }"
    :data-markdown-theme="props.markdownThemeId"
    :title="
      saveError ||
      (!hasEditableSource
        ? '当前文档不可编辑'
        : isDirty
          ? '已修改，按 Ctrl/Cmd + S 保存'
          : '所见即所得编辑')
    "
  />
</template>

<style scoped>
  .desktop-doc-editor__editor {
    position: relative;
    min-width: 0;
    padding: 0.52rem 0.6rem 0.68rem;
  }

  .desktop-doc-editor__editor :deep(.vditor) {
    border: none !important;
    border-radius: 0;
    overflow: visible;
    background: transparent !important;
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor :deep(.vditor > div),
  .desktop-doc-editor__editor :deep(.vditor-content > div) {
    border: 0 !important;
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--dirty :deep(.vditor) {
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--error :deep(.vditor) {
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--readonly :deep(.vditor) {
    opacity: 0.76;
  }

  .desktop-doc-editor__editor :deep(.vditor-toolbar) {
    display: none !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-reset) {
    color: var(--desktop-ink);
    font-family: var(--desktop-font-sans);
  }

  .desktop-doc-editor__editor :deep(.vditor-ir),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-content) {
    border: 0 !important;
    background: transparent !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-ir pre.vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg) {
    min-height: 28rem;
    padding: 1rem 1.08rem 1.18rem !important;
    background: transparent;
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg:focus) {
    outline: none;
  }

  .desktop-doc-editor__editor[data-markdown-theme="github"]
    :deep(.vditor-wysiwyg) {
    max-width: min(100%, 94ch);
    margin-inline: auto;
    font-size: 0.94rem;
    line-height: 1.7;
  }

  .desktop-doc-editor__editor[data-markdown-theme="compact"]
    :deep(.vditor-wysiwyg) {
    max-width: min(100%, 108ch);
    margin-inline: auto;
    font-size: 0.88rem;
    line-height: 1.58;
  }

  .desktop-doc-editor__editor[data-markdown-theme="reading"]
    :deep(.vditor-wysiwyg) {
    max-width: min(100%, 78ch);
    margin-inline: auto;
    font-size: 1rem;
    line-height: 1.84;
  }
</style>
