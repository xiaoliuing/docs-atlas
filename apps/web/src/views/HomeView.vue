<script setup lang="ts">
import { computed } from 'vue'
import { useDocsCatalog } from '@/composables/useDocsCatalog'

const { docs, sections } = useDocsCatalog()

const tutorialCount = computed(() =>
  docs.filter((doc) => !doc.isSectionIndex).length,
)

const sectionCards = computed(() =>
  sections.map((section) => ({
    id: section.id,
    routePath: section.routePath,
    sourceLabel: section.sourceLabel,
    title: section.title,
    count: section.docs.filter((doc) => !doc.isSectionIndex).length,
    intro: section.docs[0]?.summary ?? '该专题下暂时还没有摘要内容。',
  })),
)

const recentDocs = computed(() =>
  docs
    .filter((doc) => !doc.isSectionIndex)
    .slice(-6)
    .reverse(),
)
</script>

<template>
  <section class="home-view">
    <header class="hero-card">
      <p class="hero-card__eyebrow">
        Docs From Local Markdown
      </p>
      <h1 class="hero-card__title">
        给本地教程内容一套更像出版物的阅读界面。
      </h1>
      <p class="hero-card__body">
        `Docs Atlas` 直接消费本地 Markdown 文档目录，把一级目录视作 README 导读页，把二级条目整理为按顺序阅读的教程卡片。
      </p>
      <div class="hero-card__stats">
        <span class="hero-card__stat">{{ sections.length }} 个专题</span>
        <span class="hero-card__stat">{{ tutorialCount }} 篇教程</span>
        <span class="hero-card__stat">README 导读 + 子教程结构</span>
      </div>
      <div class="hero-card__actions">
        <RouterLink
          class="hero-card__primary"
          :to="sectionCards[0]?.routePath ?? '/'"
        >
          开始浏览
        </RouterLink>
        <span class="hero-card__meta">优先阅读专题 README，再进入具体教程。</span>
      </div>
    </header>

    <section class="home-grid">
      <article class="home-panel">
        <div class="panel-heading">
          <p class="panel-heading__eyebrow">
            Sections
          </p>
          <h2 class="panel-heading__title">
            分类浏览
          </h2>
        </div>

        <div class="section-grid">
          <RouterLink
            v-for="section in sectionCards"
            :key="section.id"
            class="section-card"
            :to="section.routePath"
          >
            <span class="section-card__source">{{ section.sourceLabel }}</span>
            <span class="section-card__count">{{ section.count }} 篇教程</span>
            <strong class="section-card__title">{{ section.title }}</strong>
            <span class="section-card__intro">{{ section.intro }}</span>
          </RouterLink>
        </div>
      </article>

      <article class="home-panel">
        <div class="panel-heading">
          <p class="panel-heading__eyebrow">
            Recently Indexed
          </p>
          <h2 class="panel-heading__title">
            最近可读
          </h2>
        </div>

        <div class="recent-list">
          <RouterLink
            v-for="doc in recentDocs"
            :key="doc.slug"
            class="recent-list__item"
            :to="doc.routePath"
          >
            <span class="recent-list__section">{{ doc.sectionTitle ? `${doc.sourceLabel} / ${doc.sectionTitle}` : doc.sourceLabel }}</span>
            <strong>{{ doc.title }}</strong>
            <span class="recent-list__summary">{{ doc.summary }}</span>
          </RouterLink>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 1.35rem;
}

.hero-card,
.home-panel {
  padding: 1.6rem;
  border: 1px solid var(--color-line);
  border-radius: 34px;
  background: var(--surface-panel-alt);
  box-shadow: var(--shadow-panel);
}

.hero-card {
  display: grid;
  gap: 1rem;
  padding: 2rem;
}

.hero-card__eyebrow,
.panel-heading__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-soft);
}

.hero-card__title,
.panel-heading__title {
  margin: 0;
  font-family: var(--font-display);
}

.hero-card__title {
  font-size: clamp(2.6rem, 5vw, 4.9rem);
  line-height: 0.98;
  max-width: 15ch;
}

.hero-card__body {
  margin: 0;
  max-width: 52rem;
  color: var(--color-muted);
  font-size: 1.08rem;
  line-height: 1.72;
}

.hero-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.hero-card__stat {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0.42rem 0.8rem;
  border-radius: 999px;
  background: var(--surface-chip);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
}

.hero-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.hero-card__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0.85rem 1.2rem;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--text-on-contrast);
  text-decoration: none;
  box-shadow: var(--shadow-emphasis);
}

.hero-card__meta {
  color: var(--color-soft);
}

.home-grid {
  display: grid;
  gap: 1.5rem;
}

.panel-heading {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.section-card,
.recent-list__item {
  display: grid;
  gap: 0.45rem;
  min-height: 180px;
  align-content: start;
  padding: 1.05rem;
  border: 1px solid var(--color-line);
  border-radius: 24px;
  text-decoration: none;
  color: var(--color-ink);
  background: var(--surface-card);
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.section-card__source,
.recent-list__section {
  color: var(--color-soft);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-card:hover,
.recent-list__item:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--color-accent-rgb), 0.28);
  background: var(--surface-card-hover);
  box-shadow: var(--shadow-panel);
}

.section-card__count {
  color: var(--color-soft);
  font-size: 0.84rem;
}

.section-card__intro,
.recent-list__summary {
  color: var(--color-muted);
}

.recent-list {
  display: grid;
  gap: 0.9rem;
}

@media (max-width: 960px) {
  .hero-card,
  .home-panel {
    padding: 1.25rem;
    border-radius: 26px;
  }

  .hero-card {
    gap: 0.85rem;
  }

  .hero-card__title {
    max-width: 100%;
    font-size: clamp(2rem, 10vw, 3.4rem);
  }

  .hero-card__body {
    font-size: 1rem;
  }

  .section-card,
  .recent-list__item {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .home-view {
    gap: 1rem;
  }

  .hero-card,
  .home-panel {
    padding: 1rem;
    border-radius: 22px;
  }

  .hero-card__stats,
  .hero-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-card__primary {
    width: 100%;
  }

  .section-grid {
    grid-template-columns: 1fr;
  }
}
</style>
