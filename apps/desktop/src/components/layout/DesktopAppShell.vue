<script setup lang="ts">
import { computed } from 'vue'
import DesktopDocReader from '@/components/docs/DesktopDocReader.vue'
import DesktopDocsSidebar from '@/components/docs/DesktopDocsSidebar.vue'
import DesktopDocToc from '@/components/docs/DesktopDocToc.vue'
import DesktopSearchPanel from '@/components/docs/DesktopSearchPanel.vue'
import { useDesktopActiveHeadings } from '@/composables/useDesktopActiveHeadings'
import { useDesktopDocsBrowser } from '@/composables/useDesktopDocsBrowser'
import { useDesktopDocsSearch } from '@/composables/useDesktopDocsSearch'
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar.vue'
import { useWorkspaceSelection } from '@/composables/useWorkspaceSelection'
import type { DocsSourceGroup } from '@/types/docs'

const { currentWorkspace, currentWorkspaceId, selectWorkspace, workspaces } = useWorkspaceSelection()
const {
  currentDoc,
  currentSectionId,
  currentSourceId,
  headings,
  nextDoc,
  prevDoc,
  selectDoc,
  selectFirstDoc,
  selectedDocSlug,
  sourceGroups,
} = useDesktopDocsBrowser()
const {
  activeResult,
  close: closeSearch,
  isOpen,
  moveSelection,
  open: openSearch,
  query,
  results,
  selectedIndex,
  setQuery,
} = useDesktopDocsSearch()
const { activeId, scrollToHeading } = useDesktopActiveHeadings(headings)

const sourceCount = computed(() => currentWorkspace.value?.sources.length ?? 0)
const workspaceLabel = computed(() => currentWorkspace.value?.name ?? '未选择工作环境')
const totalDocsCount = computed(() => sourceGroups.reduce((count, group) => count + countDocs(group), 0))
const currentDocPathLabel = computed(() => {
  if (!currentDoc.value) {
    return '选择一篇文档开始阅读'
  }

  return currentDoc.value.sectionTitle
    ? `${currentDoc.value.sourceLabel} / ${currentDoc.value.sectionTitle}`
    : currentDoc.value.sourceLabel
})
const searchQuery = computed({
  get: () => query.value,
  set: (value: string) => {
    setQuery(value)
  },
})

function handleSelectWorkspace(workspaceId: string) {
  selectWorkspace(workspaceId)
  selectFirstDoc()
}

function handleSelectDoc(slug: string) {
  selectDoc(slug)
}

function handleSubmitSearch(slug?: string) {
  const targetSlug = slug || activeResult.value?.slug
  if (!targetSlug) {
    return
  }

  selectDoc(targetSlug)
  closeSearch()
}

function countDocs(group: DocsSourceGroup): number {
  const sectionDocs = group.sections.reduce((count, section) => count + section.docs.length, 0)
  const childDocs = group.children.reduce((count, child) => count + countDocs(child), 0)
  return group.rootDocs.length + sectionDocs + childDocs
}
</script>

<template>
  <div class="desktop-app-shell">
    <aside class="desktop-app-shell__workspace">
      <WorkspaceSidebar
        :current-workspace-id="currentWorkspaceId"
        :workspaces="workspaces"
        @select-workspace="handleSelectWorkspace"
      />
    </aside>

    <section class="desktop-app-shell__catalog">
      <DesktopDocsSidebar
        :current-doc-slug="selectedDocSlug || null"
        :current-section-id="currentSectionId"
        :current-source-id="currentSourceId"
        :source-groups="sourceGroups"
        @select-doc="handleSelectDoc"
      />
    </section>

    <main class="desktop-app-shell__content">
      <header class="desktop-app-shell__topbar">
        <div class="desktop-app-shell__topbar-copy">
          <p class="desktop-app-shell__eyebrow">Docs Atlas Desktop</p>
          <h1 class="desktop-app-shell__title">{{ workspaceLabel }}</h1>
          <p class="desktop-app-shell__subtitle">{{ currentDocPathLabel }}</p>
        </div>

        <div class="desktop-app-shell__topbar-meta">
          <span class="desktop-app-shell__chip">{{ workspaces.length }} 个工作区</span>
          <span class="desktop-app-shell__chip">{{ sourceCount }} 个来源</span>
          <span class="desktop-app-shell__chip">{{ totalDocsCount }} 篇文档</span>
        </div>
      </header>

      <DesktopDocReader
        :doc="currentDoc"
        :highlight-query="query"
        :next-doc="nextDoc"
        :prev-doc="prevDoc"
        @select-doc="handleSelectDoc"
      />
    </main>

    <aside class="desktop-app-shell__context">
      <section class="desktop-app-shell__search-card">
        <div class="desktop-app-shell__panel-heading">
          <p class="desktop-app-shell__panel-eyebrow">Search</p>
          <h2 class="desktop-app-shell__panel-title">快速检索</h2>
        </div>

        <DesktopSearchPanel
          v-model="searchQuery"
          class="desktop-app-shell__toolbar-search"
          :is-open="isOpen"
          :results="results"
          :selected-index="selectedIndex"
          @close="closeSearch"
          @move-selection="moveSelection"
          @open="openSearch"
          @submit="handleSubmitSearch"
        />
      </section>

      <section class="desktop-app-shell__meta-card">
        <div class="desktop-app-shell__panel-heading">
          <p class="desktop-app-shell__panel-eyebrow">Context</p>
          <h2 class="desktop-app-shell__panel-title">当前文档</h2>
        </div>
        <dl class="desktop-app-shell__facts">
          <div class="desktop-app-shell__fact">
            <dt>标题</dt>
            <dd>{{ currentDoc?.title ?? '未选择' }}</dd>
          </div>
          <div class="desktop-app-shell__fact">
            <dt>来源</dt>
            <dd>{{ currentDoc?.sourceLabel ?? '未选择' }}</dd>
          </div>
          <div class="desktop-app-shell__fact">
            <dt>章节</dt>
            <dd>{{ currentDoc?.sectionTitle ?? '根目录文档' }}</dd>
          </div>
          <div class="desktop-app-shell__fact">
            <dt>大纲</dt>
            <dd>{{ headings.length }} 个标题</dd>
          </div>
        </dl>
      </section>

      <div class="desktop-app-shell__toc-card">
        <DesktopDocToc
          :active-id="activeId"
          :headings="headings"
          @select="scrollToHeading"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.desktop-app-shell {
  display: grid;
  grid-template-columns: 88px 310px minmax(0, 1fr) 296px;
  gap: 0.8rem;
  height: 100vh;
  padding: 0.8rem;
  align-items: start;
  overflow: hidden;
}

.desktop-app-shell__workspace,
.desktop-app-shell__catalog,
.desktop-app-shell__topbar,
.desktop-app-shell__search-card,
.desktop-app-shell__meta-card,
.desktop-app-shell__toc-card {
  border: 1px solid var(--desktop-line);
  background: var(--desktop-surface);
  box-shadow: var(--shadow-panel);
}

.desktop-app-shell__workspace,
.desktop-app-shell__catalog,
.desktop-app-shell__content,
.desktop-app-shell__context {
  min-height: calc(100vh - 1.6rem);
}

.desktop-app-shell__workspace,
.desktop-app-shell__catalog {
  border-radius: var(--desktop-radius-lg);
  overflow: hidden;
}

.desktop-app-shell__content,
.desktop-app-shell__context {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
  min-height: 0;
}

.desktop-app-shell__content {
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.desktop-app-shell__context {
  grid-template-rows: auto auto minmax(0, 1fr);
  overflow: hidden;
}

.desktop-app-shell__topbar,
.desktop-app-shell__search-card,
.desktop-app-shell__meta-card,
.desktop-app-shell__toc-card {
  border-radius: var(--desktop-radius-lg);
}

.desktop-app-shell__topbar {
  display: flex;
  justify-content: space-between;
  gap: 1.2rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
}

.desktop-app-shell__topbar-copy {
  display: grid;
  gap: 0.24rem;
  min-width: 0;
}

.desktop-app-shell__eyebrow {
  margin: 0 0 0.05rem;
  color: var(--desktop-accent);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-app-shell__title {
  margin: 0;
  font-size: 1.38rem;
  line-height: 1.15;
  font-weight: 650;
}

.desktop-app-shell__subtitle {
  margin: 0;
  color: var(--desktop-muted);
  font-size: 0.86rem;
  line-height: 1.5;
}

.desktop-app-shell__topbar-meta {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.desktop-app-shell__chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0.28rem 0.68rem;
  border: 1px solid var(--desktop-line);
  border-radius: 999px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-soft);
  font-size: 0.78rem;
}

.desktop-app-shell__panel-heading {
  display: grid;
  gap: 0.15rem;
  padding: 0.95rem 1rem 0;
}

.desktop-app-shell__panel-eyebrow {
  margin: 0;
  color: var(--desktop-soft);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.desktop-app-shell__panel-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
}

.desktop-app-shell__search-card {
  display: grid;
  gap: 0.7rem;
  padding-bottom: 0.95rem;
}

.desktop-app-shell__toolbar-search {
  min-width: 0;
  padding-inline: 1rem;
}

.desktop-app-shell__meta-card {
  display: grid;
  gap: 0.8rem;
  padding-bottom: 0.95rem;
}

.desktop-app-shell__facts {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0 1rem;
}

.desktop-app-shell__fact {
  display: grid;
  gap: 0.16rem;
  padding: 0.72rem 0.78rem;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-md);
  background: var(--desktop-surface-strong);
}

.desktop-app-shell__fact dt {
  color: var(--desktop-soft);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.desktop-app-shell__fact dd {
  margin: 0;
  color: var(--desktop-ink);
  font-size: 0.86rem;
  line-height: 1.45;
  word-break: break-word;
}

.desktop-app-shell__toc-card {
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1480px) {
  .desktop-app-shell {
    grid-template-columns: 88px 280px minmax(0, 1fr) 272px;
  }
}

@media (max-width: 1260px) {
  .desktop-app-shell {
    grid-template-columns: 88px 280px minmax(0, 1fr);
  }

  .desktop-app-shell__context {
    grid-column: 2 / span 2;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-height: auto;
  }
}

@media (max-width: 1040px) {
  .desktop-app-shell {
    grid-template-columns: 1fr;
  }

  .desktop-app-shell__workspace,
  .desktop-app-shell__catalog,
  .desktop-app-shell__content,
  .desktop-app-shell__context {
    min-height: auto;
  }

  .desktop-app-shell__context {
    grid-column: auto;
    grid-template-columns: 1fr;
  }

  .desktop-app-shell__topbar {
    display: grid;
  }
}
</style>
