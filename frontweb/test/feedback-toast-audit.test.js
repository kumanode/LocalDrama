import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const filmCreatePath = path.resolve(testDir, '../src/views/FilmCreate.vue')
const themeCssPath = path.resolve(testDir, '../src/styles/theme.css')
const useStoryScriptPath = path.resolve(testDir, '../src/composables/filmCreate/useStoryScript.js')

test('feedback: FilmCreate uses inline save status instead of toast on autosave', () => {
  const content = fs.readFileSync(filmCreatePath, 'utf8')
  assert.match(content, /script-save-status/, 'FilmCreate must render inline save status')
  assert.match(content, /aria-live="polite"/, 'script-save-status must have accessible aria-live="polite"')
})

test('feedback: theme.css styles .script-save-status with brutalist bracket notation', () => {
  const content = fs.readFileSync(themeCssPath, 'utf8')
  assert.match(content, /\.script-save-status[\s\S]*?font-family:\s*var\(--font-mono\)/, 'must use mono font')
  assert.match(content, /\.script-save-status\.is-saved::before\s*\{\s*content:\s*'\[SAVED\]\s*'/, 'must define [SAVED] prefix')
  assert.match(content, /\.script-save-status\.is-saving::before\s*\{\s*content:\s*'\[SYNCING\]\s*'/, 'must define [SYNCING] prefix')
  assert.match(content, /\.script-save-status\.is-unsaved::before\s*\{\s*content:\s*'\[UNSAVED\]\s*'/, 'must define [UNSAVED] prefix')
})

test('feedback: routine script saving avoids redundant toast notifications per Nothing UI §5.F', () => {
  const content = fs.readFileSync(useStoryScriptPath, 'utf8')
  // Routine save should rely on inline status rather than popup toast spam
  assert.doesNotMatch(content, /ElMessage\.success\(t\('filmCreate\.scriptSaved'\)\)/, 'routine script save should not spam toast')
})
