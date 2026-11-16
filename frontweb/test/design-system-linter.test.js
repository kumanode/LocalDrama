import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../src')

function getAllFiles(dir, exts = ['.vue', '.css']) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, exts))
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }
  return files
}

test('linter: no purple #7c3aed in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/#7c3aed/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden purple #7c3aed found in: ${violations.join(', ')}`)
})

test('linter: no hover translateY in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    // Look for :hover selectors that apply translateY
    if (/:hover[^{]*\{[^}]*translateY/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden hover translateY found in: ${violations.join(', ')}`)
})

test('linter: no backdrop-filter blur in chrome styles', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/backdrop-filter:\s*blur/i.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden backdrop-filter found in: ${violations.join(', ')}`)
})
