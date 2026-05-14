<script setup lang="ts">
import type { DocDetail } from '@/types/docs'

defineProps<{
  doc: DocDetail
}>()
</script>

<template>
  <article class="doc-content">
    <header class="doc-content__header">
      <div class="doc-content__header-top">
        <p class="doc-content__section">
          {{ doc.sectionTitle ?? doc.sourceName }}
        </p>
        <code class="doc-content__source">{{ doc.sourcePath }}</code>
      </div>
      <h1 class="doc-content__title">
        {{ doc.title }}
      </h1>
    </header>

    <div class="doc-content__body-shell">
      <div class="doc-content__body prose" v-html="doc.html" />
    </div>
  </article>
</template>

<style scoped>
  .doc-content {
    display: grid;
    gap: 1.2rem;
  }

  .doc-content__header {
    display: grid;
    gap: 0.8rem;
    padding: 1.85rem;
    border: 1px solid var(--color-line);
    border-radius: 34px;
    background: var(--surface-panel-alt);
    box-shadow: var(--shadow-panel);
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
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: rgba(var(--color-accent-rgb), 0.12);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent-deep);
    font-size: 0.8rem;
  }

  .doc-content__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 4vw, 3.25rem);
    line-height: 1.05;
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
    max-width: min(100%, 76ch);
    margin-inline: auto;
  }

  .doc-content__body-shell {
    min-width: 0;
    padding: clamp(1rem, 2vw, 1.85rem) clamp(1rem, 2.5vw, 2.2rem);
    border: 1px solid var(--color-line);
    border-radius: 32px;
    background: var(--surface-markdown);
    box-shadow: var(--shadow-panel);
  }

  .doc-content__source {
    color: var(--color-soft);
    font-size: 0.84rem;
  }

  @media (max-width: 960px) {
    .doc-content__header {
      padding: 1.25rem;
      border-radius: 24px;
    }

    .doc-content__title {
      font-size: clamp(1.9rem, 8vw, 2.8rem);
    }
  }

  @media (max-width: 640px) {
    .doc-content__header {
      padding: 1rem;
      border-radius: 22px;
    }

    .doc-content__body-shell {
      padding: 0.95rem;
      border-radius: 22px;
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
