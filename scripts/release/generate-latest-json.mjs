#!/usr/bin/env node

import * as fs from 'node:fs/promises'
import path from 'node:path'

const args = new Map()

for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index]

  if (!token.startsWith('--')) {
    continue
  }

  const next = process.argv[index + 1]

  if (!next || next.startsWith('--')) {
    args.set(token.slice(2), true)
    continue
  }

  args.set(token.slice(2), next)
  index += 1
}

const dryRun = Boolean(args.get('dry-run'))
const output = typeof args.get('output') === 'string' ? args.get('output') : ''
const repoArg = args.get('repo') ?? process.env.GITHUB_REPOSITORY
const token = args.get('token') ?? process.env.GITHUB_TOKEN
const tag = args.get('tag') ?? process.env.GITHUB_REF_NAME
const apiBaseUrl = (args.get('api-base-url') ?? process.env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '')

if (!repoArg) {
  throw new Error('Missing repository. Pass --repo owner/name or set GITHUB_REPOSITORY.')
}

if (!tag) {
  throw new Error('Missing tag. Pass --tag desktop-vx.y.z or set GITHUB_REF_NAME.')
}

const [owner, repo] = repoArg.split('/')

if (!owner || !repo) {
  throw new Error(`Invalid repository: ${repoArg}`)
}

const releaseUrl = `${apiBaseUrl}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
const release = await githubFetchJson(releaseUrl, token)

const assets = Array.isArray(release.assets) ? release.assets : []
const assetsByName = new Map(assets.map((asset) => [asset.name, asset]))
const latestAsset = assetsByName.get('latest.json')

const platforms = {}
const primaryPriority = {
  app: 100,
  appimage: 100,
  msi: 100,
  nsis: 90,
  deb: 80,
  rpm: 70,
}
const primaryAssignments = new Map()

for (const asset of assets) {
  if (!asset.name.endsWith('.sig')) {
    continue
  }

  const baseName = asset.name.slice(0, -4)
  const releaseAsset = assetsByName.get(baseName)

  if (!releaseAsset) {
    continue
  }

  const target = parseUpdaterAsset(baseName)

  if (!target) {
    continue
  }

  const signature = await githubFetchText(asset.browser_download_url, token)

  for (const fullKey of target.fullKeys) {
    registerPlatform(platforms, fullKey, signature, releaseAsset.browser_download_url)
  }

  if (target.primaryKeys.length > 0) {
    const currentPriority = primaryPriority[target.installer] ?? 0

    for (const primaryKey of target.primaryKeys) {
      const assigned = primaryAssignments.get(primaryKey)

      if (!assigned || currentPriority > assigned.priority) {
        primaryAssignments.set(primaryKey, {
          priority: currentPriority,
          signature,
          url: releaseAsset.browser_download_url,
        })
      }
    }
  }
}

for (const [primaryKey, assignment] of primaryAssignments.entries()) {
  registerPlatform(platforms, primaryKey, assignment.signature, assignment.url)
}

if (Object.keys(platforms).length === 0) {
  throw new Error(`No updater platforms were derived from release assets for ${tag}.`)
}

const manifest = {
  version: normalizeVersion(release.tag_name),
  notes: release.body ?? '',
  pub_date: release.published_at ?? new Date().toISOString(),
  platforms,
}

const manifestContent = JSON.stringify(manifest, null, 2)

if (output) {
  const outputPath = path.resolve(process.cwd(), output)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${manifestContent}\n`, 'utf8')
}

if (dryRun) {
  console.log(manifestContent)
  process.exit(0)
}

if (!token) {
  throw new Error('Missing GITHUB_TOKEN. The upload step requires an authenticated token.')
}

if (latestAsset) {
  await githubFetch(`${apiBaseUrl}/repos/${owner}/${repo}/releases/assets/${latestAsset.id}`, {
    method: 'DELETE',
    token,
  })
}

const uploadUrl = String(release.upload_url).replace(/\{.*$/, '')
await githubFetch(`${uploadUrl}?name=${encodeURIComponent('latest.json')}`, {
  method: 'POST',
  token,
  headers: {
    'content-type': 'application/json',
  },
  body: manifestContent,
})

console.log(
  `Uploaded latest.json for ${tag} with platforms: ${Object.keys(platforms).sort().join(', ')}`,
)

function normalizeVersion(tagName) {
  return String(tagName).replace(/^desktop-v/, '')
}

function registerPlatform(platformMap, key, signature, url) {
  platformMap[key] = {
    signature: signature.trim(),
    url,
  }
}

function parseUpdaterAsset(assetName) {
  if (assetName.endsWith('.AppImage')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    return {
      installer: 'appimage',
      fullKeys: [`linux-${arch}-appimage`],
      primaryKeys: [`linux-${arch}`],
    }
  }

  if (assetName.endsWith('.deb')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    return {
      installer: 'deb',
      fullKeys: [`linux-${arch}-deb`],
      primaryKeys: [],
    }
  }

  if (assetName.endsWith('.rpm')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    return {
      installer: 'rpm',
      fullKeys: [`linux-${arch}-rpm`],
      primaryKeys: [],
    }
  }

  if (assetName.endsWith('.app.tar.gz')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    if (arch === 'universal') {
      return {
        installer: 'app',
        fullKeys: ['darwin-aarch64-app', 'darwin-x86_64-app'],
        primaryKeys: ['darwin-aarch64', 'darwin-x86_64'],
      }
    }

    return {
      installer: 'app',
      fullKeys: [`darwin-${arch}-app`],
      primaryKeys: [`darwin-${arch}`],
    }
  }

  if (assetName.endsWith('.msi')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    return {
      installer: 'msi',
      fullKeys: [`windows-${arch}-msi`],
      primaryKeys: [`windows-${arch}`],
    }
  }

  if (assetName.endsWith('.exe')) {
    const arch = parseArch(assetName)

    if (!arch) {
      return null
    }

    return {
      installer: 'nsis',
      fullKeys: [`windows-${arch}-nsis`],
      primaryKeys: [`windows-${arch}`],
    }
  }

  return null
}

function parseArch(assetName) {
  const normalized = assetName.toLowerCase()

  if (normalized.includes('aarch64') || normalized.includes('arm64')) {
    return 'aarch64'
  }

  if (normalized.includes('x86_64') || normalized.includes('amd64') || normalized.includes('x64')) {
    return 'x86_64'
  }

  if (normalized.includes('universal')) {
    return 'universal'
  }

  if (normalized.includes('i686') || normalized.includes('x86')) {
    return 'i686'
  }

  if (normalized.includes('armv7') || normalized.includes(' arm ')) {
    return 'armv7'
  }

  return null
}

async function githubFetchJson(url, authToken) {
  const response = await githubFetch(url, {
    token: authToken,
    headers: {
      accept: 'application/vnd.github+json',
    },
  })

  return response.json()
}

async function githubFetchText(url, authToken) {
  const response = await githubFetch(url, { token: authToken })
  return response.text()
}

async function githubFetch(url, options = {}) {
  const headers = new Headers(options.headers ?? {})

  if (options.token) {
    headers.set('authorization', `Bearer ${options.token}`)
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${response.status} ${message}`)
  }

  return response
}
