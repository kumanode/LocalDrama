import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

function vueFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...vueFiles(p))
    else if (e.name.endsWith('.vue')) out.push(p)
  }
  return out
}

// Style surface of an SFC: <style> blocks + inline style="" attributes (comments removed).
function styleText(src) {
  const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1])
  const inline = [...src.matchAll(/\sstyle="([^"]*)"/g)].map(m => m[1])
  return [...blocks, ...inline].join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
}

function scan(check) {
  const bad = []
  for (const f of vueFiles(srcDir)) {
    const css = styleText(fs.readFileSync(f, 'utf8'))
    const hits = check(css)
    if (hits.length) bad.push(`${path.relative(srcDir, f)}: ${hits.slice(0, 3).join(' | ')}`)
  }
  return bad
}

const stripFallbacks = css => css.replace(/var\(--[\w-]+\s*,[^)]*\)/g, 'var(--x)')

test('strict: no raw hex colors in .vue styles (use var(--token))', () => {
  assert.deepEqual(scan(css => stripFallbacks(css).match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g) || []), [])
})

test('strict: no raw rgb/rgba in .vue styles except black scrim/mask', () => {
  assert.deepEqual(scan(css =>
    (stripFallbacks(css).match(/rgba?\([^)]*\)/g) || []).filter(c => !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/.test(c))), [])
})

test('strict: no gradients in .vue styles except black/transparent scrims', () => {
  assert.deepEqual(scan(css =>
    (css.match(/(?:linear|radial|conic)-gradient\([^;]*/g) || []).filter(g => !/rgba?\(\s*0\s*,\s*0\s*,\s*0/.test(g))), [])
})

test('strict: no blurred box-shadow in .vue styles', () => {
  assert.deepEqual(scan(css => {
    const hits = []
    for (const m of css.matchAll(/box-shadow:\s*([^;}]+)/g)) {
      const v = m[1].trim()
      if (v === 'none' || /^var\(--shadow\)/.test(v)) continue
      for (const part of v.split(/,(?![^(]*\))/)) {
        const lens = part.trim().match(/-?[\d.]+px|\b0\b/g) || []
        if (lens.length >= 3 && parseFloat(lens[2]) > 0) hits.push(part.trim())
      }
    }
    return hits
  }), [])
})

test('strict: no el-skeleton', () => {
  const bad = []
  for (const f of vueFiles(srcDir)) if (/<el-skeleton/.test(fs.readFileSync(f, 'utf8'))) bad.push(path.relative(srcDir, f))
  assert.deepEqual(bad, [])
})

test('strict: container border-radius <= 12px (badges use radius-sm)', () => {
  assert.deepEqual(scan(css =>
    [...css.matchAll(/border-radius:\s*([\d.]+)px/g)].filter(m => parseFloat(m[1]) > 12).map(m => m[0])), [])
})

test('strict: theme.css keeps the button icon-to-label gap', () => {
  // The project writes `<el-button><el-icon/>Text</el-button>`, so Element Plus puts
  // the icon and the text in ONE <span> and its own `[class*=el-icon]+span` rule
  // never matches. Without this gap the icon sits flush against the first letter.
  const css = fs.readFileSync(path.join(srcDir, 'styles/theme.css'), 'utf8')
  assert.match(css, /\.el-button\s*>\s*span\s*\{[^}]*gap:\s*var\(--space-\d\)/,
    'theme.css must give .el-button > span a gap so icons clear their label')
})
