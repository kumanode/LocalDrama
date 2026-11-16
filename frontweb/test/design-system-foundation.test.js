import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const frontwebDir = path.resolve(testDir, '..')

test('foundation: package.json includes @fontsource packages', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontwebDir, 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies['@fontsource/space-grotesk'], 'missing @fontsource/space-grotesk')
  assert.ok(pkg.dependencies['@fontsource/space-mono'], 'missing @fontsource/space-mono')
})

test('foundation: main.js imports local space-grotesk and space-mono fonts', () => {
  const mainContent = fs.readFileSync(path.join(frontwebDir, 'src/main.js'), 'utf8')
  assert.match(mainContent, /@fontsource\/space-grotesk/, 'main.js must import space-grotesk')
  assert.match(mainContent, /@fontsource\/space-mono/, 'main.js must import space-mono')
})

test('foundation: i18n setLocale updates document.documentElement.lang', async () => {
  const i18nContent = fs.readFileSync(path.join(frontwebDir, 'src/i18n/index.js'), 'utf8')
  assert.match(i18nContent, /document\.documentElement\.lang\s*=/, 'setLocale must set document.documentElement.lang')
})
