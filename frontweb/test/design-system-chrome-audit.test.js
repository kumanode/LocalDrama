import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const appVuePath = path.resolve(testDir, '../src/App.vue')
const filmListPath = path.resolve(testDir, '../src/views/FilmList.vue')
const filmHeaderPath = path.resolve(testDir, '../src/components/filmCreate/FilmHeader.vue')

test('chrome: App.vue logo and header use solid monochrome without gradients', () => {
  const content = fs.readFileSync(appVuePath, 'utf8')
  assert.doesNotMatch(content, /linear-gradient/, 'App.vue must not use linear-gradient')
  assert.doesNotMatch(content, /-webkit-background-clip:\s*text/, 'App.vue must not use gradient text clip')
})

test('chrome: FilmList.vue project-card and action-card do not use translateY or drop-shadows', () => {
  const content = fs.readFileSync(filmListPath, 'utf8')
  assert.doesNotMatch(content, /translateY/, 'FilmList.vue must not use translateY hover lift')
  assert.doesNotMatch(content, /box-shadow:\s*0\s+[1-9]/, 'FilmList.vue must not use box-shadow on cards')
})

test('chrome: FilmHeader.vue does not use gradients or drop-shadows', () => {
  const content = fs.readFileSync(filmHeaderPath, 'utf8')
  assert.doesNotMatch(content, /linear-gradient/, 'FilmHeader.vue must not use linear-gradient')
  assert.doesNotMatch(content, /box-shadow:\s*0\s+[1-9]/, 'FilmHeader.vue must not use box-shadow')
})

test('chrome: FilmCreate.css contains no radial-gradient, backdrop-filter, or translateY', () => {
  const filmCreateCss = fs.readFileSync(path.resolve(testDir, '../src/views/FilmCreate.css'), 'utf8')
  assert.doesNotMatch(filmCreateCss, /radial-gradient/, 'FilmCreate.css must not use radial-gradient')
  assert.doesNotMatch(filmCreateCss, /backdrop-filter/, 'FilmCreate.css must not use backdrop-filter')
  assert.doesNotMatch(filmCreateCss, /translateY/, 'FilmCreate.css must not use translateY')
  assert.doesNotMatch(filmCreateCss, /box-shadow:\s*0\s+[1-9]/, 'FilmCreate.css must not use box-shadow on cards')
  assert.match(filmCreateCss, /background:\s*var\(--bg-page\)/, 'FilmCreate.css must use var(--bg-page)')
})
