import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

const DEFAULT_DOCS_DIR = './docs'
const CONFIG_FILE_CANDIDATES = [
  'config.yaml',
  'config.yml',
  'docs-atlas.config.yaml',
  'docs-atlas.config.yml',
  'docs-cms.config.yaml',
  'docs-cms.config.yml',
]

type DocsSourceInput =
  | string
  | {
      name?: string
      path: string
    }

type DocsNodeObjectInput = {
  name?: string
  path?: string
  items?: DocsTreeInput[]
  children?: DocsTreeInput[]
  groups?: DocsNodeObjectInput[]
  sources?: DocsTreeInput[]
}

type DocsTreeInput = DocsSourceInput | DocsNodeObjectInput

type DocsConfigScope = {
  items?: DocsTreeInput[]
  children?: DocsTreeInput[]
  groups?: DocsNodeObjectInput[]
  sources?: DocsTreeInput[]
}

type DocsConfigFile = {
  docs?: DocsConfigScope | DocsTreeInput[]
  items?: DocsTreeInput[]
  children?: DocsTreeInput[]
  groups?: DocsNodeObjectInput[]
  sources?: DocsTreeInput[]
}

type DocsTrailItem = {
  id: string
  mountPath: string
  name: string
}

export type DocsSource = {
  id: string
  displayName: string
  sourceLabel: string
  mountPath: string
  root: string
}

export type DocsSourceTreeNode = {
  id: string
  name: string
  mountPath: string
  isSource: boolean
  sourceId: string | null
  sourceLabel: string | null
  children: DocsSourceTreeNode[]
}

export type ResolvedDocsConfig = {
  sourceGroups: DocsSourceTreeNode[]
  sources: DocsSource[]
}

export function resolveDocsConfig(
  projectRoot: string,
  env: Record<string, string | undefined>,
): ResolvedDocsConfig {
  const configPath = findDocsConfigFile(projectRoot)

  if (configPath) {
    return resolveFromYaml(configPath, projectRoot)
  }

  const envDocsDir = env.DOCS_CMS_DOCS_DIR?.trim()
  const fallbackSource = envDocsDir
    ? { path: envDocsDir }
    : { path: DEFAULT_DOCS_DIR, name: 'docs' }

  return normalizeConfigEntries([fallbackSource], projectRoot)
}

function findDocsConfigFile(projectRoot: string): string | null {
  for (const filename of CONFIG_FILE_CANDIDATES) {
    const absolutePath = path.resolve(projectRoot, filename)
    if (fs.existsSync(absolutePath)) {
      return absolutePath
    }
  }

  return null
}

function resolveFromYaml(configPath: string, projectRoot: string): ResolvedDocsConfig {
  const rawConfig = fs.readFileSync(configPath, 'utf8')
  const parsed = parse(rawConfig) as DocsConfigFile | null
  const scope = parsed?.docs ?? parsed ?? null
  const entries = extractScopeEntries(scope)

  if (entries.length === 0) {
    throw new Error(
      `[docs-atlas] ${path.basename(configPath)} must define at least one docs source.`,
    )
  }

  return normalizeConfigEntries(entries, projectRoot)
}

function normalizeConfigEntries(entries: DocsTreeInput[], projectRoot: string): ResolvedDocsConfig {
  const sources: DocsSource[] = []
  const occupiedMountPaths = new Map<string, string>()

  const sourceGroups = entries.map((entry, index) =>
    normalizeTreeEntry(entry, {
      parentMountPath: '',
      projectRoot,
      siblingIndex: index,
      trail: [],
      occupiedMountPaths,
      sources,
    }),
  )

  return {
    sourceGroups,
    sources,
  }
}

function normalizeTreeEntry(
  entry: DocsTreeInput,
  context: {
    parentMountPath: string
    projectRoot: string
    siblingIndex: number
    trail: DocsTrailItem[]
    occupiedMountPaths: Map<string, string>
    sources: DocsSource[]
  },
): DocsSourceTreeNode {
  if (isSourceInput(entry)) {
    return normalizeSourceNode(entry, context)
  }

  return normalizeGroupNode(entry, context)
}

function normalizeGroupNode(
  groupInput: DocsNodeObjectInput,
  context: {
    parentMountPath: string
    projectRoot: string
    siblingIndex: number
    trail: DocsTrailItem[]
    occupiedMountPaths: Map<string, string>
    sources: DocsSource[]
  },
): DocsSourceTreeNode {
  const displayName = groupInput.name?.trim()
  if (!displayName) {
    throw new Error('[docs-atlas] Every docs group must define a non-empty name.')
  }

  const mountSegment = createMountSegment(displayName, 'group', context.siblingIndex)
  const mountPath = joinMountPath(context.parentMountPath, mountSegment)
  const nodeId = `group:${mountPath}`
  assertMountPathAvailable(context.occupiedMountPaths, mountPath, `group "${displayName}"`)
  const nextTrail = [
    ...context.trail,
    {
      id: nodeId,
      mountPath,
      name: displayName,
    },
  ]

  const childEntries = extractScopeEntries(groupInput)
  const children = childEntries.map((childEntry, childIndex) =>
    normalizeTreeEntry(childEntry, {
      ...context,
      parentMountPath: mountPath,
      siblingIndex: childIndex,
      trail: nextTrail,
    }),
  )

  return {
    id: nodeId,
    name: displayName,
    mountPath,
    isSource: false,
    sourceId: null,
    sourceLabel: null,
    children,
  }
}

function normalizeSourceNode(
  sourceInput: DocsSourceInput,
  context: {
    parentMountPath: string
    projectRoot: string
    siblingIndex: number
    trail: DocsTrailItem[]
    occupiedMountPaths: Map<string, string>
    sources: DocsSource[]
  },
): DocsSourceTreeNode {
  const sourceConfig = typeof sourceInput === 'string' ? { path: sourceInput } : sourceInput
  const rawPath = sourceConfig.path?.trim()

  if (!rawPath) {
    throw new Error('[docs-atlas] Docs source is missing a path.')
  }

  const root = path.isAbsolute(rawPath) ? rawPath : path.resolve(context.projectRoot, rawPath)

  if (!fs.existsSync(root)) {
    throw new Error(`[docs-atlas] Markdown docs directory does not exist: ${root}`)
  }

  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`[docs-atlas] Docs source must point to a directory: ${root}`)
  }

  const displayName = sourceConfig.name?.trim() || inferDisplayName(rawPath, root, context.siblingIndex)
  const mountSegment = createMountSegment(displayName, 'source', context.siblingIndex)
  const mountPath = joinMountPath(context.parentMountPath, mountSegment)
  const sourceId = `source:${mountPath}`
  const sourceLabel = [...context.trail.map((item) => item.name), displayName].join(' / ')

  assertMountPathAvailable(context.occupiedMountPaths, mountPath, `source "${sourceLabel}"`)

  const source: DocsSource = {
    id: sourceId,
    displayName,
    sourceLabel,
    mountPath,
    root,
  }

  context.sources.push(source)

  return {
    id: sourceId,
    name: displayName,
    mountPath,
    isSource: true,
    sourceId,
    sourceLabel,
    children: [],
  }
}

function extractScopeEntries(scope: DocsConfigScope | DocsTreeInput[] | null | undefined): DocsTreeInput[] {
  if (Array.isArray(scope)) {
    return scope
  }

  if (!scope || typeof scope !== 'object') {
    return []
  }

  if (Array.isArray(scope.items) && scope.items.length > 0) {
    return scope.items
  }

  if (Array.isArray(scope.children) && scope.children.length > 0) {
    return scope.children
  }

  const groups = Array.isArray(scope.groups) ? scope.groups : []
  const sources = Array.isArray(scope.sources) ? scope.sources : []
  return [...groups, ...sources]
}

function isSourceInput(entry: DocsTreeInput): entry is DocsSourceInput {
  if (typeof entry === 'string') {
    return true
  }

  return typeof entry === 'object' && entry !== null && typeof entry.path === 'string'
}

function inferDisplayName(rawPath: string, resolvedPath: string, index: number): string {
  const clean = rawPath.replace(/[\\/]+$/, '')
  const basename = path.basename(clean)

  if (basename && basename !== '.' && basename !== path.sep) {
    return basename
  }

  const fallback = path.basename(resolvedPath)
  return fallback || `docs-source-${index + 1}`
}

function createMountSegment(displayName: string, kind: 'group' | 'source', index: number): string {
  const normalized = displayName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `${kind}-${index + 1}`
}

function joinMountPath(parentMountPath: string, mountSegment: string): string {
  return [parentMountPath, mountSegment].filter(Boolean).join('/')
}

function assertMountPathAvailable(
  occupiedMountPaths: Map<string, string>,
  mountPath: string,
  label: string,
) {
  const previous = occupiedMountPaths.get(mountPath)
  if (previous) {
    throw new Error(
      `[docs-atlas] Duplicate docs name detected after normalization.\n` +
        `Both ${previous} and ${label} resolve to "${mountPath}".\n` +
        'Please give each docs group/source a unique name in config.yaml.',
    )
  }

  occupiedMountPaths.set(mountPath, label)
}
