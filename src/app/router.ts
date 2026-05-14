import type { RouterScrollBehavior, RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import SectionView from '@/views/SectionView.vue'
import DocView from '@/views/DocView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/section/:section(.*)',
    name: 'section',
    component: SectionView,
  },
  {
    path: '/docs/:slug(.*)',
    name: 'doc',
    component: DocView,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]

export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition
  }

  if (to.hash) {
    return {
      el: to.hash,
      top: 96,
      behavior: 'smooth',
    }
  }

  if (to.path !== from.path) {
    return { top: 0 }
  }

  return undefined
}
