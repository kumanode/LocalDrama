import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { currentLocale, t } from '../i18n/index.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'list',
      component: () => import('@/views/FilmList.vue'),
      meta: { titleKey: 'routes.projectList' }
    },
    {
      path: '/drama/:id',
      name: 'drama-detail',
      component: () => import('@/views/DramaDetail.vue'),
      meta: { titleKey: 'routes.dramaDetail' }
    },
    {
      path: '/film/:id',
      name: 'film',
      component: () => import('@/views/FilmCreate.vue'),
      meta: { titleKey: 'routes.filmCreate' }
    },
    {
      path: '/film/:id/canvas',
      name: 'film-canvas',
      component: () => import('@/views/DramaCanvas.vue'),
      meta: { titleKey: 'routes.canvas' }
    },
    {
      path: '/ai-config',
      name: 'ai-config',
      component: () => import('@/views/AiConfig.vue'),
      meta: { titleKey: 'routes.aiConfig' }
    },
    {
      path: '/free-create',
      name: 'free-create',
      component: () => import('@/views/FreeCreate.vue'),
      meta: { titleKey: 'routes.freeCreate' }
    },
    {
      path: '/media-library',
      name: 'media-library',
      component: () => import('@/views/MediaLibrary.vue'),
      meta: { titleKey: 'routes.mediaLibrary' }
    }
  ]
})

const APP_NAME = 'LocalDrama'

function applyDocumentTitle(titleKey) {
  if (typeof document === 'undefined') return
  document.title = titleKey ? `${t(titleKey)} - ${APP_NAME}` : APP_NAME
  document.documentElement?.setAttribute?.('lang', currentLocale.value === 'en' ? 'en' : 'zh-CN')
}

let activeTitleKey = ''

router.beforeEach((to) => {
  activeTitleKey = to.meta?.titleKey || ''
  applyDocumentTitle(activeTitleKey)
  return true
})

// Keep the tab title and <html lang> in sync when the user switches language
// without navigating.
watch(currentLocale, () => applyDocumentTitle(activeTitleKey))

export default router
