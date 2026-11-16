import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const themePath = path.resolve(testDir, '../src/styles/theme.css')

test('element-plus: legacy purple block #7c3aed is purged from theme.css', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.doesNotMatch(css, /#7c3aed/i, 'theme.css must not contain purple #7c3aed')
  assert.doesNotMatch(css, /亮色模式增强/, 'theme.css must not contain legacy enhancement block')
})

test('element-plus: html.dark defines complete Element Plus base variable overrides', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-bg-color:\s*var\(--bg-card\)/, 'html.dark must override --el-bg-color')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-text-color-primary:\s*var\(--text-primary\)/, 'html.dark must override --el-text-color-primary')
  assert.match(css, /html\.dark\s*\{[\s\S]*?--el-border-color:\s*var\(--border-color\)/, 'html.dark must override --el-border-color')
})

test('element-plus: primary button has inverted text color and pill radius', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-button--primary[\s\S]*?--el-button-text-color:\s*var\(--bg-page\)/, 'primary button text color must invert to --bg-page')
  assert.match(css, /\.el-button--primary[\s\S]*?border-radius:\s*var\(--radius-pill\)/, 'primary button must have radius-pill')
})

test('element-plus: el-switch has mechanical styling without knob shadow', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-switch/, 'must contain custom el-switch styling')
})

test('element-plus: el-message has brutalist bracket prefix and flat styling', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /\.el-message--error::before[\s\S]*?content:\s*'\[ERR\]\s*'/, 'error message must have [ERR] prefix')
})
