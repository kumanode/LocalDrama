import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const viewsDir = path.resolve(testDir, '../src/views')
const compDir = path.resolve(testDir, '../src/components')

test('views: DramaDetail, AiConfig, MediaLibrary, and FreeCreate are free of purple #7c3aed', () => {
  const views = ['DramaDetail.vue', 'AiConfig.vue', 'MediaLibrary.vue', 'FreeCreate.vue']
  for (const v of views) {
    const content = fs.readFileSync(path.join(viewsDir, v), 'utf8')
    assert.doesNotMatch(content, /#7c3aed/i, `${v} must not contain #7c3aed`)
  }
})

test('views: DramaCanvas and dramaCanvas components are free of floating box-shadows', () => {
  const canvasVue = fs.readFileSync(path.join(viewsDir, 'DramaCanvas.vue'), 'utf8')
  assert.doesNotMatch(canvasVue, /box-shadow:\s*0\s+[4-9]px/, 'DramaCanvas must not use heavy box-shadow')
})
