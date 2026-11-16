import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const themePath = path.resolve(testDir, '../src/styles/theme.css')

test('tokens: theme.css defines Nothing UI font stacks and scale', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /--font-sans:\s*'Space Grotesk'/, 'must define --font-sans with Space Grotesk')
  assert.match(css, /--font-mono:\s*'Space Mono'/, 'must define --font-mono with Space Mono')
  assert.match(css, /--font-xs:\s*11px/, 'must define --font-xs as 11px')
  assert.match(css, /--font-sm:\s*13px/, 'must define --font-sm as 13px')
  assert.match(css, /--font-md:\s*14px/, 'must define --font-md as 14px')
  assert.match(css, /--font-lg:\s*16px/, 'must define --font-lg as 16px')
  assert.match(css, /--font-xl:\s*24px/, 'must define --font-xl as 24px')
  assert.match(css, /--font-display:\s*48px/, 'must define --font-display as 48px')
})

test('tokens: theme.css defines dark and light monochrome palettes with AA contrast', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  // Dark mode
  assert.match(css, /--bg-page:\s*#000000/, 'dark --bg-page must be #000000')
  assert.match(css, /--bg-card:\s*#0D0D0D/i, 'dark --bg-card must be #0D0D0D')
  assert.match(css, /--bg-inner:\s*#121212/, 'dark --bg-inner must be #121212')
  assert.match(css, /--border-color:\s*#262626/, 'dark --border-color must be #262626')
  assert.match(css, /--border-muted:\s*#3A3A3A/i, 'dark --border-muted must be #3A3A3A')
  assert.match(css, /--text-bright:\s*#FFFFFF/i, 'dark --text-bright must be #FFFFFF')
  assert.match(css, /--danger-text:\s*#FF4D4F/i, 'dark --danger-text must be #FF4D4F')

  // Light mode
  assert.match(css, /--bg-page:\s*#F4F4F2/i, 'light --bg-page must be #F4F4F2')
  assert.match(css, /--bg-card:\s*#FFFFFF/i, 'light --bg-card must be #FFFFFF')
  assert.match(css, /--bg-inner:\s*#FAFAF8/i, 'light --bg-inner must be #FAFAF8')
  assert.match(css, /--border-color:\s*#D8D7D3/i, 'light --border-color must be #D8D7D3')
  assert.match(css, /--border-muted:\s*#B5B4B0/i, 'light --border-muted must be #B5B4B0')
  assert.match(css, /--text-bright:\s*#000000/, 'light --text-bright must be #000000')
})

test('tokens: theme.css defines radius tokens including pill and none, and shadow: none', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /--radius-none:\s*0/, 'must define --radius-none: 0')
  assert.match(css, /--radius-sm:\s*4px/, 'must define --radius-sm: 4px')
  assert.match(css, /--radius-md:\s*8px/, 'must define --radius-md: 8px')
  assert.match(css, /--radius-lg:\s*12px/, 'must define --radius-lg: 12px')
  assert.match(css, /--radius-pill:\s*9999px/, 'must define --radius-pill: 9999px')
  assert.match(css, /--shadow:\s*none/, 'must define --shadow: none')
})

test('tokens: theme.css disables tracking on Chinese text', () => {
  const css = fs.readFileSync(themePath, 'utf8')
  assert.match(css, /html:lang\(zh\)\s+\.meta-label[\s\S]*?letter-spacing:\s*0/, 'zh meta-label tracking must be 0')
})
