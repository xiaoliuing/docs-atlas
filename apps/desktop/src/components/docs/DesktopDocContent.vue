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
  import type { DesktopMarkdownThemeId } from "@/composables/useDesktopPreferences";
  import type { DocDetail } from "@/types/docs";
  import DesktopUiIcon from "@/components/ui/DesktopUiIcon.vue";
  import DesktopDocEditor from "./DesktopDocEditor.vue";

  const props = withDefaults(
    defineProps<{
      doc: DocDetail;
      isFavorite?: boolean;
      highlightQuery?: string;
      markdownThemeId?: DesktopMarkdownThemeId;
      restoreScrollTop?: number;
      saveDoc: (absolutePath: string, markdown: string) => Promise<void>;
    }>(),
    {
      isFavorite: false,
      highlightQuery: "",
      markdownThemeId: "atlas",
      restoreScrollTop: 0,
    },
  );

  const emit = defineEmits<{
    scrollTopChange: [top: number];
    toggleFavorite: [];
  }>();

  const bodyScrollRef = useTemplateRef<HTMLElement>("bodyScroll");
  const currentModifiedAt = shallowRef(props.doc.modifiedAt ?? "");
  const saveFeedbackMessage = shallowRef("");
  let stopScrollDiagnostics: (() => void) | null = null;
  let saveFeedbackTimer: number | null = null;

  const formattedModifiedAt = computed(() => {
    if (!currentModifiedAt.value) {
      return "未记录编辑时间";
    }

    const date = new Date(currentModifiedAt.value);
    if (Number.isNaN(date.getTime())) {
      return "未记录编辑时间";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  });

  watch(
    () =>
      [props.doc.slug, props.restoreScrollTop, props.highlightQuery] as const,
    async ([slug, restoreScrollTop, highlightQuery]) => {
      if (!slug) {
        return;
      }

      await nextTick();

      const scrollElement = bodyScrollRef.value;
      if (!scrollElement) {
        return;
      }

      const nextTop = highlightQuery.trim() ? 0 : Math.max(0, restoreScrollTop);
      if (Math.abs(scrollElement.scrollTop - nextTop) > 1) {
        scrollElement.scrollTop = nextTop;
      }
      emit("scrollTopChange", scrollElement.scrollTop);
    },
    { immediate: true },
  );

  watch(
    () => props.doc.modifiedAt ?? "",
    (nextValue) => {
      currentModifiedAt.value = nextValue;
    },
    { immediate: true },
  );

  watch(
    () => props.doc.slug,
    () => {
      clearSaveFeedback();
    },
  );

  function handleBodyScroll(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    emit("scrollTopChange", target.scrollTop);
  }

  function releaseEditorFocus() {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement.closest(".desktop-doc-editor__editor")
    ) {
      activeElement.blur();
    }
  }

  function handleDocSaved(payload: {
    mode: "auto" | "manual";
    modifiedAt: string;
  }) {
    currentModifiedAt.value = payload.modifiedAt;
    if (payload.mode === "manual") {
      showSaveFeedback("已保存");
    }
  }

  function showSaveFeedback(message: string) {
    saveFeedbackMessage.value = message;
    if (saveFeedbackTimer !== null) {
      window.clearTimeout(saveFeedbackTimer);
    }
    saveFeedbackTimer = window.setTimeout(() => {
      saveFeedbackMessage.value = "";
      saveFeedbackTimer = null;
    }, 1800);
  }

  function clearSaveFeedback() {
    saveFeedbackMessage.value = "";
    if (saveFeedbackTimer !== null) {
      window.clearTimeout(saveFeedbackTimer);
      saveFeedbackTimer = null;
    }
  }

  function startScrollDiagnostics() {
    if (!import.meta.env.DEV) {
      return;
    }

    const scrollElement = bodyScrollRef.value;
    if (!scrollElement) {
      return;
    }

    let lastInteraction = "initial";
    let lastTop = scrollElement.scrollTop;
    const interactionListeners: Array<[keyof WindowEventMap, EventListener]> = [
      ["wheel", () => (lastInteraction = "wheel")],
      ["touchstart", () => (lastInteraction = "touchstart")],
      ["keydown", () => (lastInteraction = "keydown")],
      ["mousedown", () => (lastInteraction = "mousedown")],
    ];

    interactionListeners.forEach(([type, listener]) => {
      window.addEventListener(type, listener, { passive: true });
    });

    const originalScrollTo = scrollElement.scrollTo.bind(scrollElement);
    scrollElement.scrollTo = ((
      ...args: Parameters<HTMLElement["scrollTo"]>
    ) => {
      console.debug("[DocsAtlas][scroll] scrollTo called", {
        args,
        lastInteraction,
        slug: props.doc.slug,
        from: scrollElement.scrollTop,
      });
      return originalScrollTo(...args);
    }) as HTMLElement["scrollTo"];

    const handleScroll = () => {
      const nextTop = scrollElement.scrollTop;
      console.debug("[DocsAtlas][scroll] scrollTop changed", {
        delta: nextTop - lastTop,
        lastInteraction,
        nextTop,
        slug: props.doc.slug,
      });
      lastTop = nextTop;
      lastInteraction = "scroll";
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    stopScrollDiagnostics = () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      scrollElement.scrollTo = originalScrollTo as HTMLElement["scrollTo"];
      interactionListeners.forEach(([type, listener]) => {
        window.removeEventListener(type, listener);
      });
      stopScrollDiagnostics = null;
    };

    console.debug("[DocsAtlas][scroll] diagnostics attached", {
      slug: props.doc.slug,
    });
  }

  onMounted(() => {
    startScrollDiagnostics();
  });

  onBeforeUnmount(() => {
    stopScrollDiagnostics?.();
    clearSaveFeedback();
  });
</script>

<template>
  <article class="doc-content">
    <div
      class="doc-content__panel"
      :data-markdown-theme="props.markdownThemeId"
    >
      <header class="doc-content__header">
        <div class="doc-content__header-top">
          <div class="doc-content__identity">
            <p class="doc-content__section">
              {{
                doc.sectionTitle
                  ? `${doc.sourceLabel} / ${doc.sectionTitle}`
                  : doc.sourceLabel
              }}
            </p>
            <h1 class="doc-content__title">{{ doc.title }}</h1>
          </div>

          <button
            :class="[
              'doc-content__favorite',
              { 'doc-content__favorite--active': props.isFavorite },
            ]"
            type="button"
            @click="emit('toggleFavorite')"
          >
            <DesktopUiIcon name="bookmark" :size="16" />
            <span>{{ props.isFavorite ? "已收藏" : "收藏" }}</span>
          </button>
        </div>

        <div class="doc-content__meta">
          <span class="doc-content__meta-label">最后编辑</span>
          <strong class="doc-content__meta-value">{{
            formattedModifiedAt
          }}</strong>
          <transition name="doc-content__save-feedback">
            <span v-if="saveFeedbackMessage" class="doc-content__save-feedback">
              {{ saveFeedbackMessage }}
            </span>
          </transition>
        </div>
      </header>

      <div
        ref="bodyScroll"
        id="desktop-doc-scroll"
        class="doc-content__body-scroll desktop-scroll"
        @touchstart.passive="releaseEditorFocus"
        @wheel.passive="releaseEditorFocus"
        @scroll="handleBodyScroll"
      >
        <DesktopDocEditor
          :doc="doc"
          :highlight-query="props.highlightQuery"
          :markdown-theme-id="props.markdownThemeId"
          :save-doc="props.saveDoc"
          @saved="handleDocSaved"
        />
      </div>
    </div>
  </article>
</template>

<style scoped>
  .doc-content {
    min-width: 0;
    min-height: 0;
  }

  .doc-content__panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    border: 1px solid
      color-mix(in srgb, var(--desktop-line-strong) 38%, var(--desktop-line));
    border-radius: var(--desktop-radius-lg);
    background: var(--desktop-surface-strong);
    box-shadow:
      0 14px 30px rgba(var(--desktop-shadow), 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    overflow: hidden;
  }

  .doc-content__panel[data-markdown-theme="github"] {
    background: var(--desktop-surface-strong);
  }

  .doc-content__header {
    flex-shrink: 0;
    z-index: 4;
    padding: 0.82rem 0.96rem 0.72rem;
    border-bottom: 1px solid
      color-mix(
        in srgb,
        rgba(var(--desktop-accent-rgb), 0.22) 72%,
        var(--desktop-line-strong)
      );
    background: color-mix(
      in srgb,
      var(--desktop-surface-strong) 94%,
      rgba(var(--desktop-accent-rgb), 0.06)
    );
    border-radius: calc(var(--desktop-radius-lg) - 1px)
      calc(var(--desktop-radius-lg) - 1px) 0 0;
  }

  .doc-content__body-scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-anchor: none;
  }

  .doc-content__header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .doc-content__identity {
    display: grid;
    gap: 0.18rem;
    min-width: 0;
  }

  .doc-content__section {
    margin: 0;
    color: var(--desktop-muted);
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.45;
  }

  .doc-content__title {
    margin: 0;
    color: var(--desktop-ink);
    font-size: 1.14rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .doc-content__meta {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    margin-top: 0.58rem;
    color: var(--desktop-muted);
    font-size: 0.74rem;
    line-height: 1.4;
  }

  .doc-content__meta-label {
    color: var(--desktop-muted);
  }

  .doc-content__meta-value {
    color: var(--desktop-ink);
    font-size: 0.76rem;
    font-weight: 600;
  }

  .doc-content__save-feedback {
    display: inline-flex;
    align-items: center;
    min-height: 1.42rem;
    padding: 0.12rem 0.48rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.16);
    border-radius: 999px;
    background: rgba(var(--desktop-accent-rgb), 0.08);
    color: var(--desktop-accent);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1;
  }

  .doc-content__save-feedback-enter-active,
  .doc-content__save-feedback-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }

  .doc-content__save-feedback-enter-from,
  .doc-content__save-feedback-leave-to {
    opacity: 0;
    transform: translateY(-2px);
  }

  .doc-content__favorite {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    min-height: 2rem;
    padding: 0.32rem 0.72rem;
    border: 1px solid rgba(var(--desktop-accent-rgb), 0.15);
    border-radius: 999px;
    background: rgba(var(--desktop-accent-rgb), 0.05);
    color: var(--desktop-muted);
    font: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background-color 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
    flex-shrink: 0;
  }

  .doc-content__favorite:hover,
  .doc-content__favorite--active {
    border-color: rgba(var(--desktop-accent-rgb), 0.28);
    background: rgba(var(--desktop-accent-rgb), 0.12);
    color: var(--desktop-accent);
    transform: translateY(-1px);
  }
</style>
