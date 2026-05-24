import fs from 'node:fs'
import path from 'node:path'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import type { Connect, Plugin } from 'vite'
import type { DocsSource, DocsSourceTreeNode, ResolvedDocsConfig } from './docsConfig'

type DocHeading = {
  id: string
  text: string
  level: 2 | 3
}

type DocMeta = {
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
  absolutePath: string
  summary: string
  updatedAt: string
  order: number
  prevSlug: string | null
  nextSlug: string | null
}

type DocDetail = DocMeta & {
  html: string
  headings: DocHeading[]
}

type DocSection = {
  id: string
  sourceId: string
  sourceName: string
  sourceLabel: string
  sourceMountPath: string
  title: string
  routePath: string
  docs: DocMeta[]
}

type DocsSourceGroup = {
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

type SearchRecord = {
  slug: string
  title: string
  section: string
  summary: string
  headings: string[]
  plainText: string
}

type DocsData = {
  docDetailsBySlug: Record<string, DocDetail>
  docs: DocMeta[]
  docsBySlug: Record<string, DocMeta>
  searchIndex: SearchRecord[]
  sections: DocSection[]
  staticAssets: StaticAsset[]
  staticAssetsByPath: Record<string, string>
  sourceGroups: DocsSourceGroup[]
}

type BuildContext = {
  appBase: string
  docsConfig: ResolvedDocsConfig
}

type HeadingMeta = {
  id: string
  level: number
  text: string
}

type SectionState = {
  docs: RawDoc[]
  sourceId: string
  sourceName: string
  sourceLabel: string
  sourceMountPath: string
  title: string
}

type RawDoc = {
  assets: StaticAsset[]
  detail: DocDetail
  plainText: string
}

type StaticAsset = {
  absolutePath: string
  outputPath: string
  publicPath: string
}

const VIRTUAL_DOCS_DATA_ID = 'virtual:docs-data'
const RESOLVED_DOCS_DATA_ID = '\0virtual:docs-data'
const VIRTUAL_DOCS_SSR_DATA_ID = 'virtual:docs-ssr-data'
const RESOLVED_DOCS_SSR_DATA_ID = '\0virtual:docs-ssr-data'

const ASSET_PREFIX = '/__docs/assets/'
const CONTENT_PREFIX = '/__docs/content/'
const SEARCH_INDEX_PATH = '/__docs/search-index.json'
const markdownExtensionPattern = /\.md$/i

export function createDocsDataPlugin({ appBase, docsConfig }: BuildContext): Plugin {
  let cachedData: DocsData | null = null

  const readData = () => {
    cachedData ??= buildDocsData({ appBase, docsConfig })
    return cachedData
  }

  const invalidateCache = () => {
    cachedData = null
  }

  return {
    name: 'docs-data-plugin',
    enforce: 'pre',
    resolveId(source) {
      if (source === VIRTUAL_DOCS_DATA_ID) {
        return RESOLVED_DOCS_DATA_ID
      }

      if (source === VIRTUAL_DOCS_SSR_DATA_ID) {
        return RESOLVED_DOCS_SSR_DATA_ID
      }

      return null
    },
    load(id) {
      const data = readData()

      if (id === RESOLVED_DOCS_DATA_ID) {
        return [
          `export const sections = ${JSON.stringify(data.sections)};`,
          `export const docs = ${JSON.stringify(data.docs)};`,
          `export const docsBySlug = ${JSON.stringify(data.docsBySlug)};`,
          `export const sourceGroups = ${JSON.stringify(data.sourceGroups)};`,
        ].join('\n')
      }

      if (id === RESOLVED_DOCS_SSR_DATA_ID) {
        return [
          `export const docDetailsBySlug = ${JSON.stringify(data.docDetailsBySlug)};`,
          `export const searchIndex = ${JSON.stringify(data.searchIndex)};`,
        ].join('\n')
      }

      return null
    },
    configureServer(server) {
      server.watcher.add(docsConfig.sources.map((source) => source.root))
      server.middlewares.use(createDocsMiddleware(readData, appBase))
    },
    handleHotUpdate(context) {
      const isDocsFile = docsConfig.sources.some((source) => context.file.startsWith(source.root))
      if (!isDocsFile || !context.file.endsWith('.md')) {
        return
      }

      invalidateCache()

      for (const id of [RESOLVED_DOCS_DATA_ID, RESOLVED_DOCS_SSR_DATA_ID]) {
        const module = context.server.moduleGraph.getModuleById(id)
        if (module) {
          context.server.moduleGraph.invalidateModule(module)
        }
      }

      context.server.ws.send({ type: 'full-reload' })
      return []
    },
    buildStart() {
      invalidateCache()
    },
    generateBundle() {
      const data = readData()

      this.emitFile({
        type: 'asset',
        fileName: SEARCH_INDEX_PATH.slice(1),
        source: JSON.stringify(data.searchIndex),
      })

      for (const [slug, detail] of Object.entries(data.docDetailsBySlug)) {
        this.emitFile({
          type: 'asset',
          fileName: getDocContentAssetPath(slug).slice(1),
          source: JSON.stringify(detail),
        })
      }

      for (const asset of data.staticAssets) {
        this.emitFile({
          type: 'asset',
          fileName: asset.outputPath.slice(1),
          source: fs.readFileSync(asset.absolutePath),
        })
      }
    },
  }
}

export function buildDocsData({ appBase, docsConfig }: BuildContext): DocsData {
  const rawDocs = docsConfig.sources.flatMap((source) =>
    collectMarkdownFiles(source.root).map((absolutePath) => buildRawDoc(absolutePath, source, appBase)),
  )
  assertNoDuplicateDocSlugs(rawDocs)
  const grouped = new Map<string, SectionState>()
  const sourceNodes = new Map<string, DocsSourceGroup>()
  const rootDocsBySource = new Map<string, RawDoc[]>()
  const staticAssets = new Map<string, string>()
  const sourceGroups = docsConfig.sourceGroups.map((node) => cloneSourceTreeNode(node, sourceNodes))

  for (const source of docsConfig.sources) {
    rootDocsBySource.set(source.id, [])
  }

  for (const rawDoc of rawDocs) {
    for (const asset of rawDoc.assets) {
      staticAssets.set(asset.outputPath, asset.absolutePath)
    }

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

  for (const source of docsConfig.sources) {
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
    staticAssets: Array.from(staticAssets.entries())
      .map(([outputPath, absolutePath]) => ({
        absolutePath,
        outputPath,
        publicPath: resolvePublicPath(appBase, outputPath),
      }))
      .sort((left, right) => comparePathSegments(left.outputPath, right.outputPath)),
    staticAssetsByPath: Object.fromEntries(staticAssets.entries()),
    sourceGroups,
  }
}

function cloneSourceTreeNode(
  node: DocsSourceTreeNode,
  sourceNodes: Map<string, DocsSourceGroup>,
): DocsSourceGroup {
  const clonedNode: DocsSourceGroup = {
    id: node.id,
    name: node.name,
    mountPath: node.mountPath,
    isSource: node.isSource,
    sourceId: node.sourceId,
    sourceLabel: node.sourceLabel,
    children: [],
    rootDocs: [],
    sections: [],
  }

  clonedNode.children = node.children.map((child) => cloneSourceTreeNode(child, sourceNodes))

  if (node.sourceId) {
    sourceNodes.set(node.sourceId, clonedNode)
  }

  return clonedNode
}

function createDocsMiddleware(readData: () => DocsData, appBase: string): Connect.NextHandleFunction {
  return (request, response, next) => {
    const pathname = request.url?.split('?')[0]

    if (!pathname) {
      next()
      return
    }

    const normalizedPathname = stripBasePath(pathname, appBase)

    if (normalizedPathname === SEARCH_INDEX_PATH) {
      writeJson(response, readData().searchIndex)
      return
    }

    if (normalizedPathname.startsWith(CONTENT_PREFIX) && normalizedPathname.endsWith('.json')) {
      const slug = decodeDocSlugFromPath(normalizedPathname)
      const detail = slug ? readData().docDetailsBySlug[slug] ?? null : null

      if (!detail) {
        response.statusCode = 404
        response.end('Not Found')
        return
      }

      writeJson(response, detail)
      return
    }

    if (normalizedPathname.startsWith(ASSET_PREFIX)) {
      const absolutePath = readData().staticAssetsByPath[normalizedPathname]

      if (!absolutePath || !fs.existsSync(absolutePath)) {
        response.statusCode = 404
        response.end('Not Found')
        return
      }

      response.statusCode = 200
      response.setHeader('Content-Type', getContentType(absolutePath))
      response.end(fs.readFileSync(absolutePath))
      return
    }

    next()
  }
}

function writeJson(response: Connect.ServerResponse, payload: unknown) {
  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function assertNoDuplicateDocSlugs(rawDocs: RawDoc[]) {
  const seen = new Map<string, string>()

  for (const rawDoc of rawDocs) {
    const previous = seen.get(rawDoc.detail.slug)
    if (previous) {
      throw new Error(
        `[docs-atlas] Duplicate doc slug detected: "${rawDoc.detail.slug}".\n` +
          `Conflicting files:\n- ${previous}\n- ${rawDoc.detail.sourcePath}\n` +
          'Please rename one of the files, move it under a different directory, or use a different source name in config.yaml.',
      )
    }

    seen.set(rawDoc.detail.slug, rawDoc.detail.sourcePath)
  }
}

function buildRawDoc(absolutePath: string, docsSource: DocsSource, appBase: string): RawDoc {
  const source = fs.readFileSync(absolutePath, 'utf8')
  const relativePath = normalizePath(path.relative(docsSource.root, absolutePath))
  const pathSegments = relativePath.split('/')
  const isRootDoc = pathSegments.length === 1
  const relativeSectionId = isRootDoc ? null : pathSegments[0] ?? null
  const basename = path.basename(relativePath)
  const isReadme = basename.toLowerCase() === 'readme.md'
  const isSectionIndex = Boolean(relativeSectionId) && isReadme
  const relativeSlug = isSectionIndex
    ? normalizePath(path.dirname(relativePath))
    : relativePath.replace(markdownExtensionPattern, '')
  const slug = buildScopedPath(docsSource.mountPath, relativeSlug)
  const sectionId = relativeSectionId ? buildScopedPath(docsSource.mountPath, relativeSectionId) : null
  const routePath = createDirectoryRoutePath(
    isSectionIndex && sectionId ? `/section/${sectionId}` : `/docs/${slug}`,
  )
  const parsed = renderMarkdown(source, {
    absolutePath,
    appBase,
    docsRoot: docsSource.root,
    sourceMountPath: docsSource.mountPath,
  })
  const title = parsed.title || humanizeSegment(path.basename(relativePath, '.md'))
  const summary = parsed.summary || createSummary(extractPlainText(source))
  const detail: DocDetail = {
    id: slug,
    sourceId: docsSource.id,
    sourceName: docsSource.displayName,
    sourceLabel: docsSource.sourceLabel,
    sourceMountPath: docsSource.mountPath,
    sectionId,
    sectionTitle: relativeSectionId ? humanizeSegment(relativeSectionId) : null,
    isSectionIndex,
    slug,
    routePath,
    title,
    sourcePath: normalizePath(`${docsSource.sourceLabel}/${relativePath}`),
    absolutePath,
    summary,
    updatedAt: String(Math.floor(fs.statSync(absolutePath).mtimeMs / 1000)),
    html: parsed.html,
    headings: parsed.headings
      .filter((heading): heading is DocHeading => heading.level === 2 || heading.level === 3),
    order: 0,
    prevSlug: null,
    nextSlug: null,
  }

  return {
    assets: parsed.assets,
    detail,
    plainText: extractPlainText(source),
  }
}

function renderMarkdown(
  source: string,
  context: {
    absolutePath: string
    appBase: string
    docsRoot: string
    sourceMountPath: string
  },
): {
  assets: StaticAsset[]
  headings: HeadingMeta[]
  html: string
  summary: string
  title: string
} {
  const assetMap = new Map<string, StaticAsset>()
  const headingCount = new Map<string, number>()
  const headings: HeadingMeta[] = []
  const markdown = new MarkdownIt({
    html: false,
    highlight(code, language) {
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
      const rewritten = rewriteHref(
        href,
        context.absolutePath,
        context.docsRoot,
        context.sourceMountPath,
        context.appBase,
      )
      token.attrSet('href', rewritten)

      if (/^https?:\/\//i.test(rewritten)) {
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
      const rewritten = rewriteImageSource(
        src,
        context.absolutePath,
        context.docsRoot,
        context.sourceMountPath,
        context.appBase,
      )
      token.attrSet('src', rewritten.src)

      if (rewritten.asset) {
        assetMap.set(rewritten.asset.outputPath, rewritten.asset)
      }
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
      a: ['href', 'rel', 'target'],
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
  })

  const title = headings.find((heading) => heading.level === 1)?.text ?? ''
  const summary = createSummary(findFirstParagraph(source) || extractPlainText(source))

  return {
    assets: Array.from(assetMap.values()),
    headings,
    html: stripLeadingTitleHeading(sanitized),
    summary,
    title,
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
  appBase: string,
): string {
  if (href.startsWith('#') || /^mailto:/i.test(href)) {
    return href
  }

  if (/^https?:\/\//i.test(href)) {
    return href
  }

  const [rawTarget, hash = ''] = href.split('#')
  if (!markdownExtensionPattern.test(rawTarget)) {
    return href
  }

  const decoded = decodeURIComponent(rawTarget)
  const resolved = path.resolve(path.dirname(absolutePath), decoded)
  const relativeTarget = normalizePath(path.relative(docsRoot, resolved))

  if (relativeTarget.startsWith('..')) {
    return href
  }

  const isReadme = path.basename(relativeTarget).toLowerCase() === 'readme.md'
  const isSectionReadme = isReadme && relativeTarget.includes('/')
  const relativeSlug = isSectionReadme
    ? normalizePath(path.dirname(relativeTarget))
    : relativeTarget.replace(markdownExtensionPattern, '')

  const route = isSectionReadme
    ? createDirectoryRoutePath(`/section/${buildScopedPath(sourceMountPath, relativeSlug)}`)
    : createDirectoryRoutePath(`/docs/${buildScopedPath(sourceMountPath, relativeSlug)}`)

  const publicRoute = resolvePublicPath(appBase, route)
  return hash ? `${publicRoute}#${hash}` : publicRoute
}

function rewriteImageSource(
  src: string,
  absolutePath: string,
  docsRoot: string,
  sourceMountPath: string,
  appBase: string,
): {
  asset: StaticAsset | null
  src: string
} {
  if (
    src.startsWith('#') ||
    src.startsWith('/') ||
    /^data:/i.test(src) ||
    /^https?:\/\//i.test(src) ||
    /^\/\//.test(src)
  ) {
    return { asset: null, src }
  }

  const { hash, pathname, search } = splitUrlReference(src)
  if (!pathname) {
    return { asset: null, src }
  }

  const decoded = decodeURIComponent(pathname)
  const resolved = path.resolve(path.dirname(absolutePath), decoded)
  const relativeTarget = normalizePath(path.relative(docsRoot, resolved))

  if (relativeTarget.startsWith('..') || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return { asset: null, src }
  }

  const outputPath = getDocAssetOutputPath(sourceMountPath, relativeTarget)
  const publicPath = resolvePublicPath(appBase, outputPath)
  return {
    asset: {
      absolutePath: resolved,
      outputPath,
      publicPath,
    },
    src: `${publicPath}${search}${hash}`,
  }
}

function splitUrlReference(value: string): {
  hash: string
  pathname: string
  search: string
} {
  const hashIndex = value.indexOf('#')
  const queryIndex = value.indexOf('?')
  const cutoffCandidates = [hashIndex, queryIndex].filter((index) => index >= 0)
  const cutoff = cutoffCandidates.length > 0 ? Math.min(...cutoffCandidates) : value.length
  const pathname = value.slice(0, cutoff)
  const suffix = value.slice(cutoff)
  const queryStart = suffix.indexOf('?')
  const hashStart = suffix.indexOf('#')

  return {
    hash: hashStart >= 0 ? suffix.slice(hashStart) : '',
    pathname,
    search:
      queryStart >= 0
        ? suffix.slice(queryStart, hashStart >= 0 && hashStart > queryStart ? hashStart : undefined)
        : '',
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

function collectMarkdownFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true })
  const files = entries.flatMap((entry) => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      return collectMarkdownFiles(absolutePath)
    }

    if (entry.isFile() && markdownExtensionPattern.test(entry.name)) {
      return [absolutePath]
    }

    return []
  })

  return files.sort(compareAbsoluteDocPaths)
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

function getDocContentAssetPath(slug: string): string {
  const segments = slug.split('/').map((segment) => encodeURIComponent(segment))
  return `${CONTENT_PREFIX}${segments.join('/')}.json`
}

function getDocAssetOutputPath(sourceMountPath: string, relativeAssetPath: string): string {
  const encodedPath = [sourceMountPath, ...relativeAssetPath.split('/')]
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${ASSET_PREFIX}${encodedPath}`
}

function decodeDocSlugFromPath(pathname: string): string | null {
  const relativePath = pathname.slice(CONTENT_PREFIX.length, -'.json'.length)
  if (!relativePath) {
    return null
  }

  return relativePath
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/')
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

function resolvePublicPath(appBase: string, pathname: string): string {
  const normalizedBase = normalizeBasePath(appBase)
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const trimmedBase = normalizedBase === '/' ? '' : normalizedBase.replace(/\/$/, '')

  return `${trimmedBase}${normalizedPathname}` || normalizedPathname
}

function stripBasePath(pathname: string, appBase: string): string {
  const normalizedBase = normalizeBasePath(appBase)

  if (normalizedBase === '/' || pathname === normalizedBase.slice(0, -1)) {
    return pathname
  }

  if (pathname.startsWith(normalizedBase)) {
    const stripped = pathname.slice(normalizedBase.length - 1)
    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }

  return pathname
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/')
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim()

  if (!trimmed || trimmed === '/') {
    return '/'
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

function getContentType(absolutePath: string): string {
  const extension = path.extname(absolutePath).toLowerCase()

  switch (extension) {
    case '.apng':
      return 'image/apng'
    case '.avif':
      return 'image/avif'
    case '.bmp':
      return 'image/bmp'
    case '.gif':
      return 'image/gif'
    case '.ico':
      return 'image/x-icon'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function compareAbsoluteDocPaths(left: string, right: string): number {
  return comparePathSegments(normalizePath(left), normalizePath(right))
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
  const basename = decodedSegment.replace(markdownExtensionPattern, '')

  return {
    isReadme: basename.toLowerCase() === 'readme',
    sortValue: basename,
  }
}
