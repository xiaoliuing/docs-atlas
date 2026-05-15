import { shallowReactive, shallowRef } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { DocDetail, SearchRecord } from '@/types/docs'
import { docsBySlug } from 'virtual:docs-data'

type DocsContentState = {
  docDetails: Record<string, DocDetail>
}

const docDetails = shallowReactive<Record<string, DocDetail>>({})
const searchIndex = shallowRef<SearchRecord[] | null>(null)

const pendingDocLoads = new Map<string, Promise<DocDetail | null>>()
let pendingSearchIndexLoad: Promise<SearchRecord[]> | null = null

export function useDocsContent() {
  return {
    docDetails,
    ensureDocDetail,
    ensureRouteData,
    ensureSearchIndex,
    searchIndex,
  }
}

export function hydrateDocsContent(state?: DocsContentState) {
  if (!state) {
    return
  }

  Object.assign(docDetails, state.docDetails ?? {})
}

export function serializeDocsContent(): DocsContentState {
  return {
    docDetails: { ...docDetails },
  }
}

export async function ensureRouteData(route: RouteLocationNormalized) {
  if (route.name === 'doc') {
    const slug = normalizeRouteParam(route.params.slug)
    if (slug) {
      await ensureDocDetail(slug)
    }

    return
  }

  if (route.name === 'section') {
    const section = normalizeRouteParam(route.params.section)
    if (section) {
      await ensureDocDetail(section)
    }
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
  if (import.meta.env.SSR) {
    const { docDetailsBySlug } = await import('virtual:docs-ssr-data')
    return docDetailsBySlug[slug] ?? null
  }

  const response = await fetch(resolveAssetUrl(getDocContentPath(slug)))
  if (!response.ok) {
    return null
  }

  return response.json() as Promise<DocDetail>
}

async function loadSearchIndex(): Promise<SearchRecord[]> {
  if (import.meta.env.SSR) {
    const { searchIndex: serverSearchIndex } = await import('virtual:docs-ssr-data')
    return serverSearchIndex
  }

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

function normalizeRouteParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return trimTrailingSlash(value)
  }

  if (Array.isArray(value)) {
    return trimTrailingSlash(value.join('/'))
  }

  return null
}

function trimTrailingSlash(value: string): string {
  if (value === '/') {
    return value
  }

  return value.replace(/\/+$/g, '')
}

function resolveAssetUrl(assetPath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${base}${normalizedPath}` || normalizedPath
}
