import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  filmCreateScrollStorageKey,
  loadFilmCreateScrollPosition,
  saveFilmCreateScrollPosition,
} from '@/utils/filmCreateNavigation'

const NAV_AUTO_COLLAPSE_WIDTH = 960

// Anchors ordered by page position (must match navSteps anchor values)
const STEP_ANCHORS = [
  'anchor-script',
  'anchor-characters',
  'anchor-props',
  'anchor-scenes',
  'anchor-storyboard',
  'anchor-video',
  'anchor-export',
]

/**
 * 左侧导航折叠/展开逻辑
 */
export function useNavigation({ dramaId } = {}) {
  const navCollapsed = ref(false)
  const storyboardMenuExpanded = ref(false)
  const activeStepAnchor = ref('')
  let _navAutoCollapsed = false
  let scrollSaveTimer
  let spyTimer = null
  const getStorageKey = () => filmCreateScrollStorageKey(dramaId?.value ?? dramaId)

  function _syncNavCollapse() {
    const narrow = window.innerWidth < NAV_AUTO_COLLAPSE_WIDTH
    if (narrow && !_navAutoCollapsed && !navCollapsed.value) {
      _navAutoCollapsed = true
      navCollapsed.value = true
    } else if (!narrow && _navAutoCollapsed) {
      _navAutoCollapsed = false
      navCollapsed.value = false
    }
  }

  function toggleNav() {
    navCollapsed.value = !navCollapsed.value
    _navAutoCollapsed = false
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateActiveStep() {
    const scrollY = window.scrollY + 120 // header offset
    let best = ''
    for (const id of STEP_ANCHORS) {
      const el = document.getElementById(id)
      if (!el) continue
      if (el.getBoundingClientRect().top + window.scrollY <= scrollY + 1) best = id
    }
    activeStepAnchor.value = best
  }

  function onScroll() {
    clearTimeout(spyTimer)
    spyTimer = setTimeout(updateActiveStep, 80)
  }

  function scrollToAnchor(id) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function getSessionStorage() {
    try {
      return window.sessionStorage
    } catch (_) {
      return null
    }
  }

  function saveScrollPosition() {
    clearTimeout(scrollSaveTimer)
    scrollSaveTimer = setTimeout(() => {
      saveFilmCreateScrollPosition(getSessionStorage(), getStorageKey(), window.scrollY)
    }, 120)
  }

  function restoreScrollPosition() {
    const savedPosition = loadFilmCreateScrollPosition(getSessionStorage(), getStorageKey())
    if (savedPosition != null) window.scrollTo({ top: savedPosition, behavior: 'auto' })
  }

  onMounted(() => {
    _syncNavCollapse()
    window.addEventListener('resize', _syncNavCollapse)
    window.addEventListener('scroll', saveScrollPosition, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    updateActiveStep()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', _syncNavCollapse)
    window.removeEventListener('scroll', saveScrollPosition)
    window.removeEventListener('scroll', onScroll)
    clearTimeout(scrollSaveTimer)
    clearTimeout(spyTimer)
    saveFilmCreateScrollPosition(getSessionStorage(), getStorageKey(), window.scrollY)
  })

  return {
    navCollapsed,
    storyboardMenuExpanded,
    activeStepAnchor,
    toggleNav,
    scrollToTop,
    scrollToAnchor,
    restoreScrollPosition,
  }
}
