import { computed } from 'vue'
import { docs, docsBySlug, sections, sourceGroups } from 'virtual:docs-data'

export function useDocsCatalog() {
  const sectionMap = computed(() => new Map(sections.map((section) => [section.id, section])))
  const sourceGroupMap = computed(() => new Map(sourceGroups.map((group) => [group.id, group])))

  return {
    sections,
    docs,
    docsBySlug,
    sectionMap,
    sourceGroups,
    sourceGroupMap,
  }
}
