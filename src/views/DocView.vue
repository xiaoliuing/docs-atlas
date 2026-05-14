<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import DocContent from '@/components/docs/DocContent.vue'
import DocPager from '@/components/docs/DocPager.vue'
import DocToc from '@/components/docs/DocToc.vue'
import { useActiveHeadings } from '@/composables/useActiveHeadings'
import { useDocsCatalog } from '@/composables/useDocsCatalog'
import { useDocRoute } from '@/composables/useDocRoute'

const router = useRouter()
const { currentDoc } = useDocRoute()
const { docsBySlug } = useDocsCatalog()

const headings = computed(() => currentDoc.value?.headings ?? [])
const prevDoc = computed(() => {
  const slug = currentDoc.value?.prevSlug
  return slug ? docsBySlug[slug] ?? null : null
})
const nextDoc = computed(() => {
  const slug = currentDoc.value?.nextSlug
  return slug ? docsBySlug[slug] ?? null : null
})
const { activeId, scrollToHeading } = useActiveHeadings(headings)

watch(
  currentDoc,
  (doc) => {
    if (doc && doc.routePath.startsWith('/section/')) {
      router.replace(doc.routePath)
    }
  },
  { immediate: true },
)
</script>

<template>
  <section
    v-if="currentDoc"
    class="doc-view"
  >
    <div class="doc-view__content">
      <DocContent :doc="currentDoc" />
      <DocPager
        :next-doc="nextDoc"
        :prev-doc="prevDoc"
      />
    </div>

    <DocToc
      :active-id="activeId"
      :headings="headings"
      @select="scrollToHeading"
    />
  </section>

  <section
    v-else
    class="empty-state"
  >
    <h1>未找到这篇文档</h1>
    <p>这个链接没有匹配到索引中的 Markdown 文件。</p>
  </section>
</template>

<style scoped>
.doc-view {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 1.25rem;
  align-items: start;
}

.doc-view__content {
  display: grid;
  gap: 1.5rem;
  min-width: 0;
}

.empty-state {
  padding: 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: 30px;
  background: var(--surface-panel);
}

.empty-state > h1 {
  margin: 0 0 0.7rem;
  font-family: var(--font-display);
}

.empty-state > p {
  margin: 0;
  color: var(--color-muted);
}

@media (max-width: 1180px) {
  .doc-view {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .doc-view {
    gap: 1rem;
  }

  .doc-view__content {
    gap: 1.15rem;
  }

  .empty-state {
    padding: 1.2rem;
    border-radius: 24px;
  }
}
</style>
