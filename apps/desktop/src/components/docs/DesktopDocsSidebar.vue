<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import type { DocsSourceGroup } from '@/types/docs'
import DesktopDocsSidebarNode from './DesktopDocsSidebarNode.vue'

const props = defineProps<{
  currentDocSlug: string | null
  currentSectionId: string | null
  currentSourceId: string | null
  sourceGroups: DocsSourceGroup[]
}>()

const emit = defineEmits<{
  selectDoc: [slug: string]
}>()

const openBranchIds = shallowRef<string[]>([])
const openSectionId = shallowRef<string | null>(null)
const sidebarInnerRef = useTemplateRef<HTMLElement>('sidebarInner')

const activePath = computed(() => ({
  sectionId: props.currentSectionId,
  sourceId: props.currentSourceId,
}))

function toggleNode(id: string, depth: number) {
  const currentId = openBranchIds.value[depth] ?? null

  if (currentId === id) {
    openBranchIds.value = openBranchIds.value.slice(0, depth)
    openSectionId.value = null
    return
  }

  const nextBranch = openBranchIds.value.slice(0, depth)
  nextBranch[depth] = id
  openBranchIds.value = nextBranch
  openSectionId.value = null
}

function toggleSection(sectionId: string) {
  openSectionId.value = openSectionId.value === sectionId ? null : sectionId
}

function syncOpenState() {
  if (!activePath.value.sourceId) {
    openBranchIds.value = []
    openSectionId.value = null
    return
  }

  const nodePath = findNodePathBySourceId(props.sourceGroups, activePath.value.sourceId)
  openBranchIds.value = nodePath
  openSectionId.value = activePath.value.sectionId
}

function scrollToActiveItem() {
  const container = sidebarInnerRef.value
  if (!container) {
    return
  }

  const activeItem =
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__doc-link--active') ||
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__section-row--active') ||
    container.querySelector<HTMLElement>('.desktop-docs-sidebar-node__toggle--active')

  activeItem?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  })
}

watch(
  activePath,
  async () => {
    syncOpenState()
    await nextTick()
    scrollToActiveItem()
  },
  { immediate: true },
)

function findNodePathBySourceId(nodes: DocsSourceGroup[], sourceId: string): string[] {
  for (const node of nodes) {
    if (node.sourceId === sourceId) {
      return [node.id]
    }

    const childPath = findNodePathBySourceId(node.children, sourceId)
    if (childPath.length > 0) {
      return [node.id, ...childPath]
    }
  }

  return []
}
</script>

<template>
  <aside class="desktop-docs-sidebar">
    <div class="desktop-docs-sidebar__inner">
      <div class="desktop-docs-sidebar__heading">
        <p class="desktop-docs-sidebar__eyebrow">Library</p>
        <h2 class="desktop-docs-sidebar__title">目录</h2>
      </div>

      <div
        ref="sidebarInner"
        class="desktop-docs-sidebar__scroll desktop-scroll"
      >
        <nav class="desktop-docs-sidebar__nav">
          <DesktopDocsSidebarNode
            v-for="node in sourceGroups"
            :key="node.id"
            :current-doc-slug="currentDocSlug"
            :current-section-id="currentSectionId"
            :current-source-id="currentSourceId"
            :depth="0"
            :node="node"
            :open-branch-ids="openBranchIds"
            :open-section-id="openSectionId"
            @select-doc="emit('selectDoc', $event)"
            @toggle-node="toggleNode"
            @toggle-section="toggleSection"
          />
        </nav>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.desktop-docs-sidebar {
  height: 100%;
}

.desktop-docs-sidebar__inner {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--desktop-line);
  border-radius: var(--desktop-radius-lg);
  background: var(--desktop-surface);
}

.desktop-docs-sidebar__heading {
  padding: 0.95rem 0.95rem 0.7rem;
  border-bottom: 1px solid var(--desktop-line);
  background: var(--desktop-surface-strong);
}

.desktop-docs-sidebar__eyebrow {
  margin: 0 0 0.18rem;
  font-size: 0.67rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--desktop-soft);
}

.desktop-docs-sidebar__title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
}

.desktop-docs-sidebar__scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 0.7rem 0.8rem 0.85rem;
}

.desktop-docs-sidebar__nav {
  display: grid;
  gap: 0.5rem;
}
</style>
