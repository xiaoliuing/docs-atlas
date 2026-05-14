<script setup lang="ts">
import { computed, nextTick, shallowRef, watch, useTemplateRef } from 'vue'
import DocsSearchPanel from '@/components/docs/DocsSearchPanel.vue'
import type { ThemeMode } from '@/composables/useTheme'
import type { SearchResult } from '@/types/docs'

const query = defineModel<string>({ default: '' })

const props = defineProps<{
  isSearchOpen: boolean
  pageLabel: string
  results: SearchResult[]
  selectedIndex: number
  theme: ThemeMode
  totalDocs: number
  totalSections: number
}>()

const emit = defineEmits<{
  closeSearch: []
  moveSelection: [direction: 1 | -1]
  openSearch: []
  submitSearch: [routePath?: string]
  toggleTheme: []
  toggleSidebar: []
}>()

const searchPanelRef = useTemplateRef<InstanceType<typeof DocsSearchPanel>>('searchPanel')
const isMobileSearchExpanded = shallowRef(false)

const shouldShowMobileSearch = computed(() => isMobileSearchExpanded.value)

watch(
  [() => query.value, () => props.isSearchOpen],
  ([currentQuery, searchOpen]) => {
    if (!currentQuery.trim() && !searchOpen) {
      isMobileSearchExpanded.value = false
    }
  },
)

function closeSearch() {
  emit('closeSearch')

  if (!query.value.trim()) {
    isMobileSearchExpanded.value = false
  }
}

function openMobileSearch() {
  isMobileSearchExpanded.value = true
  emit('openSearch')

  void nextTick(() => {
    searchPanelRef.value?.focusInput()
  })
}

function toggleMobileSearch() {
  if (isMobileSearchExpanded.value) {
    isMobileSearchExpanded.value = false
    emit('closeSearch')
    return
  }

  openMobileSearch()
}
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <div class="site-header__toolbar">
        <div class="site-header__brand">
          <button
            class="site-header__menu"
            aria-label="打开目录"
            type="button"
            @click="emit('toggleSidebar')"
          >
            导航
          </button>

          <RouterLink
            class="site-header__title"
            to="/"
          >
            <span class="site-header__title-mark" />
            <span class="site-header__title-text">Docs Atlas</span>
          </RouterLink>

          <p class="site-header__subtitle">
            {{ props.pageLabel }}
          </p>
        </div>

        <div class="site-header__actions">
          <div class="site-header__meta">
            <span>{{ props.totalSections }} 个专题</span>
            <span>{{ props.totalDocs }} 篇教程</span>
          </div>
          <button
            :aria-label="shouldShowMobileSearch ? '收起搜索' : '打开搜索'"
            class="site-header__search-trigger"
            type="button"
            @click="toggleMobileSearch"
          >
            <svg
              v-if="!shouldShowMobileSearch"
              aria-hidden="true"
              class="site-header__search-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="11"
                cy="11"
                r="5.75"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.85"
              />
              <path
                d="M15.35 15.35L19 19"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.85"
              />
            </svg>
            <svg
              v-else
              aria-hidden="true"
              class="site-header__search-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M7 7L17 17"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.85"
              />
              <path
                d="M17 7L7 17"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.85"
              />
            </svg>
          </button>
          <button
            :aria-label="props.theme === 'dark' ? '切换到浅色主题' : '切换到暗色主题'"
            class="site-header__theme"
            type="button"
            @click="emit('toggleTheme')"
          >
            <span class="site-header__theme-mark" />
            <span class="site-header__theme-text">{{ props.theme === 'dark' ? '暗色' : '浅色' }}</span>
          </button>
        </div>
      </div>

      <DocsSearchPanel
        :class="['site-header__search', { 'site-header__search--collapsed': !shouldShowMobileSearch }]"
        ref="searchPanel"
        :is-open="props.isSearchOpen"
        :results="props.results"
        :selected-index="props.selectedIndex"
        v-model="query"
        @close="closeSearch"
        @move-selection="emit('moveSelection', $event)"
        @open="emit('openSearch')"
        @submit="emit('submitSearch', $event)"
      />
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0.65rem;
  z-index: 40;
  padding: 0 1rem;
}

.site-header__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 1.2rem;
  margin: 0 auto;
  max-width: 1560px;
  border: 1px solid var(--color-line);
  border-radius: 26px;
  backdrop-filter: blur(22px);
  background: var(--surface-panel-alt);
  box-shadow: var(--shadow-panel);
}

.site-header__toolbar {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.site-header__brand {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.site-header__menu {
  display: none;
  border: 0;
  border-radius: 999px;
  min-height: 44px;
  padding: 0.65rem 0.95rem;
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-ink);
  font: inherit;
  cursor: pointer;
}

.site-header__title {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--color-ink);
  text-decoration: none;
  letter-spacing: 0.03em;
}

.site-header__title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-header__title-mark {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 30%, #ffffff, var(--color-accent) 58%, var(--color-accent-deep) 100%);
  box-shadow: 0 0 0 6px rgba(var(--color-accent-rgb), 0.12);
}

.site-header__subtitle {
  margin: 0 0 0 0.1rem;
  padding-left: 0.9rem;
  min-width: 0;
  border-left: 1px solid var(--color-line);
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-header__meta {
  display: flex;
  gap: 0.75rem;
  color: var(--color-soft);
  font-size: 0.9rem;
}

.site-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

.site-header__meta span {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-chip);
}

.site-header__theme {
  min-width: 40px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--surface-chip);
  color: var(--color-ink);
  cursor: pointer;
}

.site-header__theme-mark {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--color-accent), rgba(var(--color-accent-rgb), 0.35));
  box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.14);
}

.site-header__search-trigger {
  display: none;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--surface-chip);
  color: var(--color-ink);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.site-header__search-trigger:hover {
  background: rgba(var(--color-accent-rgb), 0.1);
  border-color: rgba(var(--color-accent-rgb), 0.3);
  transform: translateY(-1px);
}

.site-header__search-icon {
  width: 1.05rem;
  height: 1.05rem;
}

@media (max-width: 1180px) {
  .site-header__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
  }

  .site-header__meta {
    display: none;
  }
}

@media (max-width: 960px) {
  .site-header {
    top: 0;
    padding: 0;
  }

  .site-header__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.7rem;
    padding: 0.75rem 0.8rem 0.85rem;
    max-width: none;
    border-radius: 0;
    border-top: 0;
    border-right: 0;
    border-left: 0;
    box-shadow: 0 10px 24px rgba(19, 42, 92, 0.08);
  }

  .site-header__toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: start;
  }

  .site-header__brand {
    gap: 0.65rem;
  }

  .site-header__menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    padding: 0.65rem 0.85rem;
  }

  .site-header__title {
    gap: 0.55rem;
    font-size: 1.2rem;
  }

  .site-header__actions {
    align-self: center;
    justify-content: flex-end;
  }

  .site-header__search-trigger {
    display: inline-flex;
  }

  .site-header__search--collapsed {
    display: none;
  }

  .site-header__theme {
    min-height: 44px;
    padding-inline: 0.9rem;
  }

  .site-header__subtitle {
    display: none;
  }
}

@media (max-width: 720px) {
  .site-header__search {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .site-header__inner {
    padding-inline: 0.8rem;
  }

  .site-header__toolbar {
    gap: 0.65rem;
  }

  .site-header__title {
    font-size: 1.08rem;
  }
}

@media (max-width: 640px) {
  .site-header__inner {
    padding: 0.7rem;
    border-radius: 0 0 16px 16px;
  }

  .site-header__brand {
    min-width: 0;
  }

  .site-header__actions {
    gap: 0.5rem;
  }
}

@media (max-width: 520px) {
  .site-header__inner {
    gap: 0.6rem;
    padding: 0.65rem 0.7rem 0.8rem;
  }

  .site-header__toolbar {
    gap: 0.55rem;
  }

  .site-header__brand {
    gap: 0.5rem;
  }

  .site-header__menu {
    min-width: 40px;
    min-height: 40px;
    padding: 0.55rem 0.7rem;
  }

  .site-header__title {
    gap: 0.45rem;
    font-size: 0.98rem;
  }

  .site-header__theme {
    min-width: 40px;
    min-height: 40px;
    justify-content: center;
    padding: 0;
  }

  .site-header__search-trigger {
    min-width: 40px;
    min-height: 40px;
  }

  .site-header__theme-text {
    display: none;
  }
}
</style>
