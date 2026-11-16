const fs = require('node:fs')
const path = require('node:path')

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** Remove line/block comments without shifting line numbers. */
function stripComments(source) {
  let out = ''
  let i = 0
  let state = 'code'
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]

    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line'
        out += '  '
        i += 2
        continue
      }
      if (ch === '/' && next === '*') {
        state = 'block'
        out += '  '
        i += 2
        continue
      }
      if (ch === "'") state = 'single'
      else if (ch === '"') state = 'double'
      else if (ch === '`') state = 'template'
      out += ch
      i += 1
      continue
    }

    if (state === 'line') {
      if (ch === '\n') {
        state = 'code'
        out += ch
      } else out += ' '
      i += 1
      continue
    }

    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code'
        out += '  '
        i += 2
        continue
      }
      out += ch === '\n' ? '\n' : ' '
      i += 1
      continue
    }

    if (ch === '\\') {
      out += ch + (next === undefined ? '' : next)
      i += 2
      continue
    }
    if (state === 'single' && ch === "'") state = 'code'
    else if (state === 'double' && ch === '"') state = 'code'
    else if (state === 'template' && ch === '`') state = 'code'
    else if ((state === 'single' || state === 'double') && ch === '\n') state = 'code'
    out += ch
    i += 1
  }
  return out
}

function walkSourceFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkSourceFiles(full, acc)
    else if (entry.name.endsWith('.js')) acc.push(full)
  }
  return acc
}

// Only strings that actually reach the user: response helpers and thrown errors.
const USER_FACING_CALL = /(?:response\.(?:badRequest|notFound|error|forbidden|internalError|serviceUnavailable)|writeSse|writeNd|throw\s+new\s+Error)\s*\(/g

function extractCall(source, openParenIndex) {
  let depth = 0
  let i = openParenIndex
  while (i < source.length) {
    const ch = source[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      i += 1
      while (i < source.length) {
        if (source[i] === '\\') i += 2
        else if (source[i] === quote) break
        else i += 1
      }
      i += 1
      continue
    }
    if (ch === '(') depth += 1
    else if (ch === ')') {
      depth -= 1
      if (depth === 0) return { text: source.slice(openParenIndex, i + 1), end: i + 1 }
    }
    i += 1
  }
  return { text: source.slice(openParenIndex), end: source.length }
}

/** Return user-facing call sites that contain CJK characters. */
function scanUserFacingStrings(filePath) {
  const source = stripComments(fs.readFileSync(filePath, 'utf8'))
  const hits = []
  USER_FACING_CALL.lastIndex = 0
  let match
  while ((match = USER_FACING_CALL.exec(source)) !== null) {
    const startIndex = match.index
    const { text, end } = extractCall(source, startIndex + match[0].length - 1)
    USER_FACING_CALL.lastIndex = end
    if (!CJK_PATTERN.test(text)) continue
    const line = source.slice(0, startIndex).split('\n').length
    hits.push({ line, text: text.replace(/\s+/g, ' ').trim().slice(0, 200) })
  }
  return hits
}

function scanDirectory(rootDir) {
  const result = new Map()
  for (const file of walkSourceFiles(rootDir)) {
    const relative = path.relative(rootDir, file).replace(/\\/g, '/')
    const hits = scanUserFacingStrings(file)
    if (hits.length > 0) result.set(relative, hits.length)
  }
  return result
}

function loadAllowlist(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).files || {}
}

module.exports = {
  CJK_PATTERN,
  stripComments,
  walkSourceFiles,
  scanUserFacingStrings,
  scanDirectory,
  loadAllowlist,
}
