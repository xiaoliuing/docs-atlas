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
    const host = hostRef.value;
    if (!editor || !host || typeof window === "undefined") {
      return;
    }

    const theme = resolveThemeName();
    editor.setTheme(theme);

    const rootStyles = window.getComputedStyle(document.documentElement);
    const palette = resolveEditorPalette(theme, props.markdownThemeId);
    const tokenEntries = [
      ["--border-color", mixRootToken("--desktop-line-strong", "--desktop-line", 0.34)],
      ["--second-color", "rgba(var(--desktop-accent-rgb), 0.18)"],
      ["--panel-background-color", palette.panelBackground],
      ["--panel-shadow", "none"],
      ["--toolbar-background-color", "transparent"],
      ["--toolbar-icon-color", readRootToken("--desktop-muted", rootStyles)],
      ["--toolbar-icon-hover-color", readRootToken("--desktop-accent", rootStyles)],
      ["--textarea-background-color", palette.textareaBackground],
      ["--textarea-text-color", readRootToken("--desktop-ink", rootStyles)],
      ["--resize-icon-color", readRootToken("--desktop-muted", rootStyles)],
      ["--resize-background-color", "transparent"],
      ["--resize-hover-icon-color", readRootToken("--desktop-accent", rootStyles)],
      ["--resize-hover-background-color", rgbaRootToken("--desktop-accent-rgb", 0.1)],
      ["--count-background-color", rgbaRootToken("--desktop-accent-rgb", 0.08)],
      ["--heading-border-color", mixRootToken("--desktop-line-strong", "--desktop-line", 0.3)],
      ["--blockquote-color", readRootToken("--desktop-muted", rootStyles)],
      ["--ir-heading-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-title-color", readRootToken("--desktop-soft", rootStyles)],
      ["--ir-bi-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-link-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-bracket-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-paren-color", readRootToken("--desktop-muted", rootStyles)],
    ] as const;

    for (const [name, value] of tokenEntries) {
      host.style.setProperty(name, value);
    }

    host.dataset.vditorTheme = theme;
  }

  function readRootToken(name: string, rootStyles?: CSSStyleDeclaration) {
    const styles = rootStyles ?? window.getComputedStyle(document.documentElement);
    return styles.getPropertyValue(name).trim();
  }

  function rgbaRootToken(name: string, alpha: number) {
    const rgb = readRootToken(name);
    return `rgba(${rgb}, ${alpha})`;
  }

  function mixRootToken(
    primaryName: string,
    secondaryName: string,
    primaryRatio: number,
  ) {
    const primary = readRootToken(primaryName);
    const secondary = readRootToken(secondaryName);
    return `color-mix(in srgb, ${primary} ${Math.round(primaryRatio * 100)}%, ${secondary})`;
  }

  function resolveEditorPalette(
    theme: "dark" | "classic",
    markdownThemeId: DesktopMarkdownThemeId,
  ) {
    const isDark = theme === "dark";
    const surfaceStrong = readRootToken("--desktop-surface-strong");
    const surface = readRootToken("--desktop-surface");
    const field = readRootToken("--desktop-field-bg");
    const fieldStrong = readRootToken("--desktop-field-bg-strong");

    if (markdownThemeId === "github") {
      return {
        panelBackground: isDark ? fieldStrong : "#ffffff",
        textareaBackground: isDark ? surfaceStrong : "#ffffff",
      };
    }

    if (markdownThemeId === "compact") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 92%, rgba(var(--desktop-accent-rgb), 0.08))`
          : `color-mix(in srgb, ${surfaceStrong} 94%, rgba(var(--desktop-accent-rgb), 0.05))`,
        textareaBackground: isDark ? field : readRootToken("--desktop-field-bg-strong"),
      };
    }

    if (markdownThemeId === "reading") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 88%, rgba(var(--desktop-accent-rgb), 0.1))`
          : `color-mix(in srgb, ${surfaceStrong} 90%, rgba(var(--desktop-accent-rgb), 0.04))`,
        textareaBackground: isDark
          ? `color-mix(in srgb, ${fieldStrong} 90%, rgba(var(--desktop-accent-rgb), 0.06))`
          : `color-mix(in srgb, ${surface} 82%, white)`,
      };
    }

    return {
      panelBackground: isDark
        ? `color-mix(in srgb, ${surfaceStrong} 90%, rgba(var(--desktop-accent-rgb), 0.08))`
        : `color-mix(in srgb, ${surfaceStrong} 92%, rgba(var(--desktop-accent-rgb), 0.04))`,
      textareaBackground: isDark
        ? `color-mix(in srgb, ${fieldStrong} 90%, rgba(var(--desktop-accent-rgb), 0.05))`
        : readRootToken("--desktop-surface-strong"),
    };
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
  .desktop-doc-editor__editor,
  .desktop-doc-editor__editor.vditor,
  .desktop-doc-editor__editor.vditor.vditor--dark {
    position: relative;
    min-width: 0;
    padding: 0;
    border: 0 !important;
    border-radius: 0;
    background: transparent !important;
    box-shadow: none !important;
    --border-color: color-mix(
      in srgb,
      var(--desktop-line-strong) 34%,
      var(--desktop-line)
    );
    --second-color: rgba(var(--desktop-accent-rgb), 0.16);
    --panel-background-color: var(--desktop-surface-strong);
    --panel-shadow: none;
    --toolbar-background-color: transparent;
    --toolbar-icon-color: var(--desktop-muted);
    --toolbar-icon-hover-color: var(--desktop-accent);
    --textarea-background-color: transparent;
    --textarea-text-color: var(--desktop-ink);
    --resize-icon-color: var(--desktop-muted);
    --resize-background-color: transparent;
    --resize-hover-icon-color: var(--desktop-accent);
    --resize-hover-background-color: rgba(var(--desktop-accent-rgb), 0.1);
    --count-background-color: rgba(var(--desktop-accent-rgb), 0.08);
    --heading-border-color: color-mix(
      in srgb,
      var(--desktop-line-strong) 30%,
      var(--desktop-line)
    );
    --blockquote-color: var(--desktop-muted);
    --ir-heading-color: var(--desktop-accent);
    --ir-title-color: var(--desktop-soft);
    --ir-bi-color: var(--desktop-accent);
    --ir-link-color: var(--desktop-accent);
    --ir-bracket-color: var(--desktop-accent);
    --ir-paren-color: var(--desktop-muted);
  }

  .desktop-doc-editor__editor.vditor {
    overflow: visible;
  }

  .desktop-doc-editor__editor.vditor > :deep(.vditor-content),
  .desktop-doc-editor__editor.vditor > :deep(div),
  .desktop-doc-editor__editor :deep(.vditor-content > div) {
    border: 0 !important;
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--dirty {
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--error {
    box-shadow: none !important;
  }

  .desktop-doc-editor__editor--readonly {
    opacity: 0.76;
  }

  .desktop-doc-editor__editor :deep(.vditor-toolbar) {
    display: none !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-reset) {
    color: var(--desktop-ink);
    font-family: var(--desktop-font-sans);
  }

  .desktop-doc-editor__editor :deep(.vditor-reset h1),
  .desktop-doc-editor__editor :deep(.vditor-reset h2),
  .desktop-doc-editor__editor :deep(.vditor-reset h3) {
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h1:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h2:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h3:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h4:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h5:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg > .vditor-reset > h6:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg div.vditor-wysiwyg__block:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg div[data-type="link-ref-defs-block"]:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg div[data-type="footnotes-block"]:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg .vditor-toc:before) {
    color: rgba(var(--desktop-accent-rgb), 0.42);
  }

  .desktop-doc-editor__editor :deep(a) {
    color: var(--desktop-accent);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg span[data-type="link-ref"]),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg sup[data-type="footnotes-ref"]),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg span[data-type="toc-h"]),
  .desktop-doc-editor__editor :deep(.vditor-ir__node[data-type="link-ref"]),
  .desktop-doc-editor__editor :deep(.vditor-ir__node[data-type="footnotes-ref"]) {
    color: var(--desktop-accent) !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-ir),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-content) {
    border: 0 !important;
    background: var(--panel-background-color) !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-ir pre.vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg) {
    min-height: 28rem;
    padding: 1rem 1.08rem 1.18rem !important;
    background: var(--textarea-background-color);
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg) {
    padding: 0 !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg pre.vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-ir .vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-sv) {
    background: var(--textarea-background-color) !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg:focus) {
    outline: none;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg pre.vditor-reset) {
    caret-color: var(--desktop-accent);
  }

  .desktop-doc-editor__editor :deep(blockquote) {
    border-left-color: rgba(var(--desktop-accent-rgb), 0.34);
  }

  .desktop-doc-editor__editor :deep(::selection) {
    background: rgba(var(--desktop-accent-rgb), 0.18);
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
