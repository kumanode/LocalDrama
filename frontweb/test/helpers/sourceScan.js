import fs from 'node:fs'
import path from 'node:path'

export const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/**
 * Remove comments while preserving line numbers and string literals.
 * Handles `//`, `/* *\/`, and `<!-- -->`. Quotes are respected so URLs
 * such as `'https://…'` are not treated as comments.
 */
export function stripComments(source) {
  let out = ''
  let i = 0
  const n = source.length
  let state = 'code'

  const blank = (ch) => (ch === '\n' ? '\n' : ch === '\r' ? '\r' : ' ')

  while (i < n) {
    const ch = source[i]
    const next = source[i + 1]

    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line-comment'
        out += '  '
        i += 2
        continue
      }
      if (ch === '/' && next === '*') {
        state = 'block-comment'
        out += '  '
        i += 2
        continue
      }
      if (ch === '<' && source.startsWith('<!--', i)) {
        state = 'html-comment'
        out += '    '
        i += 4
        continue
      }
      if (ch === "'") state = 'single'
      else if (ch === '"') state = 'double'
      else if (ch === '`') state = 'template'
      out += ch
      i += 1
      continue
    }

    if (state === 'line-comment') {
      if (ch === '\n') {
        state = 'code'
        out += ch
      } else {
        out += blank(ch)
      }
      i += 1
      continue
    }

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        state = 'code'
        out += '  '
        i += 2
        continue
      }
      out += blank(ch)
      i += 1
      continue
    }

    if (state === 'html-comment') {
      if (ch === '-' && source.startsWith('-->', i)) {
        state = 'code'
        out += '   '
        i += 3
        continue
      }
      out += blank(ch)
      i += 1
      continue
    }

    // Inside a string literal: copy verbatim, honour escapes and terminators.
    if (ch === '\\') {
      out += ch + (next ?? '')
      i += 2
      continue
    }
    if (state === 'single' && ch === "'") state = 'code'
    else if (state === 'double' && ch === '"') state = 'code'
    else if (state === 'template' && ch === '`') state = 'code'
    else if ((state === 'single' || state === 'double') && (ch === '\n' || ch === '\r')) {
      // Unterminated quote: recover at end of line so one stray apostrophe
      // cannot blank out the rest of the file.
      state = 'code'
    }
    out += ch
    i += 1
  }

  return out
}

export function walkSourceFiles(dir, extensions = ['.vue', '.js'], acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkSourceFiles(full, extensions, acc)
    else if (extensions.some((ext) => entry.name.endsWith(ext))) acc.push(full)
  }
  return acc
}

/**
 * Scan a single file, returning [{ line, column, text }] for every line that
 * still contains CJK characters after comments are removed.
 *
 * A line carrying the `i18n-scan-ignore` directive is skipped. Use it only for
 * text that is genuinely not UI copy — for example a regex that has to keep
 * matching legacy Chinese data written by older versions.
 */
export function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const rawLines = source.split(/\r?\n/)
  const lines = stripComments(source).split(/\r?\n/)
  const hits = []
  lines.forEach((line, index) => {
    if (rawLines[index]?.includes('i18n-scan-ignore')) return
    const match = CJK_PATTERN.exec(line)
    if (match) {
      hits.push({ line: index + 1, column: match.index + 1, text: line.trim() })
    }
  })
  return hits
}

/**
 * Scan a directory tree, returning a Map of `<relative path>` → line count.
 */
export function scanDirectory(rootDir, { ignore = [], extensions = ['.vue', '.js'] } = {}) {
  const normalizedIgnore = ignore.map((p) => p.replace(/\\/g, '/'))
  const result = new Map()

  for (const file of walkSourceFiles(rootDir, extensions)) {
    const relative = path.relative(rootDir, file).replace(/\\/g, '/')
    if (normalizedIgnore.some((prefix) => relative.startsWith(prefix))) continue
    const hits = scanFile(file)
    if (hits.length > 0) result.set(relative, hits.length)
  }

  return result
}

export function loadAllowlist(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  return parsed.files || {}
}

export function formatHits(rootDir, relative, hits) {
  return hits.map((hit) => `${relative}:${hit.line}  ${hit.text.slice(0, 160)}`).join('\n')
}

export { fs, path }
