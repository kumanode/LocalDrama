import test from 'node:test'
import assert from 'node:assert/strict'
import zh from '../src/i18n/locales/zh.js'
import en from '../src/i18n/locales/en.js'
import { currentLocale, t, setLocale } from '../src/i18n/index.js'
import { generationStyleOptions, getStyleLabel } from '../src/constants/styleOptions.js'
import { CANVAS_NODE_STATUS_LABELS } from '../src/composables/useCanvasNodeStatus.js'

function getLeafEntries(obj, prefix = '') {
  let entries = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      entries = entries.concat(getLeafEntries(v, fullKey))
    } else {
      entries.push({ key: fullKey, value: String(v) })
    }
  }
  return entries
}

test('anti-leak: 100% key parity between zh and en dictionaries', () => {
  const zhEntries = getLeafEntries(zh)
  const enEntries = getLeafEntries(en)

  const zhKeys = zhEntries.map(e => e.key).sort()
  const enKeys = enEntries.map(e => e.key).sort()

  const missingInEn = zhKeys.filter(k => !enKeys.includes(k))
  const extraInEn = enKeys.filter(k => !zhKeys.includes(k))

  assert.deepEqual(missingInEn, [], `Keys present in zh but missing in en: ${missingInEn.join(', ')}`)
  assert.deepEqual(extraInEn, [], `Keys present in en but missing in zh: ${extraInEn.join(', ')}`)
  assert.equal(zhKeys.length, enKeys.length, 'Key counts must match exactly')
  assert.ok(zhKeys.length > 200, 'Dictionaries must contain comprehensive translations')
})

test('anti-leak: English dictionary has zero Chinese characters (0% leakage)', () => {
  const enEntries = getLeafEntries(en)
  const chineseRegex = /[\u4e00-\u9fa5]/
  const leaked = []

  for (const entry of enEntries) {
    if (chineseRegex.test(entry.value)) {
      leaked.push(`${entry.key}: "${entry.value}"`)
    }
  }

  assert.deepEqual(leaked, [], `Found Chinese characters leaked into English locale: \n${leaked.join('\n')}`)
})

test('anti-leak: Chinese dictionary has no untranslated raw key strings', () => {
  const zhEntries = getLeafEntries(zh)
  const rawKeyPattern = /^(common|header|filmList|filmCreate|dramaCanvas|dramaDetail|aiConfig|agent|styleOptions)\./
  const leaked = []

  for (const entry of zhEntries) {
    if (rawKeyPattern.test(entry.value)) {
      leaked.push(`${entry.key}: "${entry.value}"`)
    }
  }

  assert.deepEqual(leaked, [], `Found untranslated raw keys in Chinese dictionary: \n${leaked.join('\n')}`)
})

test('anti-leak: styleOptions provide complete English labels with no Chinese leakage', () => {
  const chineseRegex = /[\u4e00-\u9fa5]/
  assert.ok(generationStyleOptions.length > 0, 'Styles list must not be empty')

  for (const cat of generationStyleOptions) {
    assert.ok(cat.labelEn, `Category ${cat.label} must have labelEn`)
    assert.ok(!chineseRegex.test(cat.labelEn), `Category labelEn contains Chinese: "${cat.labelEn}"`)

    for (const opt of cat.options) {
      assert.ok(opt.labelEn, `Option ${opt.value} must have labelEn`)
      assert.ok(!chineseRegex.test(opt.labelEn), `Option ${opt.value} labelEn contains Chinese: "${opt.labelEn}"`)

      const enLabel = getStyleLabel(opt.value, 'en')
      assert.ok(enLabel, `getStyleLabel("${opt.value}", "en") must return label`)
      assert.ok(!chineseRegex.test(enLabel), `enLabel for ${opt.value} contains Chinese: "${enLabel}"`)
    }
  }

  // Also test custom style
  const customEn = getStyleLabel('custom', 'en')
  assert.ok(customEn, 'Custom style must return label')
  assert.ok(!chineseRegex.test(customEn), `custom labelEn contains Chinese: "${customEn}"`)
})

test('anti-leak: canvas node status labels reactive locale switching', () => {
  const chineseRegex = /[\u4e00-\u9fa5]/

  // Switch to English
  setLocale('en')
  assert.equal(currentLocale.value, 'en')
  for (const [key, label] of Object.entries(CANVAS_NODE_STATUS_LABELS)) {
    assert.ok(label, `Status label for ${key} in en must exist`)
    assert.ok(!chineseRegex.test(label), `Status label for ${key} in en contains Chinese: "${label}"`)
  }

  // Switch to Chinese
  setLocale('zh')
  assert.equal(currentLocale.value, 'zh')
  for (const [key, label] of Object.entries(CANVAS_NODE_STATUS_LABELS)) {
    assert.ok(label, `Status label for ${key} in zh must exist`)
  }
})
