<script setup lang="ts">
import { computed } from 'vue'
import type { DocsSourceGroup } from '@/types/docs'

const props = defineProps<{
  currentDocSlug: string | null
  currentSectionId: string | null
  currentSourceId: string | null
  depth: number
  node: DocsSourceGroup
  openBranchIds: string[]
  openSectionId: string | null
}>()

const emit = defineEmits<{
  close: []
  toggleNode: [id: string, depth: number]
  toggleSection: [sectionId: string]
}>()

const isOpen = computed(() => props.openBranchIds[props.depth] === props.node.id)
const isSourceActive = computed(() => props.node.sourceId !== null && props.node.sourceId === props.currentSourceId)
const sectionItems = computed(() =>
  props.node.sections.map((section) => ({
    ...section,
    tutorials: section.docs.filter((doc) => !doc.isSectionIndex),
  })),
)

function toggleNode() {
  emit('toggleNode', props.node.id, props.depth)
}

function toggleSection(sectionId: string) {
  emit('toggleSection', sectionId)
}

function forwardToggleNode(id: string, depth: number) {
  emit('toggleNode', id, depth)
}

function forwardToggleSection(sectionId: string) {
  emit('toggleSection', sectionId)
}

function getNodeToggleLabel(name: string, expanded: boolean) {
  return expanded ? `收起 ${name}` : `展开 ${name}`
}

function getSectionToggleLabel(title: string, expanded: boolean) {
  return expanded ? `收起 ${title} 目录` : `展开 ${title} 目录`
}
</script>

<template>
  <section
    :class="[
      'docs-sidebar-node',
      {
        'docs-sidebar-node--group': !node.isSource,
        'docs-sidebar-node--source': node.isSource,
      },
    ]"
    :style="{ '--sidebar-depth': depth }"
  >
    <button
      :aria-expanded="isOpen"
      :aria-label="getNodeToggleLabel(node.name, isOpen)"
      :class="[
        'docs-sidebar-node__toggle',
        {
          'docs-sidebar-node__toggle--active': isOpen || isSourceActive,
          'docs-sidebar-node__toggle--group': !node.isSource,
          'docs-sidebar-node__toggle--source': node.isSource,
        },
      ]"
      type="button"
      @click="toggleNode"
    >
      <span class="docs-sidebar-node__name">{{ node.name }}</span>
      <span
        :class="[
          'docs-sidebar-node__toggle-icon',
          { 'docs-sidebar-node__toggle-icon--open': isOpen },
        ]"
      />
    </button>

    <div
      v-if="isOpen"
      class="docs-sidebar-node__body"
    >
      <template v-if="node.isSource">
        <section
          v-for="section in sectionItems"
          :key="section.id"
          class="docs-sidebar-node__section"
        >
          <div
            :class="[
              'docs-sidebar-node__section-link',
              {
                'docs-sidebar-node__section-link--active':
                  currentSectionId === section.id || openSectionId === section.id,
              },
            ]"
          >
            <RouterLink
              class="docs-sidebar-node__section-title-link"
              :to="section.routePath"
              @click="emit('close')"
            >
              <strong class="docs-sidebar-node__section-name">{{ section.title }}</strong>
            </RouterLink>

            <button
              v-if="section.tutorials.length > 0"
              :aria-label="getSectionToggleLabel(section.title, openSectionId === section.id)"
              class="docs-sidebar-node__section-toggle"
              type="button"
              @click="toggleSection(section.id)"
            >
              <span
                :class="[
                  'docs-sidebar-node__section-toggle-icon',
                  { 'docs-sidebar-node__section-toggle-icon--open': openSectionId === section.id },
                ]"
              />
            </button>
          </div>

          <div
            v-if="openSectionId === section.id && section.tutorials.length > 0"
            class="docs-sidebar-node__docs"
          >
            <RouterLink
              v-for="doc in section.tutorials"
              :key="doc.slug"
              :class="[
                'docs-sidebar-node__doc-link',
                { 'docs-sidebar-node__doc-link--active': doc.slug === currentDocSlug },
              ]"
              :to="doc.routePath"
              @click="emit('close')"
            >
              <span class="docs-sidebar-node__doc-title">{{ doc.title }}</span>
            </RouterLink>
          </div>
        </section>

        <div
          v-if="node.rootDocs.length > 0"
          class="docs-sidebar-node__docs docs-sidebar-node__docs--root"
        >
          <RouterLink
            v-for="doc in node.rootDocs"
            :key="doc.slug"
            :class="[
              'docs-sidebar-node__doc-link',
              { 'docs-sidebar-node__doc-link--active': doc.slug === currentDocSlug },
            ]"
            :to="doc.routePath"
            @click="emit('close')"
          >
            <span class="docs-sidebar-node__doc-title">{{ doc.title }}</span>
          </RouterLink>
        </div>
      </template>

      <template v-else>
        <DocsSidebarNode
          v-for="child in node.children"
          :key="child.id"
          :current-doc-slug="currentDocSlug"
          :current-section-id="currentSectionId"
          :current-source-id="currentSourceId"
          :depth="depth + 1"
          :node="child"
          :open-branch-ids="openBranchIds"
          :open-section-id="openSectionId"
          @close="emit('close')"
          @toggle-node="forwardToggleNode"
          @toggle-section="forwardToggleSection"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.docs-sidebar-node {
  display: grid;
  gap: 0.55rem;
}

.docs-sidebar-node__toggle,
.docs-sidebar-node__section-link,
.docs-sidebar-node__doc-link {
  text-decoration: none;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.docs-sidebar-node__toggle,
.docs-sidebar-node__section-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 46px;
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--color-line);
  border-radius: 20px;
  background: var(--surface-card);
  color: var(--color-ink);
}

.docs-sidebar-node__toggle {
  padding-inline-start: calc(0.95rem + var(--sidebar-depth, 0) * 0.35rem);
}

.docs-sidebar-node__toggle--group {
  background:
    linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.08), transparent 58%),
    var(--surface-card);
}

.docs-sidebar-node__toggle--source {
  background: var(--surface-panel-alt);
}

.docs-sidebar-node__toggle--active,
.docs-sidebar-node__section-link--active {
  border-color: rgba(var(--color-accent-rgb), 0.28);
  box-shadow: 0 18px 34px rgba(var(--color-accent-rgb), 0.12);
}

.docs-sidebar-node__toggle--active {
  color: var(--color-accent-deep);
}

.docs-sidebar-node__name,
.docs-sidebar-node__section-name {
  min-width: 0;
  text-align: left;
  overflow-wrap: anywhere;
}

.docs-sidebar-node__name {
  font-weight: 600;
}

.docs-sidebar-node__toggle-icon,
.docs-sidebar-node__section-toggle-icon {
  width: 0.72rem;
  height: 0.72rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.18s ease;
  flex: none;
}

.docs-sidebar-node__toggle-icon--open,
.docs-sidebar-node__section-toggle-icon--open {
  transform: rotate(-135deg);
}

.docs-sidebar-node__body {
  display: grid;
  gap: 0.55rem;
  padding-inline-start: 0.45rem;
  animation: sidebarReveal 0.18s ease;
}

.docs-sidebar-node__section {
  display: grid;
  gap: 0.45rem;
}

.docs-sidebar-node__section-link {
  min-height: 44px;
  padding-inline-start: 1rem;
  background: var(--surface-panel);
}

.docs-sidebar-node__section-title-link {
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.docs-sidebar-node__section-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent-deep);
  cursor: pointer;
}

.docs-sidebar-node__docs {
  display: grid;
  gap: 0.42rem;
  padding-inline-start: 0.8rem;
}

.docs-sidebar-node__docs--root {
  padding-block-start: 0.15rem;
}

.docs-sidebar-node__doc-link {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0.75rem 0.95rem 0.75rem 1.05rem;
  border: 1px solid transparent;
  border-radius: 18px;
  color: var(--color-muted);
  background: transparent;
}

.docs-sidebar-node__doc-link:hover,
.docs-sidebar-node__toggle:hover,
.docs-sidebar-node__section-link:hover {
  border-color: rgba(var(--color-accent-rgb), 0.22);
  background: var(--surface-card-hover);
  transform: translateY(-1px);
}

.docs-sidebar-node__doc-link--active {
  border-color: rgba(var(--color-accent-rgb), 0.26);
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-accent-deep);
  box-shadow: inset 0 0 0 1px rgba(var(--color-accent-rgb), 0.08);
}

.docs-sidebar-node__doc-title {
  overflow-wrap: anywhere;
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
</style>
