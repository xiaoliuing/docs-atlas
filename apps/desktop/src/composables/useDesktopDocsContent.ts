import { shallowReactive, shallowRef } from 'vue'
import type { DocDetail, SearchRecord } from '@/types/docs'
import { docsBySlug } from 'virtual:docs-data'

const docDetails = shallowReactive<Record<string, DocDetail>>({})
const searchIndex = shallowRef<SearchRecord[] | null>(null)

const pendingDocLoads = new Map<string, Promise<DocDetail | null>>()
let pendingSearchIndexLoad: Promise<SearchRecord[]> | null = null

export function useDesktopDocsContent() {
  return {
    docDetails,
    ensureDocDetail,
    ensureSearchIndex,
    searchIndex,
  }
}

export async function ensureDocDetail(slug: string): Promise<DocDetail | null> {
  if (!docsBySlug[slug]) {
    return null
  }

  if (docDetails[slug]) {
    return docDetails[slug]
  }

  const pending = pendingDocLoads.get(slug)
  if (pending) {
    return pending
  }

  const task = loadDocDetail(slug)
    .then((detail) => {
      if (detail) {
        docDetails[slug] = detail
      }

      return detail
    })
    .finally(() => {
      pendingDocLoads.delete(slug)
    })

  pendingDocLoads.set(slug, task)
  return task
}

export async function ensureSearchIndex(): Promise<SearchRecord[]> {
  if (searchIndex.value) {
    return searchIndex.value
  }

  if (pendingSearchIndexLoad) {
    return pendingSearchIndexLoad
  }

  pendingSearchIndexLoad = loadSearchIndex()
    .then((records) => {
      searchIndex.value = records
      return records
    })
    .finally(() => {
      pendingSearchIndexLoad = null
    })

  return pendingSearchIndexLoad
}

async function loadDocDetail(slug: string): Promise<DocDetail | null> {
  const response = await fetch(resolveAssetUrl(getDocContentPath(slug)))
  if (!response.ok) {
    return null
  }

  return response.json() as Promise<DocDetail>
}

async function loadSearchIndex(): Promise<SearchRecord[]> {
  const response = await fetch(resolveAssetUrl('/__docs/search-index.json'))
  if (!response.ok) {
    return []
  }

  return response.json() as Promise<SearchRecord[]>
}

function getDocContentPath(slug: string): string {
  const segments = slug.split('/').map((segment) => encodeURIComponent(segment))
  return `/__docs/content/${segments.join('/')}.json`
}

function resolveAssetUrl(assetPath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${base}${normalizedPath}` || normalizedPath
}
