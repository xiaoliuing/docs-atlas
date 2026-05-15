<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import DocsSidebarNode from '@/components/docs/DocsSidebarNode.vue'
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
    container.querySelector<HTMLElement>('.docs-sidebar-node__doc-link--active') ||
    container.querySelector<HTMLElement>('.docs-sidebar-node__section-link--active') ||
    container.querySelector<HTMLElement>('.docs-sidebar-node__toggle--active')

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

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!isOpen) {
      return
    }

    syncOpenState()
    await nextTick()
    scrollToActiveItem()
  },
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
  <aside :class="['docs-sidebar', { 'docs-sidebar--open': isOpen }]">
    <div
      ref="sidebarInner"
      class="docs-sidebar__inner"
    >
      <div class="docs-sidebar__heading">
        <p class="docs-sidebar__eyebrow">
          Navigation
        </p>
        <h2 class="docs-sidebar__title">
          目录
        </h2>
      </div>

      <nav class="docs-sidebar__nav">
        <DocsSidebarNode
          v-for="node in sourceGroups"
          :key="node.id"
          :current-doc-slug="currentDocSlug"
          :current-section-id="currentSectionId"
          :current-source-id="currentSourceId"
          :depth="0"
          :node="node"
          :open-branch-ids="openBranchIds"
          :open-section-id="openSectionId"
          @close="emit('close')"
          @toggle-node="toggleNode"
          @toggle-section="toggleSection"
        />
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

.docs-sidebar__nav {
  display: grid;
  gap: 0.9rem;
}

@media (max-width: 960px) {
  .docs-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
    width: min(88vw, 360px);
    height: 100vh;
    padding: 0.8rem;
    transform: translateX(-108%);
    transition: transform 0.22s ease;
  }

  .docs-sidebar--open {
    transform: translateX(0);
  }

  .docs-sidebar__inner {
    border-radius: 28px;
  }
}
</style>
