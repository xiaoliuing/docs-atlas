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
  import { convertFileSrc } from "@tauri-apps/api/core";
  import mermaid from "mermaid";
  import Vditor from "vditor";
  import DesktopDocImagePreview from "./DesktopDocImagePreview.vue";
  import type { DesktopMarkdownThemeId } from "@/composables/useDesktopPreferences";
  import type { DocDetail } from "@/types/docs";

  type PreviewImage = {
    alt: string;
    src: string;
    title: string;
  };

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
  const previewImages = shallowRef<PreviewImage[]>([]);
  const activePreviewImageIndex = shallowRef(-1);
  let themeObserver: MutationObserver | null = null;
  let previewEnhancementTimer: number | null = null;
  let mermaidSequence = 0;

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
        schedulePreviewEnhancements();
        return;
      }

      editor.setValue(markdown, true);
      schedulePreviewEnhancements();
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
    if (previewEnhancementTimer !== null) {
      window.clearTimeout(previewEnhancementTimer);
      previewEnhancementTimer = null;
    }
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
        schedulePreviewEnhancements();
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
        schedulePreviewEnhancements();
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

    themeObserver = new MutationObserver((mutations) => {
      let shouldSyncTheme = false;
      let shouldApplyTheme = false;

      for (const mutation of mutations) {
        const attributeName = mutation.attributeName;
        if (
          attributeName === "data-theme" ||
          attributeName === "data-theme-mode"
        ) {
          shouldSyncTheme = true;
          shouldApplyTheme = true;
          break;
        }

        if (attributeName === "data-theme-accent") {
          shouldApplyTheme = true;
        }
      }

      if (shouldSyncTheme) {
        syncTheme();
        return;
      }

      if (shouldApplyTheme) {
        applyEditorTheme();
      }
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme", "data-theme-mode", "data-theme-accent"],
      attributes: true,
    });
  }

  function syncTheme() {
    const nextTheme = resolveThemeName();
    if (nextTheme !== themeName.value) {
      themeName.value = nextTheme;
    }

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
      [
        "--border-color",
        mixRootToken("--desktop-line-strong", "--desktop-line", 0.34),
      ],
      ["--second-color", "rgba(var(--desktop-accent-rgb), 0.18)"],
      ["--panel-background-color", palette.panelBackground],
      ["--panel-shadow", "none"],
      ["--toolbar-background-color", "transparent"],
      ["--toolbar-icon-color", readRootToken("--desktop-muted", rootStyles)],
      [
        "--toolbar-icon-hover-color",
        readRootToken("--desktop-accent", rootStyles),
      ],
      ["--textarea-background-color", palette.textareaBackground],
      ["--textarea-text-color", readRootToken("--desktop-ink", rootStyles)],
      ["--resize-icon-color", readRootToken("--desktop-muted", rootStyles)],
      ["--resize-background-color", "transparent"],
      [
        "--resize-hover-icon-color",
        readRootToken("--desktop-accent", rootStyles),
      ],
      [
        "--resize-hover-background-color",
        rgbaRootToken("--desktop-accent-rgb", 0.1),
      ],
      ["--count-background-color", rgbaRootToken("--desktop-accent-rgb", 0.08)],
      [
        "--heading-border-color",
        mixRootToken("--desktop-line-strong", "--desktop-line", 0.3),
      ],
      ["--blockquote-color", readRootToken("--desktop-muted", rootStyles)],
      ["--ir-heading-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-title-color", readRootToken("--desktop-soft", rootStyles)],
      ["--ir-bi-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-link-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-bracket-color", readRootToken("--desktop-accent", rootStyles)],
      ["--ir-paren-color", readRootToken("--desktop-muted", rootStyles)],
      ["--editor-muted-line", palette.mutedLine],
      ["--editor-soft-fill", palette.softFill],
      ["--editor-code-bg", palette.codeBackground],
      ["--editor-code-border", palette.codeBorder],
      ["--editor-inline-code-bg", palette.inlineCodeBackground],
      ["--editor-inline-code-color", palette.inlineCodeColor],
      ["--editor-code-text", palette.codeText],
      ["--editor-quote-bg", palette.quoteBackground],
      ["--editor-table-head-bg", palette.tableHeadBackground],
      ["--editor-table-zebra-bg", palette.tableZebraBackground],
    ] as const;

    for (const [name, value] of tokenEntries) {
      host.style.setProperty(name, value);
    }

    host.dataset.vditorTheme = theme;
    schedulePreviewEnhancements();
  }

  function schedulePreviewEnhancements() {
    if (typeof window === "undefined") {
      return;
    }

    if (previewEnhancementTimer !== null) {
      window.clearTimeout(previewEnhancementTimer);
    }

    previewEnhancementTimer = window.setTimeout(() => {
      previewEnhancementTimer = null;
      void applyPreviewEnhancements();
    }, 24);
  }

  async function applyPreviewEnhancements() {
    const host = hostRef.value;
    const absolutePath = props.doc.absolutePath?.trim();
    if (!host) {
      return;
    }

    if (absolutePath) {
      rewritePreviewImages(host, absolutePath);
    }

    collectPreviewImages(host);
    await renderMermaidPreviews(host);
  }

  function readRootToken(name: string, rootStyles?: CSSStyleDeclaration) {
    const styles =
      rootStyles ?? window.getComputedStyle(document.documentElement);
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

  function rewritePreviewImages(root: HTMLElement, absolutePath: string) {
    const images = root.querySelectorAll<HTMLImageElement>("img[src]");
    for (const image of images) {
      const currentSrc = image.getAttribute("src")?.trim() ?? "";
      const nextSrc = resolvePreviewAssetSource(currentSrc, absolutePath);
      if (nextSrc && nextSrc !== currentSrc) {
        image.setAttribute("src", nextSrc);
      }
    }
  }

  function collectPreviewImages(root: HTMLElement) {
    const nextImages = Array.from(root.querySelectorAll<HTMLImageElement>("img[src]")).map(
      (image, index) => {
        image.dataset.previewIndex = String(index);
        return {
          alt: image.getAttribute("alt")?.trim() ?? "",
          src: image.getAttribute("src")?.trim() ?? "",
          title: image.getAttribute("title")?.trim() ?? "",
        };
      },
    );

    previewImages.value = nextImages;
    if (activePreviewImageIndex.value >= nextImages.length) {
      activePreviewImageIndex.value = -1;
    }
  }

  function resolvePreviewAssetSource(src: string, absolutePath: string) {
    if (
      !src ||
      src.startsWith("#") ||
      /^data:/i.test(src) ||
      /^asset:/i.test(src) ||
      /^https?:\/\//i.test(src) ||
      /^http:\/\/asset\.localhost/i.test(src) ||
      /^\/\//.test(src)
    ) {
      return src;
    }

    const { pathname, suffix } = splitUrlReference(src);
    const decodedPath = decodeURIComponent(pathname);
    const resolvedPath = isAbsoluteFilePath(decodedPath)
      ? normalizeResolvedPath(decodedPath)
      : resolveRelativeFilePath(absolutePath, decodedPath);

    return `${convertFileSrc(resolvedPath)}${suffix}`;
  }

  async function renderMermaidPreviews(root: HTMLElement) {
    const previewPanels = root.querySelectorAll<HTMLElement>(
      ".vditor-wysiwyg__preview, .vditor-ir__preview",
    );
    if (previewPanels.length === 0) {
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: resolveThemeName() === "dark" ? "dark" : "default",
    });

    for (const panel of previewPanels) {
      const languageNode = panel.querySelector<HTMLElement>(".language-mermaid");
      if (!languageNode) {
        continue;
      }

      const source =
        panel.dataset.mermaidSource?.trim() ||
        languageNode.textContent?.trim() ||
        "";
      if (!source) {
        continue;
      }

      panel.dataset.mermaidSource = source;

      try {
        const renderId = `docs-atlas-mermaid-${++mermaidSequence}`;
        const { svg, bindFunctions } = await mermaid.render(renderId, source);
        panel.innerHTML = svg;
        panel.dataset.render = "1";
        panel.classList.add("desktop-doc-editor__diagram-preview");
        bindFunctions?.(panel);
      } catch {
        panel.dataset.render = "0";
      }
    }
  }

  function handleEditorClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const image = target.closest("img[data-preview-index]") as HTMLImageElement | null;
    if (!image) {
      return;
    }

    const index = Number.parseInt(image.dataset.previewIndex ?? "-1", 10);
    if (Number.isNaN(index) || index < 0) {
      return;
    }

    activePreviewImageIndex.value = index;
  }

  function closePreviewImage() {
    activePreviewImageIndex.value = -1;
  }

  function splitUrlReference(value: string) {
    const hashIndex = value.indexOf("#");
    const queryIndex = value.indexOf("?");
    const cutoffCandidates = [hashIndex, queryIndex].filter((index) => index >= 0);
    const cutoff = cutoffCandidates.length > 0 ? Math.min(...cutoffCandidates) : value.length;

    return {
      pathname: value.slice(0, cutoff),
      suffix: value.slice(cutoff),
    };
  }

  function isAbsoluteFilePath(pathname: string) {
    return pathname.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(pathname) || pathname.startsWith("file://");
  }

  function resolveRelativeFilePath(fromPath: string, targetPath: string) {
    const base = normalizeResolvedPath(fromPath);
    const normalizedTarget = targetPath.replace(/\\/g, "/");
    const fromSegments = base.split("/");
    fromSegments.pop();

    for (const segment of normalizedTarget.split("/")) {
      if (!segment || segment === ".") {
        continue;
      }

      if (segment === "..") {
        if (fromSegments.length > 1) {
          fromSegments.pop();
        }
        continue;
      }

      fromSegments.push(segment);
    }

    return fromSegments.join("/");
  }

  function normalizeResolvedPath(value: string) {
    return value.replace(/^file:\/\//i, "").replace(/\\/g, "/");
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
        codeBackground: isDark ? "#161b22" : "#f6f8fa",
        codeBorder: isDark
          ? "rgba(110, 118, 129, 0.32)"
          : "rgba(31, 35, 40, 0.10)",
        codeText: isDark ? "#e6edf3" : "#24292f",
        inlineCodeBackground: isDark
          ? "rgba(110, 118, 129, 0.18)"
          : "rgba(175, 184, 193, 0.2)",
        inlineCodeColor: isDark ? "#ffb86b" : "#b42318",
        quoteBackground: isDark
          ? "rgba(110, 118, 129, 0.1)"
          : "rgba(175, 184, 193, 0.12)",
        tableHeadBackground: isDark
          ? "rgba(110, 118, 129, 0.14)"
          : "rgba(246, 248, 250, 0.96)",
        tableZebraBackground: isDark
          ? "rgba(110, 118, 129, 0.06)"
          : "rgba(246, 248, 250, 0.72)",
        mutedLine: isDark
          ? "rgba(110, 118, 129, 0.34)"
          : "rgba(31, 35, 40, 0.12)",
        softFill: isDark
          ? "rgba(110, 118, 129, 0.1)"
          : "rgba(175, 184, 193, 0.12)",
      };
    }

    if (markdownThemeId === "compact") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 84%, rgba(var(--desktop-accent-rgb), 0.16))`
          : `color-mix(in srgb, ${surfaceStrong} 88%, rgba(var(--desktop-accent-rgb), 0.08))`,
        textareaBackground: isDark
          ? `color-mix(in srgb, ${fieldStrong} 82%, rgba(var(--desktop-accent-rgb), 0.16))`
          : `color-mix(in srgb, ${fieldStrong} 90%, rgba(var(--desktop-accent-rgb), 0.08))`,
        codeBackground: isDark
          ? "color-mix(in srgb, rgba(11, 18, 32, 0.92) 86%, rgba(var(--desktop-accent-rgb), 0.12))"
          : "color-mix(in srgb, white 88%, rgba(var(--desktop-accent-rgb), 0.08))",
        codeBorder: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(var(--desktop-accent-rgb), 0.12)",
        codeText: isDark ? "#edf3ff" : "#1f2b3d",
        inlineCodeBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.14)"
          : "rgba(var(--desktop-accent-rgb), 0.08)",
        inlineCodeColor: readRootToken("--desktop-accent"),
        quoteBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.09)"
          : "rgba(var(--desktop-accent-rgb), 0.05)",
        tableHeadBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.12)"
          : "rgba(var(--desktop-accent-rgb), 0.06)",
        tableZebraBackground: isDark
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(var(--desktop-accent-rgb), 0.025)",
        mutedLine: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.22)"
          : "rgba(var(--desktop-accent-rgb), 0.12)",
        softFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.1)"
          : "rgba(var(--desktop-accent-rgb), 0.06)",
      };
    }

    if (markdownThemeId === "reading") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 82%, rgba(var(--desktop-accent-rgb), 0.14))`
          : `color-mix(in srgb, ${surfaceStrong} 88%, rgba(var(--desktop-accent-rgb), 0.06))`,
        textareaBackground: isDark
          ? `color-mix(in srgb, ${fieldStrong} 82%, rgba(var(--desktop-accent-rgb), 0.14))`
          : `color-mix(in srgb, ${surface} 86%, rgba(var(--desktop-accent-rgb), 0.05))`,
        codeBackground: isDark
          ? "color-mix(in srgb, rgba(14, 22, 38, 0.94) 84%, rgba(var(--desktop-accent-rgb), 0.14))"
          : "color-mix(in srgb, #f7f5f1 90%, rgba(var(--desktop-accent-rgb), 0.06))",
        codeBorder: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.16)"
          : "rgba(99, 112, 138, 0.12)",
        codeText: isDark ? "#f3f6fd" : "#243146",
        inlineCodeBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.12)"
          : "rgba(99, 112, 138, 0.1)",
        inlineCodeColor: isDark ? "#9ac2ff" : "#304d93",
        quoteBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.08)"
          : "rgba(99, 112, 138, 0.06)",
        tableHeadBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.11)"
          : "rgba(99, 112, 138, 0.06)",
        tableZebraBackground: isDark
          ? "rgba(255, 255, 255, 0.028)"
          : "rgba(99, 112, 138, 0.028)",
        mutedLine: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(99, 112, 138, 0.12)",
        softFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.1)"
          : "rgba(99, 112, 138, 0.05)",
      };
    }

    return {
      panelBackground: isDark
        ? `color-mix(in srgb, ${surfaceStrong} 84%, rgba(var(--desktop-accent-rgb), 0.14))`
        : `color-mix(in srgb, ${surfaceStrong} 88%, rgba(var(--desktop-accent-rgb), 0.06))`,
      textareaBackground: isDark
        ? `color-mix(in srgb, ${fieldStrong} 82%, rgba(var(--desktop-accent-rgb), 0.14))`
        : `color-mix(in srgb, ${readRootToken("--desktop-surface-strong")} 90%, rgba(var(--desktop-accent-rgb), 0.06))`,
      codeBackground: isDark
        ? "color-mix(in srgb, rgba(10, 18, 34, 0.94) 84%, rgba(var(--desktop-accent-rgb), 0.16))"
        : "color-mix(in srgb, white 86%, rgba(var(--desktop-accent-rgb), 0.08))",
      codeBorder: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.18)"
        : "rgba(var(--desktop-accent-rgb), 0.12)",
      codeText: isDark ? "#f1f5ff" : "#22314a",
      inlineCodeBackground: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.14)"
        : "rgba(var(--desktop-accent-rgb), 0.08)",
      inlineCodeColor: isDark ? "#9dc2ff" : readRootToken("--desktop-accent"),
      quoteBackground: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.08)"
        : "rgba(var(--desktop-accent-rgb), 0.05)",
      tableHeadBackground: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.12)"
        : "rgba(var(--desktop-accent-rgb), 0.05)",
      tableZebraBackground: isDark
        ? "rgba(255, 255, 255, 0.026)"
        : "rgba(var(--desktop-accent-rgb), 0.024)",
      mutedLine: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.2)"
        : "rgba(var(--desktop-accent-rgb), 0.12)",
      softFill: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.11)"
        : "rgba(var(--desktop-accent-rgb), 0.06)",
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
  <>
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
      @click="handleEditorClick"
    />

    <DesktopDocImagePreview
      v-if="activePreviewImageIndex >= 0"
      :active-index="activePreviewImageIndex"
      :images="previewImages"
      @close="closePreviewImage"
      @update:active-index="activePreviewImageIndex = $event"
    />
  </>
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

  .desktop-doc-editor__editor :deep(.vditor-reset p),
  .desktop-doc-editor__editor :deep(.vditor-reset li),
  .desktop-doc-editor__editor :deep(.vditor-reset blockquote),
  .desktop-doc-editor__editor :deep(.vditor-reset td),
  .desktop-doc-editor__editor :deep(.vditor-reset th) {
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.vditor-reset h1),
  .desktop-doc-editor__editor :deep(.vditor-reset h2),
  .desktop-doc-editor__editor :deep(.vditor-reset h3) {
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h1:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h2:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h3:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h4:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h5:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg > .vditor-reset > h6:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg div.vditor-wysiwyg__block:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg div[data-type="link-ref-defs-block"]:before),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg div[data-type="footnotes-block"]:before),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg .vditor-toc:before) {
    color: rgba(var(--desktop-accent-rgb), 0.42);
  }

  .desktop-doc-editor__editor :deep(a) {
    color: var(--desktop-accent);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg span[data-type="link-ref"]),
  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg sup[data-type="footnotes-ref"]),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg span[data-type="toc-h"]),
  .desktop-doc-editor__editor :deep(.vditor-ir__node[data-type="link-ref"]),
  .desktop-doc-editor__editor
    :deep(.vditor-ir__node[data-type="footnotes-ref"]) {
    color: var(--desktop-accent) !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-ir),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-content),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview) {
    border: 0 !important;
    background: var(--panel-background-color) !important;
    background-color: var(--panel-background-color) !important;
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
  .desktop-doc-editor__editor :deep(.vditor-ir pre.vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-ir .vditor-reset),
  .desktop-doc-editor__editor :deep(.vditor-sv),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview) {
    /* background: var(--textarea-background-color) !important;
    background-color: var(--textarea-background-color) !important; */
  }

  .desktop-doc-editor__editor :deep(.vditor-reset) {
    /* background: var(--textarea-background-color) !important;
    background-color: var(--textarea-background-color) !important; */
    border-radius: 0 0 calc(var(--desktop-radius-lg) - 1px)
      calc(var(--desktop-radius-lg) - 1px);
  }

  .desktop-doc-editor__editor :deep(.vditor-reset:focus) {
    background-color: unset !important;
  }

  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg div.vditor-wysiwyg__block[data-type="code-block"]),
  .desktop-doc-editor__editor :deep(.vditor-ir__node[data-type="code-block"]),
  .desktop-doc-editor__editor
    :deep(
      .vditor-wysiwyg__block[data-type="code-block"] .vditor-wysiwyg__preview
    ) {
    margin: 1rem 0;
    border: 1px solid var(--editor-code-border);
    border-radius: 14px;
    background: var(--editor-code-bg) !important;
    background-color: var(--editor-code-bg) !important;
    box-shadow: none;
    overflow: hidden;
  }

  .desktop-doc-editor__editor :deep(.vditor-reset pre > code) {
    background-image: none !important;
  }

  .desktop-doc-editor__editor
    :deep(.vditor-wysiwyg div.vditor-wysiwyg__block pre),
  .desktop-doc-editor__editor
    :deep(.vditor-ir__node[data-type="code-block"] pre),
  .desktop-doc-editor__editor :deep(pre.vditor-reset[data-type="code-block"]),
  .desktop-doc-editor__editor
    :deep(
      .vditor-wysiwyg__block[data-type="code-block"]
        .vditor-wysiwyg__preview
        pre
    ),
  .desktop-doc-editor__editor
    :deep(
      .vditor-wysiwyg__block[data-type="code-block"]
        .vditor-wysiwyg__preview
        .hljs
    ) {
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: var(--editor-code-bg) !important;
    background-color: var(--editor-code-bg) !important;
    color: var(--editor-code-text) !important;
    font-family: var(--desktop-font-mono);
    font-size: 0.86rem;
    line-height: 1.7;
  }

  .desktop-doc-editor__editor
    :deep(
      .vditor-wysiwyg
        div.vditor-wysiwyg__block[data-type="code-block"]
        pre:first-child
    ),
  .desktop-doc-editor__editor
    :deep(
      .vditor-wysiwyg
        div.vditor-wysiwyg__block[data-type="code-block"]
        pre:last-child
    ) {
    margin: 0 !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg pre code),
  .desktop-doc-editor__editor :deep(.vditor-ir pre code),
  .desktop-doc-editor__editor :deep(pre.vditor-reset code),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview code),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview .hljs) {
    color: var(--editor-code-text) !important;
    font-family: var(--desktop-font-mono);
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview .hljs),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview pre),
  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview pre code) {
    background: var(--editor-code-bg) !important;
    background-color: var(--editor-code-bg) !important;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview img),
  .desktop-doc-editor__editor :deep(.vditor-reset img) {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--editor-code-border) 90%, transparent);
    box-shadow: 0 12px 26px rgba(var(--desktop-shadow), 0.12);
    cursor: zoom-in;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg__preview svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .desktop-doc-editor__editor :deep(code[data-marker="`"]),
  .desktop-doc-editor__editor :deep(.vditor-reset p code[data-marker="`"]),
  .desktop-doc-editor__editor :deep(.vditor-reset li code[data-marker="`"]),
  .desktop-doc-editor__editor :deep(.vditor-reset td code[data-marker="`"]),
  .desktop-doc-editor__editor
    :deep(.vditor-reset blockquote code[data-marker="`"]) {
    display: inline-block;
    padding: 0.16rem 0.42rem !important;
    border: 1px solid var(--editor-code-border);
    border-radius: 8px;
    background: var(--editor-inline-code-bg) !important;
    color: var(--editor-inline-code-color) !important;
    line-height: 1.35;
  }

  .desktop-doc-editor__editor :deep(.vditor-reset p code),
  .desktop-doc-editor__editor :deep(.vditor-reset li code),
  .desktop-doc-editor__editor :deep(.vditor-reset td code),
  .desktop-doc-editor__editor :deep(.vditor-reset blockquote code) {
    padding: 0.16rem 0.42rem;
    border: 1px solid var(--editor-code-border);
    border-radius: 8px;
    background: var(--editor-inline-code-bg);
    color: var(--editor-inline-code-color);
    font-family: var(--desktop-font-mono);
    font-size: 0.86em;
  }

  .desktop-doc-editor__editor :deep(blockquote) {
    margin: 1rem 0;
    padding: 0.9rem 1rem;
    border-left: 3px solid rgba(var(--desktop-accent-rgb), 0.34);
    border-radius: 0 14px 14px 0;
    background: var(--editor-quote-bg);
  }

  .desktop-doc-editor__editor :deep(hr) {
    border: 0;
    border-top: 1px solid var(--editor-muted-line);
  }

  .desktop-doc-editor__editor :deep(table) {
    width: 100%;
    table-layout: auto;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1rem 0;
    border: 1px solid var(--editor-code-border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--panel-background-color);
    background-color: var(--panel-background-color);
  }

  .desktop-doc-editor__editor :deep(thead tr) {
    background: var(--editor-table-head-bg);
    background-color: var(--editor-table-head-bg);
  }

  .desktop-doc-editor__editor :deep(th),
  .desktop-doc-editor__editor :deep(td) {
    padding: 0.68rem 0.8rem;
    border: 1px solid var(--editor-code-border);
    vertical-align: top;
    background: transparent;
    background-color: transparent;
  }

  .desktop-doc-editor__editor :deep(tbody tr) {
    background: transparent;
    background-color: transparent;
  }

  .desktop-doc-editor__editor :deep(tbody tr:nth-child(even)) {
    background: var(--editor-table-zebra-bg);
    background-color: var(--editor-table-zebra-bg);
  }

  .desktop-doc-editor__editor :deep(.desktop-doc-editor__diagram-preview) {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid var(--editor-code-border);
    border-radius: 16px;
    background: color-mix(
      in srgb,
      var(--panel-background-color) 82%,
      var(--editor-code-bg)
    ) !important;
    background-color: color-mix(
      in srgb,
      var(--panel-background-color) 82%,
      var(--editor-code-bg)
    ) !important;
  }

  .desktop-doc-editor__editor :deep(.desktop-doc-editor__diagram-preview svg) {
    margin-inline: auto;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg:focus) {
    outline: none;
  }

  .desktop-doc-editor__editor :deep(.vditor-wysiwyg pre.vditor-reset) {
    caret-color: var(--desktop-accent);
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
