<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import DocsSidebar from '@/components/docs/DocsSidebar.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import { useDocsCatalog } from '@/composables/useDocsCatalog'
import { useDocRoute } from '@/composables/useDocRoute'
import { useDocsSearch } from '@/composables/useDocsSearch'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { docs, sections, sourceGroups } = useDocsCatalog()
const { currentDoc, currentSection, currentSourceId } = useDocRoute()
const {
  activeResult,
  close: closeSearch,
  isOpen,
  moveSelection,
  open: openSearch,
  query,
  reset,
  results,
  selectedIndex,
  setQuery,
} = useDocsSearch()
const {
  initializeTheme,
  resolvedTheme,
  setThemeAccent,
  setThemeMode,
  themeAccent,
  themeAccents,
  themeMode,
} = useTheme()
const isSidebarOpen = shallowRef(false)
initializeTheme()

const pageLabel = computed(() => {
  if (currentDoc.value) {
    return currentDoc.value.title
  }

  if (currentSection.value) {
    return currentSection.value.title
  }

  return '教程首页'
})

const queryModel = computed({
  get: () => query.value,
  set: (value: string) => {
    setQuery(value)
  },
})

const totalTutorials = computed(() => docs.filter((doc) => !doc.isSectionIndex).length)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeSidebar() {
  isSidebarOpen.value = false
}

function navigateToResult(routePath?: string) {
  const target = routePath || activeResult.value?.routePath
  if (!target) {
    return
  }

  router.push(target)
  reset()
  closeSidebar()
}

</script>

<template>
  <div class="app-shell">
    <SiteHeader
      v-model="queryModel"
      :is-search-open="isOpen"
      :page-label="pageLabel"
      :results="results"
      :resolved-theme="resolvedTheme"
      :selected-index="selectedIndex"
      :theme-accent="themeAccent"
      :theme-accents="themeAccents"
      :theme-mode="themeMode"
      :total-sections="sections.length"
      :total-docs="totalTutorials"
      @close-search="closeSearch"
      @move-selection="moveSelection"
      @open-search="openSearch"
      @select-theme-accent="setThemeAccent"
      @select-theme-mode="setThemeMode"
      @submit-search="navigateToResult"
      @toggle-sidebar="toggleSidebar"
    />

    <div
      v-if="isSidebarOpen"
      class="app-shell__scrim"
      @click="closeSidebar"
    />

    <div class="app-shell__frame">
      <DocsSidebar
        :current-doc-slug="currentDoc?.slug ?? null"
        :current-section-id="currentSection?.id ?? null"
        :current-source-id="currentSourceId"
        :is-open="isSidebarOpen"
        :source-groups="sourceGroups"
        @close="closeSidebar"
      />

      <main class="app-shell__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 0 0 1.4rem;
}

.app-shell__frame {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  align-items: start;
  gap: 1.15rem;
  width: min(1560px, calc(100% - 2rem));
  margin: 0.9rem auto 0;
}

.app-shell__main {
  min-width: 0;
  padding: 0.2rem 0 4rem;
}

.app-shell__scrim {
  position: fixed;
  inset: 0;
  background: rgba(19, 27, 44, 0.46);
  backdrop-filter: blur(4px);
  z-index: 45;
}

@media (max-width: 960px) {
  .app-shell__frame {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    width: 100%;
    margin-top: 0.65rem;
    padding-inline: 0.85rem;
  }

  .app-shell__main {
    padding: 0 0 2.75rem;
  }
}

@media (max-width: 640px) {
  .app-shell__frame {
    padding-inline: 0.95rem;
  }

  .app-shell__main {
    padding: 0 0 2.5rem;
  }
}
</style>
