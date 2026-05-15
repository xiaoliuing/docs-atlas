export type DocHeading = {
  id: string
  text: string
  level: 2 | 3
}

export type DocMeta = {
  id: string
  sourceId: string
  sourceName: string
  sourceLabel: string
  sourceMountPath: string
  sectionId: string | null
  sectionTitle: string | null
  isSectionIndex: boolean
  slug: string
  routePath: string
  title: string
  sourcePath: string
  summary: string
  order: number
  prevSlug: string | null
  nextSlug: string | null
}

export type DocDetail = DocMeta & {
  html: string
  headings: DocHeading[]
}

export type DocSection = {
  id: string
  sourceId: string
  sourceName: string
  sourceLabel: string
  sourceMountPath: string
  title: string
  routePath: string
  docs: DocMeta[]
}

export type DocsSourceGroup = {
  id: string
  name: string
  mountPath: string
  isSource: boolean
  sourceId: string | null
  sourceLabel: string | null
  children: DocsSourceGroup[]
  rootDocs: DocMeta[]
  sections: DocSection[]
}

export type SearchRecord = {
  slug: string
  title: string
  section: string
  summary: string
  headings: string[]
  plainText: string
}

export type SearchResult = SearchRecord & {
  routePath: string
  score: number
}
