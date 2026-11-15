import test from 'node:test'
import assert from 'node:assert/strict'
import { messages } from '../src/i18n/messages.js'
import { t, currentLocale, setLocale, setDevModeForTesting, getMissingKeys, resetMissingKeys } from '../src/i18n/index.js'

test('i18n core - translation in zh and en', async () => {
  currentLocale.value = 'zh'
  assert.equal(t('common.save'), '保存')
  assert.equal(t('header.appTitle'), '本地短剧助手')

  currentLocale.value = 'en'
  assert.equal(t('common.save'), 'Save')
  assert.equal(t('header.appTitle'), 'LocalMiniDrama')
})

test('i18n core - interpolation', () => {
  currentLocale.value = 'zh'
  assert.equal(t('filmList.projectCount', { count: 5 }), '5 个项目')

  currentLocale.value = 'en'
  assert.equal(t('filmList.projectCount', { count: 5 }), '5 Projects')
})

test('i18n core - fallback to alternative locale if key missing', () => {
  currentLocale.value = 'en'
  assert.equal(t('nonexistent.path.key'), 'nonexistent.path.key')
})

test('i18n core - development mode reports missing keys loudly instead of falling back', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (msg) => warnings.push(String(msg))
  try {
    setDevModeForTesting(true)
    resetMissingKeys()
    currentLocale.value = 'en'

    assert.equal(t('nonexistent.path.key'), '⟦missing:nonexistent.path.key⟧')
    // Warns once per key, not once per render.
    assert.equal(t('nonexistent.path.key'), '⟦missing:nonexistent.path.key⟧')
    assert.equal(warnings.filter((w) => w.includes('nonexistent.path.key')).length, 1)
    assert.deepEqual(getMissingKeys(), ['nonexistent.path.key'])
  } finally {
    console.warn = originalWarn
    setDevModeForTesting(null)
    resetMissingKeys()
    currentLocale.value = 'zh'
  }
})

test('i18n core - production never falls back to Chinese', () => {
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    setDevModeForTesting(false)
    currentLocale.value = 'zh'
    // Missing in both locales: the key itself is returned, never zh text.
    assert.equal(t('nonexistent.path.key'), 'nonexistent.path.key')
    // A real key still resolves normally.
    assert.equal(t('common.save'), '保存')
  } finally {
    console.warn = originalWarn
    setDevModeForTesting(null)
    currentLocale.value = 'zh'
  }
})

function getLeafKeys(obj, prefix = '') {
  let keys = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeys(v, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

test('i18n dictionaries - 100% key parity between zh and en', () => {
  const zhKeys = getLeafKeys(messages.zh).sort()
  const enKeys = getLeafKeys(messages.en).sort()

  const missingInEn = zhKeys.filter((k) => !enKeys.includes(k))
  const extraInEn = enKeys.filter((k) => !zhKeys.includes(k))

  assert.deepEqual(missingInEn, [], `Keys present in zh but missing in en: ${missingInEn.join(', ')}`)
  assert.deepEqual(extraInEn, [], `Keys present in en but missing in zh: ${extraInEn.join(', ')}`)
})
