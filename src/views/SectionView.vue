<script setup lang="ts">
import { computed } from 'vue'
import { useDocRoute } from '@/composables/useDocRoute'
import { useDocsContent } from '@/composables/useDocsContent'

const { currentSection } = useDocRoute()
const { docDetails } = useDocsContent()

const sectionIndexDoc = computed(() => {
  if (!currentSection.value) {
    return null
  }

  const indexDoc = currentSection.value.docs.find((doc) => doc.isSectionIndex)
  return indexDoc ? docDetails[indexDoc.slug] ?? null : null
})

const sectionDocs = computed(() => {
  if (!currentSection.value) {
    return []
  }

  return currentSection.value.docs.filter((doc) => !doc.isSectionIndex)
})
</script>

<template>
  <section
    v-if="currentSection"
    class="section-view"
  >
    <header class="section-view__hero">
      <div class="section-view__hero-copy">
        <p class="section-view__eyebrow">
          {{ currentSection.sourceLabel }} / README
        </p>
        <h1 class="section-view__title">
          {{ currentSection.title }}
        </h1>
        <p class="section-view__summary">
          {{ sectionIndexDoc?.summary ?? '这个专题已经建立索引，正在等待更多说明内容。' }}
        </p>
      </div>

      <div class="section-view__stats">
        <div class="section-view__stat-card">
          <span class="section-view__stat-label">教程数量</span>
          <strong class="section-view__stat-value">{{ sectionDocs.length }}</strong>
        </div>
        <div class="section-view__stat-card">
          <span class="section-view__stat-label">入口文件</span>
          <strong class="section-view__stat-value">README.md</strong>
        </div>
      </div>
    </header>

    <article class="section-view__guide">
      <div class="section-view__guide-head">
        <p class="panel-heading__eyebrow">
          Section Guide
        </p>
      </div>

      <div
        v-if="sectionIndexDoc?.html"
        class="section-view__intro prose"
        v-html="sectionIndexDoc.html"
      />
      <p
        v-else
        class="section-view__intro-fallback"
      >
        当前专题暂无 README 内容。
      </p>
    </article>

    <section class="section-view__list">
      <div class="section-view__list-head">
        <div class="panel-heading">
          <p class="panel-heading__eyebrow">
            {{ currentSection.sourceLabel }}
          </p>
          <h2 class="panel-heading__title">
            子目录教程
          </h2>
        </div>
        <p class="section-view__list-caption">
          点击一级目录进入导读页，下面这些条目才是具体教程。
        </p>
      </div>

      <div class="section-view__cards">
        <RouterLink
          v-for="(doc, index) in sectionDocs"
          :key="doc.slug"
          class="section-view__card"
          :to="doc.routePath"
        >
          <span class="section-view__card-order">{{ index + 1 }}</span>
          <strong class="section-view__card-title">{{ doc.title }}</strong>
          <span class="section-view__card-summary">{{ doc.summary }}</span>
        </RouterLink>
      </div>
    </section>
  </section>

  <section
    v-else
    class="empty-state"
  >
    <h1>未找到该分类</h1>
    <p>请从左侧目录或首页重新选择一个专题。</p>
  </section>
</template>

<style scoped>
.section-view {
  display: grid;
  gap: 1.35rem;
}

.section-view__hero,
.section-view__guide,
.section-view__list,
.empty-state {
  padding: 1.6rem;
  border: 1px solid var(--color-line);
  border-radius: 32px;
  background: var(--surface-panel-alt);
  box-shadow: var(--shadow-panel);
}

.section-view__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
  gap: 0.85rem;
  align-items: stretch;
  padding: 1.2rem 1.3rem;
  border-radius: 22px;
  box-shadow: 0 10px 24px rgba(var(--theme-shadow-rgb), 0.08);
}

.section-view__eyebrow,
.panel-heading__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-soft);
}

.section-view__title,
.panel-heading__title,
.empty-state > h1 {
  margin: 0;
  font-family: var(--font-display);
}

.section-view__title {
  font-size: clamp(1.72rem, 3.2vw, 2.4rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.section-view__summary,
.empty-state > p {
  margin: 0.58rem 0 0;
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.62;
}

.section-view__hero-copy {
  display: grid;
  align-content: start;
}

.section-view__stats {
  display: grid;
  gap: 0.65rem;
}

.section-view__stat-card {
  display: grid;
  gap: 0.22rem;
  align-content: center;
  min-height: 94px;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--color-line);
  border-radius: 16px;
  background: var(--surface-contrast);
  color: var(--text-on-contrast);
}

.section-view__stat-label {
  color: var(--text-on-contrast-soft);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-view__stat-value {
  font-family: var(--font-display);
  font-size: 1.25rem;
}

.section-view__guide {
  display: grid;
  gap: 1.1rem;
}

.section-view__guide-head {
  display: grid;
  gap: 0.3rem;
}

.section-view__intro-fallback {
  margin: 0;
  color: var(--color-muted);
}

.section-view__list {
  display: grid;
  gap: 1rem;
}

.section-view__list-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  flex-wrap: wrap;
}

.section-view__list-caption {
  margin: 0;
  max-width: 30rem;
  color: var(--color-soft);
  line-height: 1.55;
}

.section-view__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.section-view__card {
  display: grid;
  gap: 0.42rem;
  min-height: 190px;
  align-content: start;
  padding: 1.15rem;
  border: 1px solid var(--color-line);
  border-radius: 26px;
  background: var(--surface-card);
  color: var(--color-ink);
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.section-view__card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--color-accent-rgb), 0.34);
  background: var(--surface-card-hover);
  box-shadow: var(--shadow-panel);
}

.section-view__card-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(var(--color-accent-rgb), 0.14);
  color: var(--color-accent-deep);
  font-size: 0.82rem;
  font-weight: 700;
}

.section-view__card-title {
  font-size: 1.05rem;
}

.section-view__card-summary {
  color: var(--color-muted);
  line-height: 1.6;
}

@media (max-width: 980px) {
  .section-view__hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .section-view__guide,
  .section-view__list,
  .empty-state {
    padding: 1.2rem;
    border-radius: 24px;
  }

  .section-view__hero {
    padding: 1rem 1.05rem;
    border-radius: 18px;
  }

  .section-view__title {
    font-size: clamp(1.55rem, 6vw, 2rem);
  }

  .section-view__stat-card {
    min-height: 86px;
    padding: 0.82rem 0.88rem;
  }

  .section-view__cards {
    grid-template-columns: 1fr;
  }

  .section-view__card {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .section-view {
    gap: 1rem;
  }

  .section-view__guide,
  .section-view__list,
  .empty-state {
    padding: 1rem;
    border-radius: 22px;
  }

  .section-view__hero {
    gap: 0.72rem;
    padding: 0.92rem;
    border-radius: 16px;
  }

  .section-view__summary {
    font-size: 0.92rem;
  }

  .section-view__list-head {
    align-items: start;
  }

  .section-view__list-caption {
    max-width: none;
  }
}
</style>
