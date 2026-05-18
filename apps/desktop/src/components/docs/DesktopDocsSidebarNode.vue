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
  selectDoc: [slug: string]
  toggleNode: [id: string, depth: number]
  toggleSection: [sectionId: string]
}>()

const isOpen = computed(() => props.openBranchIds[props.depth] === props.node.id)
const isSourceActive = computed(() => props.node.sourceId !== null && props.node.sourceId === props.currentSourceId)
const sectionItems = computed(() =>
  props.node.sections.map((section) => ({
    ...section,
    sectionIndexDoc: section.docs.find((doc) => doc.isSectionIndex) ?? null,
    tutorials: section.docs.filter((doc) => !doc.isSectionIndex),
  })),
)

function forwardToggleNode(id: string, depth: number) {
  emit('toggleNode', id, depth)
}

function forwardToggleSection(sectionId: string) {
  emit('toggleSection', sectionId)
}
</script>

<template>
  <section
    class="desktop-docs-sidebar-node"
    :style="{ '--desktop-sidebar-depth': depth }"
  >
    <button
      :class="[
        'desktop-docs-sidebar-node__toggle',
        {
          'desktop-docs-sidebar-node__toggle--active': isOpen || isSourceActive,
          'desktop-docs-sidebar-node__toggle--group': !node.isSource,
        },
      ]"
      type="button"
      @click="emit('toggleNode', node.id, depth)"
    >
      <span class="desktop-docs-sidebar-node__name">{{ node.name }}</span>
      <span
        :class="[
          'desktop-docs-sidebar-node__toggle-icon',
          { 'desktop-docs-sidebar-node__toggle-icon--open': isOpen },
        ]"
      />
    </button>

    <div
      v-if="isOpen"
      class="desktop-docs-sidebar-node__body"
    >
      <template v-if="node.isSource">
        <div
          v-if="node.rootDocs.length > 0"
          class="desktop-docs-sidebar-node__docs"
        >
          <button
            v-for="doc in node.rootDocs"
            :key="doc.slug"
            :class="[
              'desktop-docs-sidebar-node__doc-link',
              { 'desktop-docs-sidebar-node__doc-link--active': doc.slug === currentDocSlug },
            ]"
            type="button"
            @click="emit('selectDoc', doc.slug)"
          >
            {{ doc.title }}
          </button>
        </div>

        <section
          v-for="section in sectionItems"
          :key="section.id"
          class="desktop-docs-sidebar-node__section"
        >
          <div
            :class="[
              'desktop-docs-sidebar-node__section-row',
              {
                'desktop-docs-sidebar-node__section-row--active':
                  currentSectionId === section.id || openSectionId === section.id,
              },
            ]"
          >
            <button
              class="desktop-docs-sidebar-node__section-title"
              type="button"
              @click="section.sectionIndexDoc && emit('selectDoc', section.sectionIndexDoc.slug)"
            >
              {{ section.title }}
            </button>

            <button
              v-if="section.tutorials.length > 0"
              class="desktop-docs-sidebar-node__section-toggle"
              type="button"
              @click="emit('toggleSection', section.id)"
            >
              <span
                :class="[
                  'desktop-docs-sidebar-node__section-toggle-icon',
                  { 'desktop-docs-sidebar-node__section-toggle-icon--open': openSectionId === section.id },
                ]"
              />
            </button>
          </div>

          <div
            v-if="openSectionId === section.id && section.tutorials.length > 0"
            class="desktop-docs-sidebar-node__docs"
          >
            <button
              v-for="doc in section.tutorials"
              :key="doc.slug"
              :class="[
                'desktop-docs-sidebar-node__doc-link',
                { 'desktop-docs-sidebar-node__doc-link--active': doc.slug === currentDocSlug },
              ]"
              type="button"
              @click="emit('selectDoc', doc.slug)"
            >
              {{ doc.title }}
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <DesktopDocsSidebarNode
          v-for="child in node.children"
          :key="child.id"
          :current-doc-slug="currentDocSlug"
          :current-section-id="currentSectionId"
          :current-source-id="currentSourceId"
          :depth="depth + 1"
          :node="child"
          :open-branch-ids="openBranchIds"
          :open-section-id="openSectionId"
          @select-doc="emit('selectDoc', $event)"
          @toggle-node="forwardToggleNode"
          @toggle-section="forwardToggleSection"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.desktop-docs-sidebar-node {
  display: grid;
  gap: 0.35rem;
}

.desktop-docs-sidebar-node__toggle,
.desktop-docs-sidebar-node__section-row,
.desktop-docs-sidebar-node__doc-link {
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.desktop-docs-sidebar-node__toggle,
.desktop-docs-sidebar-node__section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  width: 100%;
  min-height: 38px;
  padding: 0.48rem 0.72rem;
  border: 1px solid var(--desktop-line);
  border-radius: 12px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  font-size: 0.92rem;
}

.desktop-docs-sidebar-node__toggle {
  padding-inline-start: calc(0.72rem + var(--desktop-sidebar-depth, 0) * 0.45rem);
}

.desktop-docs-sidebar-node__toggle--group {
  background: rgba(var(--desktop-accent-rgb), 0.03);
}

.desktop-docs-sidebar-node__toggle--active,
.desktop-docs-sidebar-node__section-row--active {
  border-color: var(--desktop-line-strong);
  background: rgba(var(--desktop-accent-rgb), 0.07);
}

.desktop-docs-sidebar-node__name {
  min-width: 0;
  font-weight: 600;
  text-align: left;
  overflow-wrap: anywhere;
}

.desktop-docs-sidebar-node__toggle-icon,
.desktop-docs-sidebar-node__section-toggle-icon {
  width: 0.52rem;
  height: 0.52rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.18s ease;
  flex: none;
  opacity: 0.78;
}

.desktop-docs-sidebar-node__toggle-icon--open,
.desktop-docs-sidebar-node__section-toggle-icon--open {
  transform: rotate(-135deg);
}

.desktop-docs-sidebar-node__body {
  display: grid;
  gap: 0.3rem;
  margin-left: 0.45rem;
  padding-left: 0.6rem;
  border-left: 1px solid rgba(var(--desktop-accent-rgb), 0.14);
}

.desktop-docs-sidebar-node__section {
  display: grid;
  gap: 0.24rem;
  padding-left: 0.1rem;
}

.desktop-docs-sidebar-node__section-title {
  border: 0;
  background: transparent;
  min-width: 0;
  color: inherit;
  text-align: left;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-docs-sidebar-node__section-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 8px;
  background: rgba(var(--desktop-accent-rgb), 0.08);
  color: var(--desktop-accent);
  cursor: pointer;
}

.desktop-docs-sidebar-node__docs {
  display: grid;
  gap: 0.18rem;
}

.desktop-docs-sidebar-node__doc-link {
  display: block;
  width: 100%;
  padding: 0.55rem 0.72rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--desktop-muted);
  text-align: left;
  cursor: pointer;
  font-size: 0.86rem;
  line-height: 1.45;
}

.desktop-docs-sidebar-node__doc-link:hover,
.desktop-docs-sidebar-node__doc-link--active {
  color: var(--desktop-accent);
  border-color: rgba(var(--desktop-accent-rgb), 0.16);
  background: rgba(var(--desktop-accent-rgb), 0.08);
}
</style>
