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

type DocsConfigFile = {
  docs?: {
    sources?: DocsSourceInput[]
  }
  sources?: DocsSourceInput[]
}

export type DocsSource = {
  id: string
  displayName: string
  mountPath: string
  root: string
}

export function resolveDocsSources(projectRoot: string, env: Record<string, string | undefined>): DocsSource[] {
  const configPath = findDocsConfigFile(projectRoot)

  if (configPath) {
    return resolveSourcesFromYaml(configPath, projectRoot)
  }

  const envDocsDir = env.DOCS_CMS_DOCS_DIR?.trim()
  if (envDocsDir) {
    return ensureUniqueMountPaths([normalizeSource({ path: envDocsDir }, projectRoot, 0)])
  }

  return ensureUniqueMountPaths([normalizeSource({ path: DEFAULT_DOCS_DIR, name: 'docs' }, projectRoot, 0)])
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

function resolveSourcesFromYaml(configPath: string, projectRoot: string): DocsSource[] {
  const rawConfig = fs.readFileSync(configPath, 'utf8')
  const parsed = parse(rawConfig) as DocsConfigFile | null
  const sources = parsed?.docs?.sources ?? parsed?.sources ?? null

  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(
      `[docs-atlas] ${path.basename(configPath)} must define a non-empty sources list.`,
    )
  }

  return ensureUniqueMountPaths(sources.map((source, index) => normalizeSource(source, projectRoot, index)))
}

function normalizeSource(source: DocsSourceInput, projectRoot: string, index: number): DocsSource {
  const sourceConfig = typeof source === 'string' ? { path: source } : source
  const rawPath = sourceConfig.path?.trim()

  if (!rawPath) {
    throw new Error(`[docs-atlas] docs source #${index + 1} is missing a path.`)
  }

  const root = path.isAbsolute(rawPath) ? rawPath : path.resolve(projectRoot, rawPath)

  if (!fs.existsSync(root)) {
    throw new Error(`[docs-atlas] Markdown docs directory does not exist: ${root}`)
  }

  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`[docs-atlas] Docs source must point to a directory: ${root}`)
  }

  const displayName = sourceConfig.name?.trim() || inferDisplayName(rawPath, root, index)
  const mountPath = createMountPath(displayName, index)

  return {
    id: createSourceId(displayName, index),
    displayName,
    mountPath,
    root,
  }
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

function createSourceId(displayName: string, index: number): string {
  const normalized = createMountPath(displayName, index)

  return normalized ? `${normalized}-${index + 1}` : `docs-source-${index + 1}`
}

function createMountPath(displayName: string, index: number): string {
  const normalized = displayName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `docs-source-${index + 1}`
}

function ensureUniqueMountPaths(sources: DocsSource[]): DocsSource[] {
  const seen = new Map<string, string>()

  for (const source of sources) {
    const previous = seen.get(source.mountPath)
    if (previous) {
      throw new Error(
        `[docs-atlas] Duplicate docs source name detected after normalization: "${source.displayName}".\n` +
          `Both "${previous}" and "${source.displayName}" resolve to "${source.mountPath}".\n` +
          'Please give each source a unique name in config.yaml.',
      )
    }

    seen.set(source.mountPath, source.displayName)
  }

  return sources
}
