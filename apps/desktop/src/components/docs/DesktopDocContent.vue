<script setup lang="ts">
  import { nextTick, useTemplateRef, watch } from "vue";
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

  watch(
    () => [props.doc.slug, props.restoreScrollTop, props.highlightQuery] as const,
    async ([slug, restoreScrollTop, highlightQuery]) => {
      if (!slug) {
        return;
      }

      await nextTick();

      const scrollElement = bodyScrollRef.value;
      if (!scrollElement) {
        return;
      }

      scrollElement.scrollTop = highlightQuery.trim()
        ? 0
        : Math.max(0, restoreScrollTop);
      emit("scrollTopChange", scrollElement.scrollTop);
    },
    { immediate: true },
  );

  function handleBodyScroll(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    emit("scrollTopChange", target.scrollTop);
  }
</script>

<template>
  <article class="doc-content">
    <div
      class="doc-content__panel"
      :data-markdown-theme="props.markdownThemeId"
    >
      <header class="doc-content__header">
        <div class="doc-content__header-top">
          <p class="doc-content__section">
            {{
              doc.sectionTitle
                ? `${doc.sourceLabel} / ${doc.sectionTitle}`
                : doc.sourceLabel
            }}
          </p>

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
      </header>

      <div
        ref="bodyScroll"
        class="doc-content__body-scroll desktop-scroll"
        @scroll="handleBodyScroll"
      >
        <DesktopDocEditor
          :doc="doc"
          :highlight-query="props.highlightQuery"
          :markdown-theme-id="props.markdownThemeId"
          :save-doc="props.saveDoc"
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
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 18%),
      var(--desktop-surface-strong);
    box-shadow: 0 12px 28px rgba(var(--desktop-shadow), 0.065);
    overflow: hidden;
  }

  .doc-content__panel[data-markdown-theme="github"] {
    background: var(--desktop-surface);
  }

  .doc-content__header {
    flex-shrink: 0;
    z-index: 4;
    padding: 0.82rem 0.96rem 0.72rem;
    border-bottom: 1px solid rgba(var(--desktop-accent-rgb), 0.08);
    background:
      linear-gradient(
        180deg,
        rgba(var(--desktop-accent-rgb), 0.075),
        transparent 88%
      ),
      color-mix(
        in srgb,
        var(--desktop-surface-strong) 94%,
        rgba(var(--desktop-accent-rgb), 0.1)
      );
    backdrop-filter: blur(12px);
    border-radius: calc(var(--desktop-radius-lg) - 1px)
      calc(var(--desktop-radius-lg) - 1px) 0 0;
  }

  .doc-content__body-scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .doc-content__header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .doc-content__section {
    margin: 0;
    color: var(--desktop-muted);
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.45;
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
