import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { resolveDocsConfig } from './scripts/docsConfig'
import { createDocsDataPlugin } from './scripts/docsData'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const docsConfig = resolveDocsConfig(projectRoot, env)
  const appBase = resolveAppBase(env)

  return {
    base: appBase,
    plugins: [
      vue(),
      createDocsDataPlugin({
        appBase,
        docsConfig,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
      },
    },
    ssgOptions: {
      dirStyle: 'nested',
    },
  }
})

function resolveAppBase(env: Record<string, string | undefined>): string {
  const explicitBase = env.DOCS_ATLAS_BASE_PATH?.trim()
  if (explicitBase) {
    return normalizeBasePath(explicitBase)
  }

  if (env.GITHUB_PAGES === 'true') {
    const repositoryName = env.GITHUB_REPOSITORY?.split('/')[1] || 'docs-atlas'
    return normalizeBasePath(`/${repositoryName}/`)
  }

  return '/'
}

function normalizeBasePath(value: string): string {
  if (!value || value === '/') {
    return '/'
  }

  const normalized = value.startsWith('/') ? value : `/${value}`
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}
