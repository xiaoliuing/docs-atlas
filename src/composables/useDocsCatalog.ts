import { computed } from 'vue'
import { docs, docsBySlug, sections, sourceGroups } from 'virtual:docs-data'

export function useDocsCatalog() {
  const sectionMap = computed(() => new Map(sections.map((section) => [section.id, section])))
  const sourceGroupMap = computed(() => {
    const map = new Map(sourceGroups.flatMap(flattenSourceGroups).map((group) => [group.id, group]))
    return map
  })

  return {
    sections,
    docs,
    docsBySlug,
    sectionMap,
    sourceGroups,
    sourceGroupMap,
  }
}

function flattenSourceGroups(group: (typeof sourceGroups)[number]): (typeof sourceGroups)[number][] {
  return [group, ...group.children.flatMap(flattenSourceGroups)]
}
