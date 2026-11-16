import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(testDir, '../src')
const themePath = path.resolve(srcDir, 'styles/theme.css')

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full))
    } else if (file.endsWith('.vue') || file.endsWith('.css')) {
      results.push(full)
    }
  }
  return results
}

test('typography: theme.css configures button typography adhering to DESIGN.md', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  // .el-button base rules
  assert.match(css, /\.el-button\s*\{[\s\S]*?font-family:\s*var\(--font-sans\)/, 'el-button must use var(--font-sans)')
  assert.match(css, /\.el-button\s*\{[\s\S]*?font-size:\s*var\(--font-sm\)/, 'el-button must default to var(--font-sm)')
  assert.match(css, /\.el-button\s*\{[\s\S]*?text-transform:\s*uppercase/, 'el-button must uppercase Latin text')
  assert.match(css, /\.el-button--primary[\s\S]*?font-weight:\s*600/, 'primary button must have font-weight: 600')
  assert.match(css, /\.el-button--small[\s\S]*?font-size:\s*var\(--font-xs\)/, 'small button must use var(--font-xs)')

  // CJK uppercase and tracking suppression
  assert.match(css, /html:lang\(zh\)[\s\S]*?\.el-button[\s\S]*?letter-spacing:\s*0\s*!important/, 'zh buttons must have 0 tracking')
  assert.match(css, /html:lang\(zh\)[\s\S]*?\.el-button[\s\S]*?text-transform:\s*none\s*!important/, 'zh buttons must have text-transform none')
})

test('typography: no raw font-family names in .vue styles (must use var(--font-sans) or var(--font-mono))', () => {
  const files = walk(srcDir).filter(f => f.endsWith('.vue'))
  const rawFontViolations = []

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8')
    const styles = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []
    for (const style of styles) {
      const cleaned = style.replace(/\/\*[\s\S]*?\*\//g, '')
      for (const m of cleaned.matchAll(/font-family\s*:\s*([^;]+);/g)) {
        const val = m[1].trim()
        if (!/^var\(--font-(?:sans|mono)\)$/.test(val) && val !== 'inherit') {
          rawFontViolations.push(`${path.relative(srcDir, f)}: font-family: ${val}`)
        }
      }
    }
  }
  assert.deepEqual(rawFontViolations, [], 'Vue files should not have raw hardcoded font-family declarations')
})

test('settings layout: tab-content is not cramped with max-height calc(100vh - 320px)', () => {
  const aiConfigContent = fs.readFileSync(path.resolve(srcDir, 'components/AIConfigContent.vue'), 'utf8')
  assert.doesNotMatch(aiConfigContent, /max-height:\s*calc\(100vh\s*-\s*320px\)/, 'tab-content must not be squished with calc(100vh - 320px)')
})
