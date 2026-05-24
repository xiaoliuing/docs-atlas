import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { convertFileSrc } from '@tauri-apps/api/core'
import type { DocDetail, DocHeading, DocMeta, DocSection, DocsSourceGroup, SearchRecord } from '@/types/docs'
import type {
  WorkspaceSourceDocumentSnapshot,
  WorkspaceSourceNode,
  WorkspaceSourceScanPayload,
} from '@docs-atlas/shared-types/workspace'

type WorkspaceDocsModel = {
  docDetailsBySlug: Record<string, DocDetail>
  docs: DocMeta[]
  docsBySlug: Record<string, DocMeta>
  searchIndex: SearchRecord[]
  sections: DocSection[]
  sourceGroups: DocsSourceGroup[]
}

type ResolvedSourceNode = {
  id: string
  name: string
  mountPath: string
  rootPath: string | null
  isSource: boolean
  sourceId: string | null
  sourceLabel: string | null
  children: ResolvedSourceNode[]
}

type ResolvedSourceInfo = {
  id: string
  label: string
  mountPath: string
  name: string
  rootPath: string
}

type RawDoc = {
  detail: DocDetail
  plainText: string
}

type SectionState = {
  docs: RawDoc[]
  sourceId: string
  sourceName: string
  sourceLabel: string
  sourceMountPath: string
  title: string
}

type HeadingMeta = {
  id: string
  level: number
  text: string
}

const markdownExtensionPattern = /\.md$/i

export function buildWorkspaceDocsModel(
  sources: WorkspaceSourceNode[],
  scanPayload: WorkspaceSourceScanPayload,
): WorkspaceDocsModel {
  const sourceMap = new Map<string, ResolvedSourceInfo>()
  const sourceNodes = new Map<string, DocsSourceGroup>()
  const occupiedMountPaths = new Set<string>()
  const sourceGroups = sources
    .filter((node) => node.enabled)
    .map((node, index) =>
      resolveSourceNode(node, {
        index,
        occupiedMountPaths,
        parentMountPath: '',
        sourceMap,
        sourceNodes,
        trail: [],
      }),
    )

  const rawDocs = scanPayload.documents
    .map((document) => buildRawDoc(document, sourceMap.get(document.sourceNodeId) ?? null))
    .filter((document): document is RawDoc => document !== null)

  assertNoDuplicateDocSlugs(rawDocs)

  const grouped = new Map<string, SectionState>()
  const rootDocsBySource = new Map<string, RawDoc[]>()

  for (const source of sourceMap.values()) {
    rootDocsBySource.set(source.id, [])
  }

  for (const rawDoc of rawDocs) {
    if (rawDoc.detail.sectionId) {
      const state = grouped.get(rawDoc.detail.sectionId) ?? {
        docs: [],
        sourceId: rawDoc.detail.sourceId,
        sourceName: rawDoc.detail.sourceName,
        sourceLabel: rawDoc.detail.sourceLabel,
        sourceMountPath: rawDoc.detail.sourceMountPath,
        title: rawDoc.detail.sectionTitle ?? humanizeSegment(rawDoc.detail.sectionId),
      }

      state.docs.push(rawDoc)
      if (rawDoc.detail.isSectionIndex) {
        state.title = rawDoc.detail.title
      }
      grouped.set(rawDoc.detail.sectionId, state)
      continue
    }

    rootDocsBySource.get(rawDoc.detail.sourceId)?.push(rawDoc)
  }

  const sections = Array.from(grouped.entries())
    .sort(([left], [right]) => comparePathSegments(left, right))
    .map(([sectionId, state]) => {
      const docs = state.docs.sort((left, right) => compareDocMeta(left.detail, right.detail))
      const sectionTitle = state.title

      docs.forEach((rawDoc, index) => {
        rawDoc.detail.sectionTitle = sectionTitle
        rawDoc.detail.order = index + 1
        rawDoc.detail.prevSlug = docs[index - 1]?.detail.slug ?? null
        rawDoc.detail.nextSlug = docs[index + 1]?.detail.slug ?? null
      })

      return {
        id: sectionId,
        sourceId: state.sourceId,
        sourceName: state.sourceName,
        sourceLabel: state.sourceLabel,
        sourceMountPath: state.sourceMountPath,
        title: sectionTitle,
        routePath: createDirectoryRoutePath(`/section/${sectionId}`),
        docs: docs.map((rawDoc) => toDocMeta(rawDoc.detail)),
      }
    })

  for (const section of sections) {
    sourceNodes.get(section.sourceId)?.sections.push(section)
  }

  for (const source of sourceMap.values()) {
    const sourceNode = sourceNodes.get(source.id)
    if (!sourceNode) {
      continue
    }

    const rootDocs = rootDocsBySource.get(source.id)?.sort((left, right) => compareDocMeta(left.detail, right.detail)) ?? []
    rootDocs.forEach((rawDoc, index) => {
      rawDoc.detail.order = index + 1
      rawDoc.detail.prevSlug = rootDocs[index - 1]?.detail.slug ?? null
      rawDoc.detail.nextSlug = rootDocs[index + 1]?.detail.slug ?? null
    })

    sourceNode.rootDocs = rootDocs.map((rawDoc) => toDocMeta(rawDoc.detail))
    sourceNode.sections.sort((left, right) => comparePathSegments(left.id, right.id))
  }

  const docs = rawDocs.map((rawDoc) => toDocMeta(rawDoc.detail)).sort(compareDocMeta)
  const docsBySlug = Object.fromEntries(docs.map((doc) => [doc.slug, doc]))
  const docDetailsBySlug = Object.fromEntries(rawDocs.map((rawDoc) => [rawDoc.detail.slug, rawDoc.detail]))
  const searchIndex = rawDocs.map((rawDoc) => ({
    slug: rawDoc.detail.slug,
    title: rawDoc.detail.title,
    section: rawDoc.detail.sectionTitle
      ? `${rawDoc.detail.sourceLabel} / ${rawDoc.detail.sectionTitle}`
      : rawDoc.detail.sourceLabel,
    summary: rawDoc.detail.summary,
    headings: rawDoc.detail.headings.map((heading) => heading.text),
    plainText: rawDoc.plainText,
  }))

  return {
    docDetailsBySlug,
    docs,
    docsBySlug,
    searchIndex,
    sections,
    sourceGroups,
  }
}

function resolveSourceNode(
  node: WorkspaceSourceNode,
  context: {
    index: number
    occupiedMountPaths: Set<string>
    parentMountPath: string
    sourceMap: Map<string, ResolvedSourceInfo>
    sourceNodes: Map<string, DocsSourceGroup>
    trail: string[]
  },
): DocsSourceGroup {
  const displayName = node.name.trim() || (node.kind === 'group' ? `分组 ${context.index + 1}` : `目录 ${context.index + 1}`)
  const mountSegment = createMountSegment(displayName, node.kind, context.index)
  const mountPath = ensureUniqueMountPath(joinMountPath(context.parentMountPath, mountSegment), context.occupiedMountPaths)
  const nextTrail = [...context.trail, displayName]

  const clonedNode: DocsSourceGroup = {
    id: node.id,
    name: displayName,
    mountPath,
    isSource: node.kind === 'folder',
    sourceId: node.kind === 'folder' ? node.id : null,
    sourceLabel: node.kind === 'folder' ? nextTrail.join(' / ') : null,
    children: node.children
      .filter((child) => child.enabled)
      .map((child, index) =>
        resolveSourceNode(child, {
          ...context,
          index,
          parentMountPath: mountPath,
          trail: nextTrail,
        }),
      ),
    rootDocs: [],
    sections: [],
  }

  if (node.kind === 'folder') {
    context.sourceMap.set(node.id, {
      id: node.id,
      label: nextTrail.join(' / '),
      mountPath,
      name: displayName,
      rootPath: node.path,
    })
    context.sourceNodes.set(node.id, clonedNode)
  }

  return clonedNode
}

function ensureUniqueMountPath(candidate: string, occupiedMountPaths: Set<string>): string {
  if (!occupiedMountPaths.has(candidate)) {
    occupiedMountPaths.add(candidate)
    return candidate
  }

  let suffix = 2
  let nextCandidate = `${candidate}-${suffix}`
  while (occupiedMountPaths.has(nextCandidate)) {
    suffix += 1
    nextCandidate = `${candidate}-${suffix}`
  }

  occupiedMountPaths.add(nextCandidate)
  return nextCandidate
}

function buildRawDoc(document: WorkspaceSourceDocumentSnapshot, source: ResolvedSourceInfo | null): RawDoc | null {
  if (!source) {
    return null
  }

  const relativePath = normalizePath(document.relativePath)
  const pathSegments = relativePath.split('/')
  const isRootDoc = pathSegments.length === 1
  const relativeSectionId = isRootDoc ? null : pathSegments[0] ?? null
  const basename = getPathBasename(relativePath)
  const isReadme = basename.toLowerCase() === 'readme.md'
  const isSectionIndex = Boolean(relativeSectionId) && isReadme
  const relativeSlug = isSectionIndex
    ? getPathDirname(relativePath)
    : relativePath.replace(markdownExtensionPattern, '')
  const slug = buildScopedPath(source.mountPath, relativeSlug)
  const sectionId = relativeSectionId ? buildScopedPath(source.mountPath, relativeSectionId) : null
  const routePath = createDirectoryRoutePath(
    isSectionIndex && sectionId ? `/section/${sectionId}` : `/docs/${slug}`,
  )
  const rendered = renderMarkdown(document.markdown, {
    absolutePath: document.absolutePath,
    docsRoot: source.rootPath,
    sourceMountPath: source.mountPath,
  })
  const title = rendered.title || humanizeSegment(getPathBasename(relativePath).replace(markdownExtensionPattern, ''))
  const summary = rendered.summary || createSummary(extractPlainText(document.markdown))
  const detail: DocDetail = {
    id: slug,
    sourceId: source.id,
    sourceName: source.name,
    sourceLabel: source.label,
    sourceMountPath: source.mountPath,
    sectionId,
    sectionTitle: relativeSectionId ? humanizeSegment(relativeSectionId) : null,
    isSectionIndex,
    slug,
    routePath,
    title,
    sourcePath: normalizePath(`${source.label}/${relativePath}`),
    absolutePath: document.absolutePath,
    summary,
    updatedAt: document.updatedAt,
    html: rendered.html,
    headings: rendered.headings.filter((heading): heading is DocHeading => heading.level === 2 || heading.level === 3),
    order: 0,
    prevSlug: null,
    nextSlug: null,
  }

  return {
    detail,
    plainText: extractPlainText(document.markdown),
  }
}

function renderMarkdown(
  source: string,
  context: {
    absolutePath: string
    docsRoot: string
    sourceMountPath: string
  },
): {
  headings: HeadingMeta[]
  html: string
  summary: string
  title: string
} {
  const headingCount = new Map<string, number>()
  const headings: HeadingMeta[] = []
  const markdown = new MarkdownIt({
    html: false,
    highlight(code, language) {
      const languageName = language.trim().toLowerCase()

      if (languageName === 'mermaid') {
        return `<pre class="mermaid"><code class="language-mermaid">${escapeHtml(code)}</code></pre>`
      }

      const normalizedLanguage = language && hljs.getLanguage(language) ? language : ''
      const highlighted = normalizedLanguage
        ? hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value
      const languageClass = normalizedLanguage ? ` language-${normalizedLanguage}` : ''

      return `<pre class="hljs"><code class="hljs${languageClass}">${highlighted}</code></pre>`
    },
    linkify: true,
    typographer: false,
  })

  const defaultHeadingOpen =
    markdown.renderer.rules.heading_open ??
    ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
  const defaultLinkOpen =
    markdown.renderer.rules.link_open ??
    ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
  const defaultImage =
    markdown.renderer.rules.image ??
    ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))

  markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const next = tokens[index + 1]
    const text = next?.content?.trim() ?? ''
    const level = Number.parseInt(token.tag.replace('h', ''), 10)

    if (!text || Number.isNaN(level)) {
      return defaultHeadingOpen(tokens, index, options, env, self)
    }

    const id = createHeadingId(text, headingCount)
    token.attrSet('id', id)
    headings.push({
      id,
      level,
      text,
    })

    return defaultHeadingOpen(tokens, index, options, env, self)
  }

  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const href = token.attrGet('href')

    if (href) {
      const rewritten = rewriteHref(href, context.absolutePath, context.docsRoot, context.sourceMountPath)

      token.attrSet('href', rewritten.href)
      if (rewritten.docSlug) {
        token.attrSet('data-doc-slug', rewritten.docSlug)
      }

      if (/^https?:\/\//i.test(rewritten.href)) {
        token.attrSet('target', '_blank')
        token.attrSet('rel', 'noreferrer noopener')
      }
    }

    return defaultLinkOpen(tokens, index, options, env, self)
  }

  markdown.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const src = token.attrGet('src')

    if (src) {
      token.attrSet('src', rewriteImageSource(src, context.absolutePath, context.docsRoot))
    }

    token.attrSet('loading', 'lazy')
    return defaultImage(tokens, index, options, env, self)
  }

  const html = markdown.render(source)
  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      'a',
      'blockquote',
      'br',
      'code',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'img',
      'li',
      'ol',
      'p',
      'pre',
      'span',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    allowedAttributes: {
      a: ['data-doc-slug', 'href', 'rel', 'target'],
      code: ['class'],
      h1: ['id'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      h5: ['id'],
      h6: ['id'],
      img: ['alt', 'loading', 'src', 'title'],
      pre: ['class'],
      span: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data', 'asset'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data', 'asset'],
    },
  })

  return {
    headings,
    html: stripLeadingTitleHeading(sanitized),
    summary: createSummary(findFirstParagraph(source) || extractPlainText(source)),
    title: headings.find((heading) => heading.level === 1)?.text ?? '',
  }
}

function stripLeadingTitleHeading(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '')
}

function rewriteHref(
  href: string,
  absolutePath: string,
  docsRoot: string,
  sourceMountPath: string,
): {
  docSlug: string | null
  href: string
} {
  if (href.startsWith('#') || /^mailto:/i.test(href)) {
    return { docSlug: null, href }
  }

  if (/^https?:\/\//i.test(href)) {
    return { docSlug: null, href }
  }

  const [rawTarget] = href.split('#')
  if (!markdownExtensionPattern.test(rawTarget)) {
    return { docSlug: null, href }
  }

  const decoded = decodeURIComponent(rawTarget)
  const resolved = resolveRelativeFilePath(absolutePath, decoded)
  const relativeTarget = getRelativePathWithinRoot(docsRoot, resolved)
  if (relativeTarget.startsWith('..')) {
    return { docSlug: null, href }
  }

  const isReadme = getPathBasename(relativeTarget).toLowerCase() === 'readme.md'
  const isSectionReadme = isReadme && relativeTarget.includes('/')
  const relativeSlug = isSectionReadme
    ? getPathDirname(relativeTarget)
    : relativeTarget.replace(markdownExtensionPattern, '')
  const docSlug = buildScopedPath(sourceMountPath, relativeSlug)

  return {
    docSlug,
    href: `#doc:${docSlug}`,
  }
}

function rewriteImageSource(src: string, absolutePath: string, docsRoot: string): string {
  if (
    src.startsWith('#') ||
    src.startsWith('/') ||
    /^data:/i.test(src) ||
    /^https?:\/\//i.test(src) ||
    /^asset:/i.test(src) ||
    /^http:\/\/asset\.localhost/i.test(src) ||
    /^\/\//.test(src)
  ) {
    return src
  }

  const decoded = decodeURIComponent(splitUrlReference(src).pathname)
  const resolved = resolveRelativeFilePath(absolutePath, decoded)
  const relativeTarget = getRelativePathWithinRoot(docsRoot, resolved)
  if (relativeTarget.startsWith('..')) {
    return src
  }

  return convertFileSrc(resolved)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitUrlReference(value: string): {
  pathname: string
} {
  const hashIndex = value.indexOf('#')
  const queryIndex = value.indexOf('?')
  const cutoffCandidates = [hashIndex, queryIndex].filter((index) => index >= 0)
  const cutoff = cutoffCandidates.length > 0 ? Math.min(...cutoffCandidates) : value.length

  return {
    pathname: value.slice(0, cutoff),
  }
}

function createHeadingId(text: string, headingCount: Map<string, number>): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const base = normalized || 'section'
  const count = headingCount.get(base) ?? 0
  headingCount.set(base, count + 1)

  return count === 0 ? base : `${base}-${count + 1}`
}

function findFirstParagraph(source: string): string {
  const lines = source.split(/\r?\n/)
  const parts: string[] = []
  let started = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) {
      if (started && !trimmed) {
        break
      }
      continue
    }

    parts.push(trimmed)
    started = true
  }

  return parts.join(' ')
}

function createSummary(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= 120) {
    return compact
  }

  return `${compact.slice(0, 117)}...`
}

function extractPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>*-]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function assertNoDuplicateDocSlugs(rawDocs: RawDoc[]) {
  const seen = new Map<string, string>()
  for (const rawDoc of rawDocs) {
    const previous = seen.get(rawDoc.detail.slug)
    if (previous) {
      throw new Error(
        `[docs-atlas] Duplicate doc slug detected: "${rawDoc.detail.slug}".\n` +
          `Conflicting files:\n- ${previous}\n- ${rawDoc.detail.sourcePath}`,
      )
    }

    seen.set(rawDoc.detail.slug, rawDoc.detail.sourcePath)
  }
}

function toDocMeta(detail: DocDetail): DocMeta {
  return {
    id: detail.id,
    sourceId: detail.sourceId,
    sourceName: detail.sourceName,
    sourceLabel: detail.sourceLabel,
    sourceMountPath: detail.sourceMountPath,
    sectionId: detail.sectionId,
    sectionTitle: detail.sectionTitle,
    isSectionIndex: detail.isSectionIndex,
    slug: detail.slug,
    routePath: detail.routePath,
    title: detail.title,
    sourcePath: detail.sourcePath,
    absolutePath: detail.absolutePath,
    summary: detail.summary,
    updatedAt: detail.updatedAt,
    order: detail.order,
    prevSlug: detail.prevSlug,
    nextSlug: detail.nextSlug,
  }
}

function createMountSegment(displayName: string, kind: 'group' | 'folder', index: number): string {
  const normalized = displayName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `${kind}-${index + 1}`
}

function buildScopedPath(sourceMountPath: string, relativePath: string): string {
  return normalizePath([sourceMountPath, relativePath].filter(Boolean).join('/'))
}

function createDirectoryRoutePath(routePath: string): string {
  if (!routePath || routePath === '/') {
    return '/'
  }

  return routePath.endsWith('/') ? routePath : `${routePath}/`
}

function joinMountPath(parentMountPath: string, mountSegment: string): string {
  return [parentMountPath, mountSegment].filter(Boolean).join('/')
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/')
}

function normalizeFsPath(value: string): string {
  return normalizePath(value).replace(/\/+/g, '/')
}

function getPathBasename(value: string): string {
  const normalized = normalizeFsPath(value).replace(/\/+$/g, '')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? ''
}

function getPathDirname(value: string): string {
  const normalized = normalizeFsPath(value)
  const segments = normalized.split('/')
  segments.pop()
  const joined = segments.join('/')
  return joined || ''
}

function resolveRelativeFilePath(baseFilePath: string, targetPath: string): string {
  const baseDir = getPathDirname(baseFilePath)
  const rawPath = isFsAbsolutePath(targetPath) ? targetPath : [baseDir, targetPath].filter(Boolean).join('/')
  const normalized = normalizeFsPath(rawPath)
  const isAbsolute = isFsAbsolutePath(normalized)
  const resolvedSegments: string[] = []
  const drivePrefix = normalized.match(/^[A-Za-z]:/)?.[0] ?? ''
  const normalizedWithoutDrive = drivePrefix ? normalized.slice(drivePrefix.length) : normalized

  for (const segment of normalizedWithoutDrive.split('/')) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      if (resolvedSegments.length > 0 && resolvedSegments[resolvedSegments.length - 1] !== '..') {
        resolvedSegments.pop()
        continue
      }

      if (!isAbsolute) {
        resolvedSegments.push('..')
      }
      continue
    }

    resolvedSegments.push(segment)
  }

  const joined = resolvedSegments.join('/')
  if (drivePrefix) {
    return `${drivePrefix}/${joined}`
  }

  return isAbsolute ? `/${joined}` : joined
}

function getRelativePathWithinRoot(rootPath: string, targetPath: string): string {
  const normalizedRoot = normalizeFsPath(rootPath).replace(/\/+$/g, '')
  const normalizedTarget = normalizeFsPath(targetPath)

  if (normalizedTarget === normalizedRoot) {
    return ''
  }

  const prefix = `${normalizedRoot}/`
  if (normalizedTarget.startsWith(prefix)) {
    return normalizedTarget.slice(prefix.length)
  }

  return `../${normalizedTarget}`
}

function isFsAbsolutePath(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:\//.test(normalizeFsPath(value))
}

function compareDocMeta(left: DocMeta, right: DocMeta): number {
  if (left.isSectionIndex && !right.isSectionIndex) {
    return -1
  }

  if (right.isSectionIndex && !left.isSectionIndex) {
    return 1
  }

  return comparePathSegments(left.sourcePath, right.sourcePath)
}

function comparePathSegments(left: string, right: string): number {
  const leftSegments = normalizePath(left).split('/').filter(Boolean)
  const rightSegments = normalizePath(right).split('/').filter(Boolean)
  const sharedLength = Math.min(leftSegments.length, rightSegments.length)

  for (let index = 0; index < sharedLength; index += 1) {
    const result = compareSinglePathSegment(leftSegments[index] ?? '', rightSegments[index] ?? '')
    if (result !== 0) {
      return result
    }
  }

  return leftSegments.length - rightSegments.length
}

function compareSinglePathSegment(left: string, right: string): number {
  const leftInfo = getSegmentInfo(left)
  const rightInfo = getSegmentInfo(right)

  if (leftInfo.isReadme && !rightInfo.isReadme) {
    return -1
  }

  if (rightInfo.isReadme && !leftInfo.isReadme) {
    return 1
  }

  return leftInfo.sortValue.localeCompare(rightInfo.sortValue, 'zh-Hans-CN', {
    numeric: true,
    sensitivity: 'base',
  })
}

function getSegmentInfo(segment: string): {
  isReadme: boolean
  sortValue: string
} {
  const decodedSegment = decodeURIComponent(segment)
  return {
    isReadme: decodedSegment.toLowerCase() === 'readme.md',
    sortValue: decodedSegment,
  }
}

export type { WorkspaceDocsModel }
