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
  gap: 0.3rem;
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
  min-height: 34px;
  padding: 0.42rem 0.62rem;
  border: 1px solid var(--desktop-line);
  border-radius: 10px;
  background: var(--desktop-surface-strong);
  color: var(--desktop-ink);
  font-size: 0.84rem;
}

.desktop-docs-sidebar-node__toggle {
  padding-inline-start: calc(0.62rem + var(--desktop-sidebar-depth, 0) * 0.42rem);
}

.desktop-docs-sidebar-node__toggle--group {
  background: rgba(var(--desktop-accent-rgb), 0.025);
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
  display: block;
  width: 0.52rem;
  height: 0.52rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-1px) rotate(45deg);
  transform-origin: center;
  transition: transform 0.18s ease;
  flex: none;
  opacity: 0.78;
}

.desktop-docs-sidebar-node__toggle-icon--open,
.desktop-docs-sidebar-node__section-toggle-icon--open {
  transform: translateY(-1px) rotate(-135deg);
}

.desktop-docs-sidebar-node__body {
  display: grid;
  gap: 0.26rem;
  margin-left: 0.28rem;
  padding-left: 0.55rem;
  border-left: 1px solid rgba(var(--desktop-accent-rgb), 0.12);
}

.desktop-docs-sidebar-node__section {
  display: grid;
  gap: 0.2rem;
  padding-left: 0.1rem;
}

.desktop-docs-sidebar-node__section-title {
  border: 0;
  background: transparent;
  min-width: 0;
  color: inherit;
  text-align: left;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.desktop-docs-sidebar-node__section-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: rgba(var(--desktop-accent-rgb), 0.07);
  color: var(--desktop-accent);
  cursor: pointer;
  line-height: 0;
  flex: none;
}

.desktop-docs-sidebar-node__docs {
  display: grid;
  gap: 0.12rem;
}

.desktop-docs-sidebar-node__doc-link {
  display: block;
  width: 100%;
  padding: 0.42rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--desktop-muted);
  text-align: left;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1.35;
}

.desktop-docs-sidebar-node__doc-link:hover,
.desktop-docs-sidebar-node__doc-link--active {
  color: var(--desktop-accent);
  border-color: rgba(var(--desktop-accent-rgb), 0.16);
  background: rgba(var(--desktop-accent-rgb), 0.08);
}
</style>
