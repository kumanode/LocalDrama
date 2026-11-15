import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import messages from '../src/i18n/messages.js'
import { walkSourceFiles, fs } from './helpers/sourceScan.js'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../src')

// `t('a.b')`, `i18nT("a.b")` and `$t(`a.b`)`. The lookbehind keeps property
// access such as `format.t('x')` from being mistaken for a call.
const KEY_PATTERN = /(?<![.\w$])(?:i18nT|\$t|t)\(\s*['"`]([A-Za-z][\w]*(?:\.[\w]+)*)['"`]/g

function getNestedValue(obj, key) {
  let current = obj
  for (const part of key.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

function collectUsedKeys() {
  const used = new Map()
  for (const file of walkSourceFiles(srcDir)) {
    const relative = path.relative(srcDir, file).replace(/\\/g, '/')
    if (relative.startsWith('i18n/')) continue
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(KEY_PATTERN)) {
      const key = match[1]
      if (!key.includes('.')) continue
      if (!used.has(key)) used.set(key, new Set())
      used.get(key).add(relative)
    }
  }
  return used
}

const usedKeys = collectUsedKeys()

test('i18n-keys: every referenced key exists in both dictionaries', () => {
  const missing = []
  for (const [key, files] of [...usedKeys].sort(([a], [b]) => a.localeCompare(b))) {
    const where = [...files].slice(0, 2).join(', ')
    for (const lang of ['zh', 'en']) {
      const value = getNestedValue(messages[lang], key)
      if (typeof value !== 'string') missing.push(`${key} (${lang}) <- ${where}`)
    }
  }

  assert.deepEqual(
    missing,
    [],
    [
      'These translation keys are used in the source but are not defined.',
      'Add them to frontweb/src/i18n/locales/{zh,en}.js (or the *.ui.js fragments).',
      '',
      ...missing,
    ].join('\n'),
  )
})

test('i18n-keys: dictionaries stay symmetric', () => {
  const flat = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([key, value]) => {
      const full = prefix ? `${prefix}.${key}` : key
      return value && typeof value === 'object' ? flat(value, full) : [[full, value]]
    })

  const zhKeys = new Set(flat(messages.zh).map(([key]) => key))
  const enKeys = new Set(flat(messages.en).map(([key]) => key))

  const onlyZh = [...zhKeys].filter((key) => !enKeys.has(key)).sort()
  const onlyEn = [...enKeys].filter((key) => !zhKeys.has(key)).sort()

  assert.deepEqual(
    { onlyZh, onlyEn },
    { onlyZh: [], onlyEn: [] },
    'Both locale dictionaries must define the same keys.',
  )
})
