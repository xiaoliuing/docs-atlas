import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { scrollBehavior, routes } from './app/router'
import { ensureRouteData, hydrateDocsContent, serializeDocsContent } from './composables/useDocsContent'
import { docs, sections } from 'virtual:docs-data'
import './assets/main.css'

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior,
  },
  async (context) => {
    const { initialState, isClient, onSSRAppRendered, router } = context

    if (isClient) {
      hydrateDocsContent(initialState.docsCms)
    }

    router.beforeEach(async (to) => {
      await ensureRouteData(to)
    })

    if (import.meta.env.SSR) {
      onSSRAppRendered?.(() => {
        initialState.docsCms = serializeDocsContent()
      })
    }
  },
)

export function includedRoutes() {
  const sectionPaths = sections.map((section) => section.routePath)
  const docPaths = docs.map((doc) => doc.routePath).filter((routePath) => !sectionPaths.includes(routePath))

  return ['/', ...sectionPaths, ...docPaths]
}
