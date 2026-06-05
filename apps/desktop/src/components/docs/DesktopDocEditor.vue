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
  import { languages as codeMirrorLanguages } from "@codemirror/language-data";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { Crepe } from "@milkdown/crepe";
  import { replaceAll } from "@milkdown/kit/utils";
  import mermaid from "mermaid";
  import DesktopDocImagePreview from "./DesktopDocImagePreview.vue";
  import type { DesktopMarkdownThemeId } from "@/composables/useDesktopPreferences";
  import type { DocDetail } from "@/types/docs";

  type PreviewImage = {
    alt: string;
    src: string;
    title: string;
  };

  type EditorPalette = {
    panelBackground: string;
    surfaceLow: string;
    codeBackground: string;
    codeBorder: string;
    codeText: string;
    inlineCodeBackground: string;
    inlineCodeColor: string;
    quoteBackground: string;
    tableHeadBackground: string;
    tableZebraBackground: string;
    mutedLine: string;
    softFill: string;
    hoverFill: string;
    selectionFill: string;
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

  const emit = defineEmits<{
    saved: [payload: { mode: "auto" | "manual"; modifiedAt: string }];
  }>();

  const hostRef = useTemplateRef<HTMLDivElement>("host");
  const editorRef = shallowRef<Crepe | null>(null);
  const draftMarkdown = shallowRef(props.doc.markdown ?? "");
  const savedMarkdown = shallowRef(props.doc.markdown ?? "");
  const isSaving = shallowRef(false);
  const saveError = shallowRef("");
  const previewImages = shallowRef<PreviewImage[]>([]);
  const activePreviewImageIndex = shallowRef(-1);
  const currentDocAbsolutePath = shallowRef(
    props.doc.absolutePath?.trim() ?? "",
  );
  const currentDocModifiedAt = shallowRef(props.doc.modifiedAt ?? "");
  const resolvedThemeName = shallowRef<"dark" | "light">("light");
  const isEditorMounted = shallowRef(false);
  const lastHydratedSlug = shallowRef(props.doc.slug);
  const mermaidPreviewCache = new Map<string, Promise<string> | string>();
  const mermaidPreviewModeByKey = new Map<string, boolean>();
  let debugResizeObserver: ResizeObserver | null = null;
  let themeObserver: MutationObserver | null = null;
  let previewEnhancementTimer: number | null = null;
  let mermaidSequence = 0;
  let pendingHeadingSync = false;
  let pendingImageSync = false;
  let pendingOutlineSync = false;

  const hasEditableSource = computed(() =>
    Boolean(props.doc.absolutePath && typeof props.doc.markdown === "string"),
  );
  const isDirty = computed(() => draftMarkdown.value !== savedMarkdown.value);

  watch(
    () => props.doc.slug,
    async (nextSlug, previousSlug) => {
      if (!previousSlug || nextSlug === previousSlug) {
        return;
      }

      await persistDraft({
        absolutePath: currentDocAbsolutePath.value,
        markdown: draftMarkdown.value,
        mode: "auto",
      });
    },
    { flush: "sync" },
  );

  watch(
    () =>
      [
        props.doc.slug,
        props.doc.markdown ?? "",
        props.doc.absolutePath?.trim() ?? "",
        props.doc.modifiedAt ?? "",
      ] as const,
    async ([slug, markdown, absolutePath, modifiedAt]) => {
      currentDocAbsolutePath.value = absolutePath;
      currentDocModifiedAt.value = modifiedAt;
      saveError.value = "";

      const editor = editorRef.value;
      if (!editor) {
        return;
      }

      const shouldHydrateContent = lastHydratedSlug.value !== slug;
      lastHydratedSlug.value = slug;

      if (shouldHydrateContent) {
        draftMarkdown.value = markdown;
        savedMarkdown.value = markdown;

        await nextTick();

        if (editor.getMarkdown() !== markdown) {
          editor.editor.action(replaceAll(markdown, true));
        }
      }

      editor.setReadonly(!hasEditableSource.value);
      schedulePreviewEnhancements({
        syncHeadings: true,
        syncImages: true,
        syncOutline: true,
      });
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
    editorRef.value?.setReadonly(!nextValue);
  });

  onMounted(async () => {
    await nextTick();
    syncTheme();
    await createEditor(draftMarkdown.value);
    bindThemeObserver();
    window.addEventListener("keydown", handleWindowKeydown, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleWindowKeydown, true);
    themeObserver?.disconnect();
    themeObserver = null;
    debugResizeObserver?.disconnect();
    debugResizeObserver = null;
    mermaidPreviewCache.clear();
    if (previewEnhancementTimer !== null) {
      window.clearTimeout(previewEnhancementTimer);
      previewEnhancementTimer = null;
    }
    void persistDraft({
      absolutePath: currentDocAbsolutePath.value,
      markdown: draftMarkdown.value,
      mode: "auto",
    });
    void destroyEditor();
  });

  async function createEditor(defaultValue: string) {
    if (!hostRef.value) {
      return;
    }

    hostRef.value.innerHTML = "";

    const nextEditor = new Crepe({
      root: hostRef.value,
      defaultValue,
      features: {
        [Crepe.Feature.Toolbar]: false,
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.CodeMirror]: true,
        [Crepe.Feature.Latex]: false,
      },
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: {
          copyText: "复制代码",
          languages: codeMirrorLanguages,
          noResultText: "未找到语言",
          onCopy: () => {},
          previewToggleText: (previewOnlyMode) =>
            previewOnlyMode ? "编辑" : "预览",
          previewOnlyByDefault: true,
          renderPreview: renderCodePreview,
          searchPlaceholder: "搜索语言",
          theme: resolvedThemeName.value === "dark" ? oneDark : [],
        },
        [Crepe.Feature.Placeholder]: {
          text: "开始编写 Markdown 文档",
          mode: "doc",
        },
        [Crepe.Feature.ImageBlock]: {
          proxyDomURL(url: string) {
            return resolvePreviewAssetSource(url, currentDocAbsolutePath.value);
          },
        },
      },
    });

    nextEditor.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        if (markdown === draftMarkdown.value) {
          return;
        }

        draftMarkdown.value = markdown;
        if (saveError.value) {
          saveError.value = "";
        }
        schedulePreviewEnhancements({
          syncHeadings: true,
          syncImages: true,
          syncOutline: true,
        });
      });

      listener.mounted(() => {
        isEditorMounted.value = true;
        schedulePreviewEnhancements({
          syncHeadings: true,
          syncImages: true,
          syncOutline: true,
        });
      });
    });

    editorRef.value = nextEditor;
    const restoreIntersectionObserver = installStableCodeBlockObserver();
    try {
      await nextEditor.create();
    } finally {
      restoreIntersectionObserver();
    }
    nextEditor.setReadonly(!hasEditableSource.value);
    applyEditorTheme();
  }

  function installStableCodeBlockObserver() {
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      return () => {};
    }

    // Milkdown tears down off-screen code blocks, which changes Mermaid/code block
    // height and makes the document scroll by itself. Keep editor code blocks mounted.
    const OriginalIntersectionObserver = window.IntersectionObserver;

    class StableCodeBlockObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin = "200px";
      readonly thresholds = [0];
      private readonly callback: IntersectionObserverCallback;
      private readonly observedTargets = new Set<Element>();

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.observedTargets.add(target);
        window.requestAnimationFrame(() => {
          if (!this.observedTargets.has(target)) {
            return;
          }

          this.callback(
            [
              {
                boundingClientRect: target.getBoundingClientRect(),
                intersectionRatio: 1,
                intersectionRect: target.getBoundingClientRect(),
                isIntersecting: true,
                rootBounds: null,
                target,
                time: performance.now(),
              } as IntersectionObserverEntry,
            ],
            this as unknown as IntersectionObserver,
          );
        });
      }

      unobserve(target: Element) {
        this.observedTargets.delete(target);
      }

      disconnect() {
        this.observedTargets.clear();
      }

      takeRecords() {
        return [];
      }
    }

    window.IntersectionObserver =
      StableCodeBlockObserver as unknown as typeof IntersectionObserver;

    return () => {
      window.IntersectionObserver = OriginalIntersectionObserver;
    };
  }

  async function destroyEditor() {
    isEditorMounted.value = false;
    const editor = editorRef.value;
    editorRef.value = null;
    if (editor) {
      await editor.destroy();
    }
    if (hostRef.value) {
      hostRef.value.innerHTML = "";
    }
  }

  async function rebuildEditor() {
    const currentMarkdown = draftMarkdown.value;
    await destroyEditor();
    await nextTick();
    await createEditor(currentMarkdown);
  }

  function bindThemeObserver() {
    if (typeof window === "undefined") {
      return;
    }

    themeObserver = new MutationObserver((mutations) => {
      let shouldRebuild = false;
      let shouldApplyTheme = false;

      for (const mutation of mutations) {
        const attributeName = mutation.attributeName;
        if (
          attributeName === "data-theme" ||
          attributeName === "data-theme-mode"
        ) {
          const previousTheme = resolvedThemeName.value;
          syncTheme();
          shouldApplyTheme = true;
          if (previousTheme !== resolvedThemeName.value) {
            shouldRebuild = true;
          }
          continue;
        }

        if (attributeName === "data-theme-accent") {
          shouldApplyTheme = true;
        }
      }

      if (shouldRebuild) {
        void rebuildEditor();
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
    resolvedThemeName.value =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function applyEditorTheme() {
    const host = hostRef.value;
    if (!host || typeof window === "undefined") {
      return;
    }

    const rootStyles = window.getComputedStyle(document.documentElement);
    const palette = resolveEditorPalette(
      resolvedThemeName.value,
      props.markdownThemeId,
    );
    const tokenEntries = [
      ["--crepe-color-background", palette.panelBackground],
      ["--crepe-color-surface", palette.surfaceLow],
      ["--crepe-color-surface-low", palette.softFill],
      [
        "--crepe-color-on-background",
        readRootToken("--desktop-ink", rootStyles),
      ],
      ["--crepe-color-on-surface", readRootToken("--desktop-ink", rootStyles)],
      [
        "--crepe-color-on-surface-variant",
        readRootToken("--desktop-muted", rootStyles),
      ],
      ["--crepe-color-outline", palette.mutedLine],
      ["--crepe-color-primary", readRootToken("--desktop-accent", rootStyles)],
      ["--crepe-color-secondary", palette.hoverFill],
      [
        "--crepe-color-on-secondary",
        readRootToken("--desktop-ink", rootStyles),
      ],
      ["--crepe-color-inverse", readRootToken("--desktop-soft", rootStyles)],
      [
        "--crepe-color-on-inverse",
        readRootToken("--desktop-surface-strong", rootStyles),
      ],
      ["--crepe-color-inline-code", palette.inlineCodeColor],
      ["--crepe-color-error", "rgb(210, 69, 69)"],
      ["--crepe-color-hover", palette.hoverFill],
      ["--crepe-color-selected", palette.selectionFill],
      ["--crepe-color-inline-area", palette.softFill],
      ["--crepe-font-default", "var(--desktop-font-sans)"],
      ["--crepe-font-title", "var(--desktop-font-sans)"],
      [
        "--crepe-font-code",
        "'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace",
      ],
      ["--docs-atlas-code-bg", palette.codeBackground],
      ["--docs-atlas-code-border", palette.codeBorder],
      ["--docs-atlas-code-text", palette.codeText],
      ["--docs-atlas-inline-code-bg", palette.inlineCodeBackground],
      ["--docs-atlas-inline-code-color", palette.inlineCodeColor],
      ["--docs-atlas-quote-bg", palette.quoteBackground],
      ["--docs-atlas-table-head-bg", palette.tableHeadBackground],
      ["--docs-atlas-table-zebra-bg", palette.tableZebraBackground],
      ["--docs-atlas-soft-fill", palette.softFill],
      ["--docs-atlas-muted-line", palette.mutedLine],
    ] as const;

    for (const [name, value] of tokenEntries) {
      host.style.setProperty(name, value);
    }

    host.dataset.themeMode = resolvedThemeName.value;
  }

  function schedulePreviewEnhancements(options?: {
    syncHeadings?: boolean;
    syncImages?: boolean;
    syncOutline?: boolean;
  }) {
    if (typeof window === "undefined") {
      return;
    }

    pendingHeadingSync = pendingHeadingSync || Boolean(options?.syncHeadings);
    pendingImageSync = pendingImageSync || Boolean(options?.syncImages);
    pendingOutlineSync = pendingOutlineSync || Boolean(options?.syncOutline);

    if (previewEnhancementTimer !== null) {
      window.clearTimeout(previewEnhancementTimer);
    }

    previewEnhancementTimer = window.setTimeout(() => {
      previewEnhancementTimer = null;
      applyPreviewEnhancements();
    }, 80);
  }

  function applyPreviewEnhancements() {
    const host = hostRef.value;
    if (!host) {
      return;
    }

    const shouldSyncHeadings = pendingHeadingSync;
    const shouldSyncImages = pendingImageSync;
    const shouldSyncOutline = pendingOutlineSync;

    pendingHeadingSync = false;
    pendingImageSync = false;
    pendingOutlineSync = false;

    if (shouldSyncHeadings) {
      syncHeadingAnchors(host);
    }
    if (shouldSyncImages) {
      collectPreviewImages(host);
    }
    if (shouldSyncOutline) {
      notifyOutlineSync();
    }
    syncDebugObservers(host);
  }

  function syncDebugObservers(root: HTMLElement) {
    if (!import.meta.env.DEV || typeof ResizeObserver === "undefined") {
      return;
    }

    debugResizeObserver?.disconnect();

    const targets = root.querySelectorAll<HTMLElement>(
      ".milkdown-code-block, .milkdown-code-block-placeholder, .preview, .desktop-doc-editor__diagram-preview",
    );

    debugResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const text =
          target.textContent?.replace(/\s+/g, " ").trim().slice(0, 48) ?? "";
        console.debug("[DocsAtlas][code-block] resize", {
          className: target.className,
          height: Math.round(entry.contentRect.height),
          slug: props.doc.slug,
          text,
        });
      });
    });

    targets.forEach((target) => {
      debugResizeObserver?.observe(target);
    });

    const editorRoot = root.querySelector(".ProseMirror");
    console.debug("[DocsAtlas][editor] preview sync", {
      codeBlockCount: root.querySelectorAll(".milkdown-code-block").length,
      headingCount: editorRoot?.querySelectorAll("h2, h3").length ?? 0,
      slug: props.doc.slug,
    });
  }

  function syncHeadingAnchors(root: HTMLElement) {
    const headingIds = props.doc.headings.map((heading) => heading.id);
    if (!headingIds.length) {
      return;
    }

    const headingElements = root.querySelectorAll<HTMLElement>(
      ".ProseMirror h2, .ProseMirror h3",
    );

    headingElements.forEach((element, index) => {
      const nextId = headingIds[index];
      if (!nextId) {
        element.removeAttribute("id");
        delete element.dataset.docHeadingId;
        delete element.dataset.docHeadingIndex;
        return;
      }

      element.id = nextId;
      element.dataset.docHeadingId = nextId;
      element.dataset.docHeadingIndex = String(index);
    });
  }

  function notifyOutlineSync() {
    if (typeof window === "undefined") {
      return;
    }

    if (import.meta.env.DEV) {
      console.debug("[DocsAtlas][outline] doc-rendered", {
        slug: props.doc.slug,
      });
    }
    window.dispatchEvent(new CustomEvent("docs-atlas:doc-rendered"));
  }

  function collectPreviewImages(root: HTMLElement) {
    const nextImages = Array.from(
      root.querySelectorAll<HTMLImageElement>("img[src]"),
    ).map((image, index) => {
      image.dataset.previewIndex = String(index);
      return {
        alt: image.getAttribute("alt")?.trim() ?? "",
        src: image.currentSrc?.trim() || image.src?.trim() || "",
        title: image.getAttribute("title")?.trim() ?? "",
      };
    });

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

  function renderCodePreview(
    language: string,
    content: string,
    applyPreview: (value: null | string | HTMLElement) => void,
  ) {
    if (language.trim().toLowerCase() !== "mermaid") {
      return null;
    }

    const cacheKey = `${resolvedThemeName.value}::${content.trim()}`;
    const cachedPreview = mermaidPreviewCache.get(cacheKey);
    if (typeof cachedPreview === "string") {
      return wrapMermaidPreview(cachedPreview);
    }

    applyPreview(
      '<div class="desktop-doc-editor__diagram-preview">Rendering Mermaid...</div>',
    );

    if (cachedPreview instanceof Promise) {
      void cachedPreview
        .then((svg) => {
          applyPreview(wrapMermaidPreview(svg));
        })
        .catch(() => {
          applyPreview(createMermaidErrorMarkup());
        });
      return undefined;
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: resolvedThemeName.value === "dark" ? "dark" : "default",
    });

    const renderTask = mermaid
      .render(`docs-atlas-mermaid-${++mermaidSequence}`, content)
      .then(({ svg }) => {
        mermaidPreviewCache.set(cacheKey, svg);
        return svg;
      })
      .catch(() => {
        mermaidPreviewCache.delete(cacheKey);
        throw new Error("Mermaid render failed");
      });

    mermaidPreviewCache.set(cacheKey, renderTask);
    void renderTask
      .then((svg) => {
        applyPreview(wrapMermaidPreview(svg));
      })
      .catch(() => {
        applyPreview(createMermaidErrorMarkup());
      });

    return undefined;
  }

  function wrapMermaidPreview(svg: string) {
    return `<div class="desktop-doc-editor__diagram-preview">${svg}</div>`;
  }

  function createMermaidErrorMarkup() {
    return '<div class="desktop-doc-editor__diagram-preview"><div class="desktop-doc-editor__diagram-error">Mermaid 渲染失败</div></div>';
  }

  function handleEditorClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const previewToggleButton = target.closest(
      ".preview-toggle-button",
    ) as HTMLButtonElement | null;
    if (previewToggleButton) {
      window.setTimeout(() => {
        syncMermaidPreviewModeState(previewToggleButton);
      }, 0);
    }

    const image = target.closest(
      "img[data-preview-index]",
    ) as HTMLImageElement | null;
    if (!image) {
      return;
    }

    const index = Number.parseInt(image.dataset.previewIndex ?? "-1", 10);
    if (Number.isNaN(index) || index < 0) {
      return;
    }

    activePreviewImageIndex.value = index;
  }

  function handleEditorFocusIn(event: FocusEvent) {
    const target = event.target;
    if (!import.meta.env.DEV) {
      return;
    }

    console.debug("[DocsAtlas][editor] focusin", {
      slug: props.doc.slug,
      tagName: target instanceof HTMLElement ? target.tagName : "",
      className: target instanceof HTMLElement ? target.className : "",
    });
  }

  function handleEditorFocusOut(event: FocusEvent) {
    const target = event.target;
    if (!import.meta.env.DEV) {
      return;
    }

    console.debug("[DocsAtlas][editor] focusout", {
      slug: props.doc.slug,
      tagName: target instanceof HTMLElement ? target.tagName : "",
      className: target instanceof HTMLElement ? target.className : "",
    });
  }

  function handleEditorPointerUp(event: PointerEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const image = target.closest(
      "img[data-preview-index]",
    ) as HTMLImageElement | null;
    if (!image) {
      return;
    }

    const index = Number.parseInt(image.dataset.previewIndex ?? "-1", 10);
    if (Number.isNaN(index) || index < 0) {
      return;
    }

    activePreviewImageIndex.value = index;
  }

  function syncMermaidPreviewModeState(toggleButton: HTMLButtonElement) {
    const block = toggleButton.closest(
      ".milkdown-code-block",
    ) as HTMLElement | null;
    if (!block) {
      return;
    }

    const language =
      block
        .querySelector<HTMLElement>(".language-button")
        ?.textContent?.trim()
        .toLowerCase() ?? "";
    if (language !== "mermaid") {
      return;
    }

    const content = extractCodeBlockContent(block);
    if (!content) {
      return;
    }

    const key =
      block.dataset.mermaidPreviewKey ??
      createMermaidPreviewStateKey(props.doc.slug, content);
    mermaidPreviewModeByKey.set(key, isCodeBlockPreviewOnly(block));
    block.dataset.mermaidPreviewKey = key;
  }

  function extractCodeBlockContent(block: HTMLElement) {
    const codeContent = block.querySelector<HTMLElement>(
      ".cm-content, .milkdown-code-block-placeholder code",
    );
    return codeContent?.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  }

  function isCodeBlockPreviewOnly(block: HTMLElement) {
    return (
      block.querySelector(".codemirror-host")?.classList.contains("hidden") ??
      false
    );
  }

  function createMermaidPreviewStateKey(slug: string, content: string) {
    return `${slug}::${content.trim()}`;
  }

  function closePreviewImage() {
    activePreviewImageIndex.value = -1;
  }

  function splitUrlReference(value: string) {
    const hashIndex = value.indexOf("#");
    const queryIndex = value.indexOf("?");
    const cutoffCandidates = [hashIndex, queryIndex].filter(
      (index) => index >= 0,
    );
    const cutoff =
      cutoffCandidates.length > 0
        ? Math.min(...cutoffCandidates)
        : value.length;

    return {
      pathname: value.slice(0, cutoff),
      suffix: value.slice(cutoff),
    };
  }

  function isAbsoluteFilePath(pathname: string) {
    return (
      pathname.startsWith("/") ||
      /^[a-zA-Z]:[\\/]/.test(pathname) ||
      pathname.startsWith("file://")
    );
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
    theme: "dark" | "light",
    markdownThemeId: DesktopMarkdownThemeId,
  ): EditorPalette {
    const isDark = theme === "dark";
    const surfaceStrong = readRootToken("--desktop-surface-strong");
    const surface = readRootToken("--desktop-surface");
    const fieldStrong = readRootToken("--desktop-field-bg-strong");

    if (markdownThemeId === "github") {
      return {
        panelBackground: isDark ? fieldStrong : "#ffffff",
        surfaceLow: isDark ? "rgba(110, 118, 129, 0.08)" : "#f8fafc",
        codeBackground: isDark
          ? "color-mix(in srgb, #161b22 78%, rgba(var(--desktop-accent-rgb), 0.22))"
          : "color-mix(in srgb, #f6f8fa 92%, rgba(var(--desktop-accent-rgb), 0.08))",
        codeBorder: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.22)"
          : "rgba(31, 35, 40, 0.12)",
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
          ? "rgba(110, 118, 129, 0.05)"
          : "rgba(246, 248, 250, 0.72)",
        mutedLine: isDark
          ? "rgba(110, 118, 129, 0.3)"
          : "rgba(31, 35, 40, 0.12)",
        softFill: isDark
          ? "rgba(110, 118, 129, 0.1)"
          : "rgba(175, 184, 193, 0.12)",
        hoverFill: isDark
          ? "rgba(110, 118, 129, 0.12)"
          : "rgba(175, 184, 193, 0.14)",
        selectionFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(var(--desktop-accent-rgb), 0.12)",
      };
    }

    if (markdownThemeId === "compact") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 84%, rgba(var(--desktop-accent-rgb), 0.14))`
          : `color-mix(in srgb, ${surfaceStrong} 90%, rgba(var(--desktop-accent-rgb), 0.06))`,
        surfaceLow: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.08)"
          : "rgba(var(--desktop-accent-rgb), 0.04)",
        codeBackground: isDark
          ? "color-mix(in srgb, rgba(11, 18, 32, 0.92) 74%, rgba(var(--desktop-accent-rgb), 0.24))"
          : "color-mix(in srgb, white 86%, rgba(var(--desktop-accent-rgb), 0.12))",
        codeBorder: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(var(--desktop-accent-rgb), 0.12)",
        codeText: isDark ? "#edf3ff" : "#1f2b3d",
        inlineCodeBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.14)"
          : "rgba(var(--desktop-accent-rgb), 0.08)",
        inlineCodeColor: readRootToken("--desktop-accent"),
        quoteBackground: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.1)"
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
          ? "rgba(var(--desktop-accent-rgb), 0.12)"
          : "rgba(var(--desktop-accent-rgb), 0.06)",
        hoverFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.14)"
          : "rgba(var(--desktop-accent-rgb), 0.08)",
        selectionFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(var(--desktop-accent-rgb), 0.12)",
      };
    }

    if (markdownThemeId === "reading") {
      return {
        panelBackground: isDark
          ? `color-mix(in srgb, ${surfaceStrong} 82%, rgba(var(--desktop-accent-rgb), 0.14))`
          : `color-mix(in srgb, ${surfaceStrong} 88%, rgba(var(--desktop-accent-rgb), 0.05))`,
        surfaceLow: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
        codeBackground: isDark
          ? "color-mix(in srgb, rgba(14, 22, 38, 0.94) 74%, rgba(var(--desktop-accent-rgb), 0.22))"
          : "color-mix(in srgb, #f7f5f1 88%, rgba(var(--desktop-accent-rgb), 0.1))",
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
        hoverFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.12)"
          : "rgba(99, 112, 138, 0.08)",
        selectionFill: isDark
          ? "rgba(var(--desktop-accent-rgb), 0.18)"
          : "rgba(99, 112, 138, 0.1)",
      };
    }

    return {
      panelBackground: isDark
        ? `color-mix(in srgb, ${surfaceStrong} 84%, rgba(var(--desktop-accent-rgb), 0.14))`
        : `color-mix(in srgb, ${surfaceStrong} 90%, rgba(var(--desktop-accent-rgb), 0.06))`,
      surfaceLow: isDark ? "rgba(255, 255, 255, 0.03)" : surface,
      codeBackground: isDark
        ? "color-mix(in srgb, rgba(10, 18, 34, 0.94) 72%, rgba(var(--desktop-accent-rgb), 0.28))"
        : "color-mix(in srgb, white 84%, rgba(var(--desktop-accent-rgb), 0.12))",
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
      hoverFill: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.14)"
        : "rgba(var(--desktop-accent-rgb), 0.08)",
      selectionFill: isDark
        ? "rgba(var(--desktop-accent-rgb), 0.18)"
        : "rgba(var(--desktop-accent-rgb), 0.12)",
    };
  }

  function readRootToken(name: string, rootStyles?: CSSStyleDeclaration) {
    const styles =
      rootStyles ?? window.getComputedStyle(document.documentElement);
    return styles.getPropertyValue(name).trim();
  }

  async function persistDraft(options?: {
    absolutePath?: string;
    markdown?: string;
    mode?: "auto" | "manual";
  }) {
    const editor = editorRef.value;
    const absolutePath =
      options?.absolutePath ?? currentDocAbsolutePath.value ?? "";
    const mode = options?.mode ?? "manual";
    const nextMarkdown =
      options?.markdown ?? editor?.getMarkdown() ?? draftMarkdown.value;

    if (
      !absolutePath ||
      isSaving.value ||
      nextMarkdown === savedMarkdown.value
    ) {
      return false;
    }

    isSaving.value = true;
    saveError.value = "";

    try {
      await props.saveDoc(absolutePath, nextMarkdown);
      const modifiedAt = new Date().toISOString();
      savedMarkdown.value = nextMarkdown;
      draftMarkdown.value = nextMarkdown;
      currentDocModifiedAt.value = modifiedAt;
      emit("saved", { mode, modifiedAt });
      return true;
    } catch (error) {
      saveError.value =
        error instanceof Error ? error.message : "保存失败，请稍后重试";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function handleSave() {
    await persistDraft({ mode: "manual" });
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
</script>

<template>
  <div
    class="desktop-doc-editor"
    :class="{
      'desktop-doc-editor--dirty': isDirty && !isSaving && !saveError,
      'desktop-doc-editor--error': !!saveError,
      'desktop-doc-editor--readonly': !hasEditableSource,
      'desktop-doc-editor--ready': isEditorMounted,
    }"
    :data-markdown-theme="props.markdownThemeId"
    :title="
      saveError ||
      (!hasEditableSource
        ? '当前文档不可编辑'
        : isDirty
          ? '已修改，按 Ctrl/Cmd + S 保存'
          : 'Markdown 所见即所得编辑')
    "
  >
    <div
      ref="host"
      class="desktop-doc-editor__editor"
      @click="handleEditorClick"
      @focusin="handleEditorFocusIn"
      @focusout="handleEditorFocusOut"
      @pointerup="handleEditorPointerUp"
    />
  </div>

  <DesktopDocImagePreview
    v-if="activePreviewImageIndex >= 0"
    :active-index="activePreviewImageIndex"
    :images="previewImages"
    @close="closePreviewImage"
    @update:active-index="activePreviewImageIndex = $event"
  />
</template>

<style scoped>
  .desktop-doc-editor {
    position: relative;
    min-width: 0;
    background: transparent;
  }

  .desktop-doc-editor__editor {
    min-width: 0;
    background: transparent;
  }

  .desktop-doc-editor--readonly {
    opacity: 0.82;
  }

  .desktop-doc-editor--error .desktop-doc-editor__editor {
    outline: 1px solid rgba(215, 70, 70, 0.2);
    outline-offset: -1px;
  }

  .desktop-doc-editor__editor :deep(.milkdown) {
    background: transparent;
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.milkdown .editor) {
    background: transparent;
  }

  .desktop-doc-editor__editor :deep(.milkdown .ProseMirror) {
    min-height: 100%;
    width: 100%;
    max-width: none;
    color: var(--desktop-ink);
    font-family: var(--desktop-font-sans);
    font-size: 0.94rem;
    line-height: 1.78;
    letter-spacing: 0.002em;
    background: var(--crepe-color-background);
    overflow-anchor: none;
    padding: 0 50px 36px;
  }

  .desktop-doc-editor__editor :deep(.milkdown .ProseMirror:focus) {
    outline: none;
  }

  .desktop-doc-editor__editor :deep(.milkdown h1),
  .desktop-doc-editor__editor :deep(.milkdown h2),
  .desktop-doc-editor__editor :deep(.milkdown h3),
  .desktop-doc-editor__editor :deep(.milkdown h4),
  .desktop-doc-editor__editor :deep(.milkdown h5),
  .desktop-doc-editor__editor :deep(.milkdown h6) {
    font-family: var(--desktop-font-sans);
    color: var(--desktop-ink);
    line-height: 1.28;
    letter-spacing: -0.022em;
    font-weight: 650;
  }

  .desktop-doc-editor__editor :deep(.milkdown h1) {
    font-size: 1.62rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown h2) {
    font-size: 1.14rem;
    border-bottom: 1px solid var(--docs-atlas-muted-line);
  }

  .desktop-doc-editor__editor :deep(.milkdown h3) {
    font-size: 1rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown h4) {
    font-size: 0.94rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown h5),
  .desktop-doc-editor__editor :deep(.milkdown h6) {
    font-size: 0.9rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown p),
  .desktop-doc-editor__editor :deep(.milkdown li),
  .desktop-doc-editor__editor :deep(.milkdown td),
  .desktop-doc-editor__editor :deep(.milkdown th),
  .desktop-doc-editor__editor :deep(.milkdown blockquote) {
    font-size: 0.94rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown a) {
    color: var(--desktop-accent);
    text-underline-offset: 0.18em;
    text-decoration-thickness: 0.06em;
    text-decoration-color: rgba(var(--desktop-accent-rgb), 0.34);
  }

  .desktop-doc-editor__editor :deep(.milkdown blockquote) {
    border-left: 3px solid rgba(var(--desktop-accent-rgb), 0.36);
    background: var(--docs-atlas-quote-bg);
    color: var(--desktop-soft);
    padding-left: 20px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .desktop-doc-editor__editor :deep(.milkdown blockquote::before) {
    display: none;
  }

  .desktop-doc-editor__editor :deep(.milkdown hr) {
    border-color: var(--docs-atlas-muted-line);
  }

  .desktop-doc-editor__editor :deep(.milkdown code) {
    font-family: "SFMono-Regular", "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.835rem;
  }

  .desktop-doc-editor__editor :deep(.milkdown :not(pre) > code) {
    border: 1px solid var(--docs-atlas-code-border);
    border-radius: 0.42rem;
    background: var(--docs-atlas-inline-code-bg);
    color: var(--docs-atlas-inline-code-color);
  }

  .desktop-doc-editor__editor :deep(.milkdown pre) {
    margin: 0;
    border-radius: 16px;
    background: var(--docs-atlas-code-bg);
    color: var(--docs-atlas-code-text);
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block) {
    position: relative;
    margin: 1.05rem 0 1.25rem;
    border: 1px solid
      color-mix(
        in srgb,
        var(--docs-atlas-code-border) 58%,
        rgba(var(--desktop-accent-rgb), 0.34)
      );
    border-radius: 18px;
    background: var(--docs-atlas-code-bg);
    box-shadow:
      0 12px 28px rgba(var(--desktop-shadow), 0.055),
      inset 0 1px 0 rgba(255, 255, 255, 0.045);
    overflow-anchor: none;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block-placeholder) {
    margin: 0;
    min-height: 0;
    padding: calc(1.05rem + 2.7rem) 1.4rem 1.25rem;
    border-radius: 0 0 18px 18px;
    background: transparent;
    color: var(--docs-atlas-code-text);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    box-sizing: border-box;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block-placeholder code) {
    display: block;
    font-family: "SFMono-Regular", "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.82rem;
    line-height: 1.7;
    tab-size: 2;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .tools) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    min-height: 2.7rem;
    /* padding: 0.48rem 1.05rem; */
    border-bottom: 1px solid
      color-mix(
        in srgb,
        var(--docs-atlas-code-border) 52%,
        rgba(var(--desktop-accent-rgb), 0.3)
      );
    /* background: color-mix(
      in srgb,
      var(--docs-atlas-code-bg) 88%,
      rgba(var(--desktop-accent-rgb), 0.08)
    ); */
    box-sizing: border-box;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .language-button),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .tools-button-group button) {
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    min-height: 1.72rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.08);
    padding: 0 0.68rem;
    background: color-mix(in srgb, var(--docs-atlas-code-bg) 78%, white 8%);
    color: var(--docs-atlas-code-text);
    font-family: "SFMono-Regular", "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.73rem;
    font-weight: 600;
    line-height: 1;
    border-radius: 10px;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .language-button) {
    flex: 0 0 auto;
    max-width: min(42%, 14rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .tools-button-group) {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    margin-left: auto;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .language-button:hover),
  .desktop-doc-editor__editor
    :deep(
      .milkdown .milkdown-code-block .tools .tools-button-group button:hover
    ) {
    border-color: rgba(var(--desktop-accent-rgb), 0.2);
    background: rgba(var(--desktop-accent-rgb), 0.11);
    transform: translateY(-1px);
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .tools .language-button:focus-visible),
  .desktop-doc-editor__editor
    :deep(
      .milkdown
        .milkdown-code-block
        .tools
        .tools-button-group
        button:focus-visible
    ) {
    outline: 2px solid rgba(var(--desktop-accent-rgb), 0.28);
    outline-offset: 1px;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .cm-editor),
  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .cm-gutters),
  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .preview) {
    background: transparent;
    color: var(--docs-atlas-code-text);
    overflow-anchor: none;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .cm-editor) {
    font-size: 0.82rem;
    line-height: 1.7;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .cm-gutters) {
    display: none;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .cm-content) {
    padding: 1.08rem 0 0;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .cm-line) {
    padding: 0;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .cm-content),
  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .preview),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview code) {
    font-family: "SFMono-Regular", "JetBrains Mono", "Fira Code", monospace;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .cm-activeLineGutter),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .cm-activeLine) {
    background: rgba(var(--desktop-accent-rgb), 0.08);
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-code-block .preview) {
    border-top: 0;
    padding: 1.05rem 1.25rem 1.2rem;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview pre) {
    white-space: pre-wrap;
    background: transparent;
    border-radius: 0;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview-panel) {
    background: transparent;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview-label) {
    display: none;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview-divider) {
    display: none;
  }

  .desktop-doc-editor__editor :deep(.milkdown img) {
    display: block;
    max-width: min(100%, 920px);
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
    border-radius: 14px;
    box-shadow: 0 14px 30px rgba(var(--desktop-shadow), 0.12);
    cursor: zoom-in;
  }

  .desktop-doc-editor__editor :deep(.milkdown table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  .desktop-doc-editor__editor :deep(.milkdown th),
  .desktop-doc-editor__editor :deep(.milkdown td) {
    min-width: 7rem;
    border: 1px solid var(--docs-atlas-muted-line);
    text-align: left;
    vertical-align: top;
    word-break: break-word;
    overflow-wrap: anywhere;
    line-height: 1.58;
  }

  .desktop-doc-editor__editor :deep(.milkdown th) {
    background: var(--docs-atlas-table-head-bg);
    font-weight: 600;
  }

  .desktop-doc-editor__editor :deep(.milkdown tbody tr:nth-child(even) td) {
    background: var(--docs-atlas-table-zebra-bg);
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-table-block) {
    overflow: visible;
  }

  .desktop-doc-editor__editor :deep(.milkdown .milkdown-table-block .handle),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-table-block .line-handle .add-button),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-table-block .cell-handle .button-group button) {
    background: var(--crepe-color-background);
    color: var(--desktop-muted);
    border-color: var(--docs-atlas-muted-line);
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-table-block .selectedCell::after) {
    background: rgba(var(--desktop-accent-rgb), 0.12);
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .search-box) {
    background: var(--docs-atlas-soft-fill);
    border: 1px solid var(--docs-atlas-muted-line);
    min-height: 1.78rem;
    border-radius: 0.55rem;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .search-box input) {
    background: transparent;
    color: var(--desktop-ink);
    font-size: 0.76rem;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .search-box input:focus) {
    outline: none;
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .search-box .search-icon),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .search-box .clear-icon) {
    color: var(--desktop-muted);
  }

  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block-placeholder code.hljs),
  .desktop-doc-editor__editor
    :deep(.milkdown .milkdown-code-block .preview code.hljs) {
    background: transparent;
    color: var(--docs-atlas-code-text);
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-comment),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-quote) {
    color: color-mix(in srgb, var(--docs-atlas-code-text) 42%, transparent);
    font-style: italic;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-keyword),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-selector-tag),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-type) {
    color: #d06df8;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-title),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-title.function_),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-section) {
    color: #66b8ff;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-string),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-attr),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-template-tag) {
    color: #75d7a8;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-number),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-literal),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-symbol),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-bullet) {
    color: #ffb36b;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-variable),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-template-variable),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-name) {
    color: #ff8e8e;
  }

  .desktop-doc-editor__editor :deep(.milkdown .hljs-operator),
  .desktop-doc-editor__editor :deep(.milkdown .hljs-punctuation) {
    color: color-mix(in srgb, var(--docs-atlas-code-text) 78%, white 22%);
  }

  .desktop-doc-editor__editor :deep(.milkdown .ProseMirror-selectednode) {
    outline-color: rgba(var(--desktop-accent-rgb), 0.28);
  }

  .desktop-doc-editor__editor :deep(.milkdown .ProseMirror ::selection) {
    background: rgba(var(--desktop-accent-rgb), 0.22);
    color: var(--desktop-ink);
  }

  .desktop-doc-editor__editor :deep(.milkdown .cm-focused) {
    outline: none;
  }

  .desktop-doc-editor__editor :deep(.milkdown .cm-selectionBackground),
  .desktop-doc-editor__editor :deep(.milkdown .cm-content ::selection),
  .desktop-doc-editor__editor :deep(.milkdown .cm-line ::selection) {
    background: rgba(var(--desktop-accent-rgb), 0.24) !important;
  }

  .desktop-doc-editor__editor :deep(.milkdown .cm-cursor) {
    border-left-color: var(--desktop-accent);
  }

  .desktop-doc-editor__editor :deep(.milkdown .cm-panels) {
    background: transparent;
    color: var(--desktop-soft);
  }

  .desktop-doc-editor__editor :deep(.milkdown .cm-panel input) {
    background: var(--docs-atlas-soft-fill);
    color: var(--desktop-ink);
    border-color: var(--docs-atlas-muted-line);
  }

  .desktop-doc-editor__diagram-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 140px;
    width: 100%;
    padding: 1.1rem 1rem;
    color: var(--desktop-soft);
    text-align: center;
  }

  .desktop-doc-editor__diagram-preview :deep(svg) {
    max-width: 100%;
    height: auto;
  }

  .desktop-doc-editor__diagram-error {
    color: rgb(210, 69, 69);
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    .desktop-doc-editor__editor :deep(.milkdown .ProseMirror) {
      max-width: none;
    }
  }
</style>
