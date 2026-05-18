import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { resolveDocsConfig } from '../web/scripts/docsConfig'
import { createDocsDataPlugin } from '../web/scripts/docsData'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const docsConfig = resolveDocsConfig(projectRoot, {})

  return {
    plugins: [
      vue(),
      createDocsDataPlugin({
        appBase: '/',
        docsConfig,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, 'src'),
      },
    },
  }
})
