<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { DocsSourceGroup } from '@/types/docs'

const props = defineProps<{
  currentDocSlug: string | null
  currentSectionId: string | null
  currentSourceId: string | null
  isOpen: boolean
  sourceGroups: DocsSourceGroup[]
}>()

const emit = defineEmits<{
  close: []
}>()

const openSourceId = shallowRef<string | null>(null)
const openSectionId = shallowRef<string | null>(null)

const navigationGroups = computed(() =>
  props.sourceGroups.map((sourceGroup) => ({
    ...sourceGroup,
    sections: sourceGroup.sections.map((section) => ({
      ...section,
      tutorials: section.docs.filter((doc) => !doc.isSectionIndex),
    })),
  })),
)

function toggleSource(sourceId: string) {
  if (openSourceId.value === sourceId) {
    openSourceId.value = null
    openSectionId.value = null
    return
  }

  openSourceId.value = sourceId
  openSectionId.value = null
}

function toggleSection(sourceId: string, sectionId: string) {
  if (openSourceId.value !== sourceId) {
    openSourceId.value = sourceId
  }

  openSectionId.value = openSectionId.value === sectionId ? null : sectionId
}

function getSourceToggleLabel(sourceName: string, isOpen: boolean) {
  return isOpen ? `收起 ${sourceName} 模块` : `展开 ${sourceName} 模块`
}

function getSectionToggleLabel(sectionTitle: string, isOpen: boolean) {
  return isOpen ? `收起 ${sectionTitle} 目录` : `展开 ${sectionTitle} 目录`
}
</script>

<template>
  <aside :class="['docs-sidebar', { 'docs-sidebar--open': isOpen }]">
    <div class="docs-sidebar__inner">
      <div class="docs-sidebar__heading">
        <p class="docs-sidebar__eyebrow">
          Navigation
        </p>
        <h2 class="docs-sidebar__title">
          目录
        </h2>
      </div>

      <nav class="docs-sidebar__nav">
        <section
          v-for="sourceGroup in navigationGroups"
          :key="sourceGroup.id"
          class="docs-sidebar__source"
        >
          <button
            :aria-expanded="openSourceId === sourceGroup.id"
            :aria-label="getSourceToggleLabel(sourceGroup.name, openSourceId === sourceGroup.id)"
            :class="[
              'docs-sidebar__source-toggle',
              {
                'docs-sidebar__source-toggle--active':
                  currentSourceId === sourceGroup.id || openSourceId === sourceGroup.id,
              },
            ]"
            type="button"
            @click="toggleSource(sourceGroup.id)"
          >
            <span class="docs-sidebar__source-name">{{ sourceGroup.name }}</span>
            <span
              :class="[
                'docs-sidebar__source-toggle-icon',
                { 'docs-sidebar__source-toggle-icon--open': openSourceId === sourceGroup.id },
              ]"
            />
          </button>

          <div
            v-if="openSourceId === sourceGroup.id"
            class="docs-sidebar__source-body"
          >
            <RouterLink
              v-for="doc in sourceGroup.rootDocs"
              :key="doc.slug"
              :class="[
                'docs-sidebar__doc-link',
                { 'docs-sidebar__doc-link--active': doc.slug === currentDocSlug },
              ]"
              :to="doc.routePath"
              @click="emit('close')"
            >
              <span class="docs-sidebar__doc-title">{{ doc.title }}</span>
            </RouterLink>

            <section
              v-for="section in sourceGroup.sections"
              :key="section.id"
              class="docs-sidebar__section"
            >
              <div
                :class="[
                  'docs-sidebar__section-link',
                  {
                    'docs-sidebar__section-link--active':
                      section.id === currentSectionId || openSectionId === section.id,
                  },
                ]"
              >
                <RouterLink
                  class="docs-sidebar__section-title-link"
                  :to="section.routePath"
                  @click="emit('close')"
                >
                  <strong class="docs-sidebar__section-name">{{ section.title }}</strong>
                </RouterLink>

                <button
                  v-if="section.tutorials.length > 0"
                  :aria-label="getSectionToggleLabel(section.title, openSectionId === section.id)"
                  class="docs-sidebar__section-toggle"
                  type="button"
                  @click="toggleSection(sourceGroup.id, section.id)"
                >
                  <span
                    :class="[
                      'docs-sidebar__section-toggle-icon',
                      { 'docs-sidebar__section-toggle-icon--open': openSectionId === section.id },
                    ]"
                  />
                </button>
              </div>

              <div
                v-if="openSectionId === section.id && section.tutorials.length > 0"
                class="docs-sidebar__docs"
              >
                <RouterLink
                  v-for="doc in section.tutorials"
                  :key="doc.slug"
                  :class="[
                    'docs-sidebar__doc-link',
                    { 'docs-sidebar__doc-link--active': doc.slug === currentDocSlug },
                  ]"
                  :to="doc.routePath"
                  @click="emit('close')"
                >
                  <span class="docs-sidebar__doc-title">{{ doc.title }}</span>
                </RouterLink>
              </div>
            </section>
          </div>
        </section>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
.docs-sidebar {
  position: sticky;
  top: 98px;
  height: calc(100vh - 98px);
  padding: 0.5rem 0 1.5rem 1rem;
}

.docs-sidebar__inner {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid var(--color-line);
  border-radius: 32px;
  background: var(--surface-panel);
  box-shadow: var(--shadow-panel);
}

.docs-sidebar__heading {
  margin-bottom: 1.25rem;
  padding: 0.35rem 0.35rem 0.75rem;
  border-bottom: 1px solid var(--color-line);
}

.docs-sidebar__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-soft);
}

.docs-sidebar__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
}

.docs-sidebar__nav,
.docs-sidebar__source-body {
  display: grid;
}

.docs-sidebar__nav {
  gap: 1rem;
}

.docs-sidebar__source,
.docs-sidebar__section {
  display: grid;
  gap: 0.65rem;
}

.docs-sidebar__source-body {
  gap: 0.45rem;
  padding: 0.2rem 0 0 0.4rem;
  animation: sidebarReveal 0.18s ease;
}

.docs-sidebar__source-toggle,
.docs-sidebar__section-link,
.docs-sidebar__doc-link {
  text-decoration: none;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.docs-sidebar__source-toggle,
.docs-sidebar__section-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--color-line);
  color: var(--color-ink);
}

.docs-sidebar__source-toggle {
  padding: 0.75rem 0.95rem;
  border-radius: 22px;
  background: var(--surface-contrast);
  color: var(--text-on-contrast);
  cursor: pointer;
}

.docs-sidebar__source-toggle:hover,
.docs-sidebar__source-toggle--active {
  border-color: rgba(var(--color-accent-rgb), 0.42);
  box-shadow: var(--shadow-emphasis);
}

.docs-sidebar__source-name {
  font-size: 1rem;
  font-weight: 700;
  text-align: left;
}

.docs-sidebar__section-link {
  min-height: 46px;
  padding: 0.55rem 0.65rem 0.55rem 1rem;
  border-radius: 18px;
  background: var(--surface-card-strong);
}

.docs-sidebar__section-link:hover,
.docs-sidebar__section-link--active {
  border-color: rgba(var(--color-accent-rgb), 0.34);
  background: rgba(var(--color-accent-rgb), 0.1);
  transform: translateY(-1px);
}

.docs-sidebar__section-name {
  font-size: 0.97rem;
  line-height: 1.2;
  font-weight: 700;
}

.docs-sidebar__section-title-link {
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.docs-sidebar__source-toggle-icon,
.docs-sidebar__section-toggle-icon {
  width: 0.65rem;
  height: 0.65rem;
  display: inline-block;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
  transition: transform 0.18s ease;
}

.docs-sidebar__source-toggle-icon--open,
.docs-sidebar__section-toggle-icon--open {
  transform: rotate(225deg) translateY(-1px);
}

.docs-sidebar__section-toggle {
  width: 2rem;
  height: 2rem;
  flex: none;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--color-accent-rgb), 0.08);
  color: var(--color-ink);
  cursor: pointer;
}

.docs-sidebar__docs {
  display: grid;
  gap: 0.35rem;
  padding-left: 0.45rem;
  animation: sidebarReveal 0.18s ease;
}

.docs-sidebar__doc-link {
  display: block;
  min-height: 44px;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  color: var(--color-ink);
  background: transparent;
}

.docs-sidebar__doc-link:hover,
.docs-sidebar__doc-link--active {
  background: rgba(var(--color-accent-rgb), 0.1);
  transform: translateX(2px);
}

.docs-sidebar__doc-title {
  color: var(--color-ink);
  font-size: 0.93rem;
}

@keyframes sidebarReveal {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .docs-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(92vw, 360px);
    height: auto;
    padding: 0.65rem;
    transform: translateX(-110%);
    transition: transform 0.2s ease;
    z-index: 50;
  }

  .docs-sidebar--open {
    transform: translateX(0);
  }

  .docs-sidebar__inner {
    padding: 0.85rem;
    border-radius: 24px;
  }

  .docs-sidebar__heading {
    margin-bottom: 1rem;
    padding-bottom: 0.65rem;
  }
}

@media (max-width: 640px) {
  .docs-sidebar {
    width: calc(100vw - 0.7rem);
    padding: 0.35rem;
  }

  .docs-sidebar__source-toggle {
    padding-inline: 0.8rem;
  }

  .docs-sidebar__section-link {
    padding: 0.5rem 0.55rem 0.5rem 0.8rem;
  }

  .docs-sidebar__doc-link {
    padding-inline: 0.8rem;
  }
}
</style>
