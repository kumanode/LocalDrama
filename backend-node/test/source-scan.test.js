const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const {
  scanDirectory,
  scanUserFacingStrings,
  stripComments,
  loadAllowlist,
} = require('./helpers/sourceStrings')

const srcDir = path.resolve(__dirname, '../src')
const allowlistPath = path.resolve(__dirname, 'i18n-allowlist.json')

const allowlist = loadAllowlist(allowlistPath)
const leaks = scanDirectory(srcDir)

describe('backend source-scan', () => {
  it('strips comments but keeps string literals and line numbers', () => {
    const source = [
      "const url = 'https://example.com/中文' // 注释",
      '// 整行注释 中文',
      '/* 块注释',
      '   跨行 中文 */',
      "response.badRequest(res, '配置不存在')",
    ].join('\n')

    const lines = stripComments(source).split('\n')
    assert.equal(lines.length, 5, 'line count preserved')
    assert.match(lines[0], /https:\/\/example\.com\/中文/, 'string literals survive')
    assert.doesNotMatch(lines[0], /注释/, 'trailing comment removed')
    assert.doesNotMatch(lines[1], /中文/, 'line comment removed')
    assert.doesNotMatch(lines[3], /中文/, 'block comment removed')
  })

  it('finds only user-facing calls with Chinese text', () => {
    const hits = scanUserFacingStrings(path.resolve(__dirname, 'fixtures/source-strings-sample.js'))
    assert.deepEqual(hits.map((h) => h.line), [2, 4, 6])
  })

  it('does not add new Chinese user-facing strings in backend sources', () => {
    const violations = []
    for (const [file, count] of leaks) {
      const allowed = allowlist[file]
      if (allowed === undefined) {
        violations.push(`${file}: ${count} Chinese response/error message(s) not in allowlist`)
      } else if (count > allowed) {
        violations.push(`${file}: ${count} message(s), allowlist permits ${allowed}`)
      }
    }

    assert.deepEqual(
      violations,
      [],
      [
        'Hardcoded Chinese was added to backend user-facing messages.',
        'Pass an error code instead: response.notFound(res, "CONFIG_NOT_FOUND", "配置不存在").',
        '',
        ...violations,
      ].join('\n'),
    )
  })

  it('keeps the allowlist shrinking', () => {
    const stale = []
    for (const [file, count] of Object.entries(allowlist)) {
      const actual = leaks.get(file) || 0
      if (actual < count) stale.push(`${file}: allowlist ${count}, actual ${actual}`)
    }
    assert.deepEqual(
      stale,
      [],
      `backend-node/test/i18n-allowlist.json is stale; update these entries:\n${stale.sort().join('\n')}`,
    )
  })

  it('has a readable allowlist', () => {
    assert.ok(fs.existsSync(allowlistPath), 'backend-node/test/i18n-allowlist.json is missing')
    assert.equal(typeof allowlist, 'object')
  })
})
