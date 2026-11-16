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

test('linter: zero purple hex codes in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  const purpleHexRegex = /#(?:7c3aed|8b5cf6|6366f1|a855f7|c084fc|4f46e5|818cf8|a78bfa|c4b5fd|9333ea|6d28d9|5b21b6)/i
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (purpleHexRegex.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden purple hex found in: ${violations.join(', ')}`)
})

test('linter: zero purple rgba values in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  const purpleRgbaRegex = /rgba\(\s*(?:120|124|139|167|168|99|79|60),\s*(?:58|60|70|85|92|102|139|140|220)/i
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (purpleRgbaRegex.test(content)) {
      violations.push(path.relative(srcDir, file))
    }
  }
  assert.deepEqual(violations, [], `Forbidden purple rgba found in: ${violations.join(', ')}`)
})

test('linter: no hover translateY in any frontend vue or css file', () => {
  const files = getAllFiles(srcDir)
  const violations = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
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
