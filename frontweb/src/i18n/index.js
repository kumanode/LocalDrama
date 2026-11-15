import { ref, computed } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import enLocale from 'element-plus/dist/locale/en.mjs'
import zh from './locales/zh.js'
import en from './locales/en.js'
import request from '../utils/request.js'

const STORAGE_KEY = 'app_locale'
const messages = { zh, en }

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
  
  // Fallback to alternative language if key is missing in active locale
  if (val === undefined) {
    const fallbackLang = lang === 'en' ? 'zh' : 'en'
    val = getNestedValue(messages[fallbackLang], key)
  }
  
  if (val === undefined) return key
  if (typeof val !== 'string') return val

  // Interpolation: replace {name} with params.name
  if (params && typeof params === 'object') {
    return val.replace(/\{(\w+)\}/g, (match, pName) => {
      return params[pName] !== undefined ? String(params[pName]) : match
    })
  }

  return val
}

export async function setLocale(lang) {
  if (lang !== 'zh' && lang !== 'en') return
  currentLocale.value = lang
  setStorage(STORAGE_KEY, lang)
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
    setLocale,
    elementLocale,
  }
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
    app.config.globalProperties.$locale = currentLocale
    app.provide('i18n', {
      locale: currentLocale,
      t,
      setLocale,
      elementLocale,
    })
  },
}
