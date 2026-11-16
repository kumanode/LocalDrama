import { ref, computed } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import enLocale from 'element-plus/dist/locale/en.mjs'
import messages from './messages.js'
import request from '../utils/request.js'

const STORAGE_KEY = 'app_locale'

// Vite statically replaces `import.meta.env.DEV`. The guard keeps the module
// importable from plain Node (unit tests) where `import.meta.env` is undefined.
const IS_DEV = (() => {
  try {
    return Boolean(import.meta.env && import.meta.env.DEV)
  } catch (_) {
    return false
  }
})()

// Keys already reported in this session, so a missing key warns only once.
const reportedMissingKeys = new Set()

let devModeOverride = null

/** Test hook: force dev/prod resolution without a Vite build. */
export function setDevModeForTesting(value) {
  devModeOverride = value === null ? null : Boolean(value)
}

function isDevEnabled() {
  return devModeOverride === null ? IS_DEV : devModeOverride
}

export function getMissingKeys() {
  return [...reportedMissingKeys]
}

export function resetMissingKeys() {
  reportedMissingKeys.clear()
}

function missing(key) {
  if (!reportedMissingKeys.has(key)) {
    reportedMissingKeys.add(key)
    console.warn(`[i18n] missing key: ${key} (locale: ${currentLocale.value})`)
  }
  // Marker is intentionally loud so leaks are obvious during development.
  return `⟦missing:${key}⟧`
}

function getStorage(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key)
    }
  } catch (_) {}
  return null
}

function setStorage(key, val) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, val)
    }
  } catch (_) {}
}

const savedLocale = getStorage(STORAGE_KEY)
export const currentLocale = ref(savedLocale === 'en' ? 'en' : 'zh')

function applyDocumentLang(lang) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }
}
applyDocumentLang(currentLocale.value)

export const elementLocale = computed(() => {
  return currentLocale.value === 'en' ? enLocale : zhCn
})

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

export function t(key, params = {}) {
  const lang = currentLocale.value
  let val = getNestedValue(messages[lang], key)

  if (val === undefined) {
    if (isDevEnabled()) {
      // Development has no cross-language fallback: a missing key must be
      // visible immediately instead of silently resolving to Chinese.
      return missing(key)
    }
    // Production falls back to English only — never to Chinese. This keeps an
    // English UI from turning Chinese just because one key is missing.
    val = getNestedValue(messages.en, key)
  }

  if (val === undefined) return isDevEnabled() ? missing(key) : key
  if (typeof val !== 'string') return val

  // Interpolation: replace {name} with params.name
  if (params && typeof params === 'object') {
    return val.replace(/\{(\w+)\}/g, (match, pName) => {
      return params[pName] !== undefined ? String(params[pName]) : match
    })
  }

  return val
}

export function te(key, locale = currentLocale.value) {
  const dict = messages[locale] || messages.en || {}
  return getNestedValue(dict, key) !== undefined
}

export async function setLocale(lang) {
  if (lang !== 'zh' && lang !== 'en') return
  currentLocale.value = lang
  setStorage(STORAGE_KEY, lang)
  applyDocumentLang(lang)
  if (typeof window === 'undefined') return
  try {
    if (request && typeof request.put === 'function') {
      await request.put('/settings/language', { language: lang })
    }
  } catch (err) {
    console.warn('Failed to sync language to backend:', err?.message)
  }
}

export async function initLocaleFromBackend() {
  try {
    if (request && typeof request.get === 'function') {
      const res = await request.get('/settings/language')
      const backendLang = res?.language
      if (backendLang && (backendLang === 'zh' || backendLang === 'en')) {
        const stored = getStorage(STORAGE_KEY)
        if (!stored) {
          currentLocale.value = backendLang
          applyDocumentLang(backendLang)
        }
      }
    }
  } catch (err) {
    // Non-fatal if backend settings call fails on startup
  }
}

export function useI18n() {
  return {
    locale: currentLocale,
    t,
    te,
    setLocale,
    elementLocale,
  }
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
    app.config.globalProperties.$te = te
    app.config.globalProperties.$locale = currentLocale
    app.provide('i18n', {
      locale: currentLocale,
      t,
      te,
      setLocale,
      elementLocale,
    })
  },
}
