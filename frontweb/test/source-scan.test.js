import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  scanDirectory,
  scanFile,
  stripComments,
  loadAllowlist,
  formatHits,
  fs,
} from './helpers/sourceScan.js'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../src')
const allowlistPath = path.resolve(testDir, 'i18n-allowlist.json')

// Locale dictionaries are the source of truth for translations, so they are
// intentionally exempt from the scanner.
const IGNORED_PREFIXES = ['i18n/locales/']

// Bilingual data tables: every entry carries both `label` (zh) and `labelEn`,
// and callers resolve one with getStyleLabel(val, lang). This is static data,
// not UI copy — calling t() here would freeze the labels at import time.
const BILINGUAL_DATA_FILES = new Set(['constants/styleOptions.js'])

const allowlist = loadAllowlist(allowlistPath)
const leaks = new Map(
  [...scanDirectory(srcDir, { ignore: IGNORED_PREFIXES })].filter(
    ([file]) => !BILINGUAL_DATA_FILES.has(file),
  ),
)

test('source-scan: comment stripping keeps line numbers and string literals intact', () => {
  const source = [
    "const url = 'https://example.com/中文' // 注释",
    '/* 块注释',
    '   跨行 */',
    '<template>',
    '  <!-- HTML 注释 -->',
    '  <span>真实中文</span>',
    '</template>',
  ].join('\n')

  const stripped = stripComments(source).split('\n')
  assert.equal(stripped.length, 7, 'line count must be preserved')
  assert.match(stripped[0], /https:\/\/example\.com\/中文/, 'string literals must survive')
  assert.doesNotMatch(stripped[0], /注释/, 'line comments must be removed')
  assert.doesNotMatch(stripped[1], /块注释/, 'block comments must be removed')
  assert.doesNotMatch(stripped[4], /HTML 注释/, 'HTML comments must be removed')
  assert.match(stripped[5], /真实中文/, 'real UI text must be detected')
})

test('source-scan: detects Chinese characters in source files', () => {
  const fixture = path.resolve(testDir, 'fixtures/source-scan-sample.vue')
  const hits = scanFile(fixture)
  assert.deepEqual(
    hits.map((h) => h.line),
    [3, 6],
    'only the two non-comment lines may be reported',
  )
})

test('source-scan: no new Chinese hardcoded in frontend sources', () => {
  const violations = []
  for (const [file, count] of leaks) {
    const allowed = allowlist[file]
    if (allowed === undefined) {
      violations.push(`${file}: ${count} line(s) of hardcoded Chinese (not in allowlist)`)
      continue
    }
    if (count > allowed) {
      violations.push(`${file}: ${count} line(s), allowlist permits ${allowed}`)
    }
  }

  assert.deepEqual(
    violations,
    [],
    [
      'Hardcoded Chinese was added to frontend source files.',
      'Move the text into src/i18n/locales/{zh,en}.js and call t(\'key\').',
      '',
      ...violations,
    ].join('\n'),
  )
})

test('source-scan: leak report is actionable', () => {
  const fixture = path.resolve(testDir, 'fixtures/source-scan-sample.vue')
  const hits = scanFile(fixture)
  assert.equal(hits.length, 2)
  const report = formatHits(testDir, 'fixtures/source-scan-sample.vue', hits)
  assert.match(report, /fixtures\/source-scan-sample\.vue:\d+/)
})

if (fs.existsSync(allowlistPath)) {
  test('source-scan: allowlist keeps shrinking (no stale entries)', () => {
    const stale = []
    for (const [file, count] of Object.entries(allowlist)) {
      const actual = leaks.get(file) || 0
      if (actual < count) {
        stale.push(`${file}: allowlist says ${count}, actual ${actual} (lower it to ${actual})`)
      }
      if (actual === 0) {
        stale.push(`${file}: no leaks left, remove this allowlist entry`)
      }
    }

    assert.deepEqual(
      stale,
      [],
      [
        'The i18n allowlist is out of date. Lower each number to the real count',
        '(or delete the entry when it reaches 0) in frontweb/test/i18n-allowlist.json.',
        '',
        ...stale.sort(),
      ].join('\n'),
    )
  })

  test('source-scan: allowlist file is valid JSON', () => {
    assert.equal(typeof allowlist, 'object')
  })
} else {
  test('source-scan: allowlist eliminated and zero leaks remain', () => {
    assert.equal(leaks.size, 0, `Expected 0 files with leaks, found: ${[...leaks.keys()].join(', ')}`)
  })
}

export { leaks }
