import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { resolveDocsSources } from './scripts/docsConfig'
import { createDocsDataPlugin } from './scripts/docsData'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const docsSources = resolveDocsSources(projectRoot, env)

  return {
    plugins: [
      vue(),
      createDocsDataPlugin({
        docsSources,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
      },
    },
  }
})
