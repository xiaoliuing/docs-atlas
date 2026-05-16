<script setup lang="ts">
import { shallowRef } from 'vue'
import DocImagePreview from '@/components/docs/DocImagePreview.vue'
import type { DocDetail } from '@/types/docs'

const props = defineProps<{
  doc: DocDetail
}>()

type PreviewImage = {
  alt: string
  src: string
  title: string
}

const previewImages = shallowRef<PreviewImage[]>([])
const previewIndex = shallowRef(0)

function closePreview() {
  previewImages.value = []
  previewIndex.value = 0
}

function setPreviewIndex(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= previewImages.value.length) {
    return
  }

  previewIndex.value = nextIndex
}

function handleBodyClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const image = target.closest('img')
  if (!(image instanceof HTMLImageElement)) {
    return
  }

  if (!event.currentTarget || !(event.currentTarget instanceof HTMLElement)) {
    return
  }

  if (!event.currentTarget.contains(image)) {
    return
  }

  event.preventDefault()
  if (!image.currentSrc && !image.getAttribute('src')) {
    return
  }

  const imageElements = Array.from(event.currentTarget.querySelectorAll('img'))
    .filter((item) => item.currentSrc || item.getAttribute('src'))

  if (imageElements.length === 0) {
    return
  }

  previewImages.value = imageElements.map((item) => ({
    alt: item.getAttribute('alt') ?? '',
    src: item.currentSrc || item.getAttribute('src') || '',
    title: item.getAttribute('title') ?? '',
  }))
  previewIndex.value = Math.max(imageElements.indexOf(image), 0)
}
</script>

<template>
  <article class="doc-content">
    <header class="doc-content__header">
      <div class="doc-content__header-top">
        <p class="doc-content__section">
          {{ doc.sectionTitle ? `${doc.sourceLabel} / ${doc.sectionTitle}` : doc.sourceLabel }}
        </p>
        <code class="doc-content__source">{{ doc.sourcePath }}</code>
      </div>
      <h1 class="doc-content__title">
        {{ doc.title }}
      </h1>
    </header>

    <div class="doc-content__body-shell">
      <div class="doc-content__body prose" v-html="doc.html" @click="handleBodyClick" />
    </div>
  </article>

  <DocImagePreview
    :active-index="previewIndex"
    :images="previewImages"
    @close="closePreview"
    @update:active-index="setPreviewIndex"
  />
</template>

<style scoped>
  .doc-content {
    display: grid;
    gap: 0.95rem;
  }

  .doc-content__header {
    display: grid;
    gap: 0.62rem;
    padding: 1.3rem 1.4rem;
    border: 1px solid var(--color-line);
    border-radius: 22px;
    background: var(--surface-panel-alt);
    box-shadow: 0 10px 24px rgba(var(--theme-shadow-rgb), 0.08);
  }

  .doc-content__header-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .doc-content__section {
    margin: 0;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    padding: 0.28rem 0.58rem;
    border-radius: 999px;
    background: rgba(var(--color-accent-rgb), 0.12);
    letter-spacing: 0.08em;
    color: var(--color-accent-deep);
    font-size: 0.74rem;
  }

  .doc-content__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.72rem, 3.2vw, 2.45rem);
    line-height: 1.14;
    letter-spacing: -0.02em;
  }

  .doc-content__summary {
    margin: 0;
    max-width: 56rem;
    color: var(--color-muted);
    font-size: 1.06rem;
  }

  .doc-content__body {
    min-width: 0;
    width: 100%;
    max-width: min(100%, 78ch);
    margin-inline: auto;
  }

  .doc-content__body-shell {
    min-width: 0;
    padding: 1rem clamp(0.72rem, 1vw, 0.96rem);
    border: 1px solid var(--color-line);
    border-radius: 22px;
    background: var(--surface-markdown);
    box-shadow: 0 12px 28px rgba(var(--theme-shadow-rgb), 0.08);
  }

  .doc-content__source {
    color: var(--color-soft);
    font-size: 0.78rem;
  }

  @media (max-width: 960px) {
    .doc-content__header {
      padding: 1.05rem 1.1rem;
      border-radius: 18px;
    }

    .doc-content__title {
      font-size: clamp(1.55rem, 6vw, 2.05rem);
    }
  }

  @media (max-width: 640px) {
    .doc-content__header {
      gap: 0.55rem;
      padding: 0.95rem;
      border-radius: 16px;
    }

    .doc-content__body-shell {
      padding: 0.78rem 0.72rem;
      border-radius: 16px;
    }

    .doc-content__body {
      max-width: 100%;
    }

    .doc-content__summary {
      font-size: 1rem;
    }

    .doc-content__source {
      width: 100%;
      overflow-wrap: anywhere;
    }
  }
</style>
