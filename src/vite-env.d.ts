/// <reference types="vite/client" />

declare module 'virtual:docs-data' {
  import type { DocMeta, DocSection, DocsSourceGroup } from '@/types/docs'

  export const sections: DocSection[]
  export const docs: DocMeta[]
  export const docsBySlug: Record<string, DocMeta>
  export const sourceGroups: DocsSourceGroup[]
}

declare module 'virtual:docs-ssr-data' {
  import type { DocDetail, SearchRecord } from '@/types/docs'

  export const docDetailsBySlug: Record<string, DocDetail>
  export const searchIndex: SearchRecord[]
}
