import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const compPath = path.resolve(testDir, '../src/components/SegmentedProgress.vue')

test('segmented-progress: component file exists and contains template & script', () => {
  assert.ok(fs.existsSync(compPath), 'SegmentedProgress.vue must exist')
  const content = fs.readFileSync(compPath, 'utf8')
  assert.match(content, /<template>/, 'must contain template')
  assert.match(content, /<script setup>/, 'must contain script setup')
})

test('segmented-progress: calculation logic correctly computes filled segments and percentage', () => {
  function computeSegments(value, max = 100, totalSegments = 10) {
    const clamped = Math.max(0, Math.min(max, Number(value) || 0))
    const ratio = max > 0 ? clamped / max : 0
    const filledCount = Math.round(ratio * totalSegments)
    const percentage = Math.round(ratio * 100)
    return { filledCount, percentage }
  }

  assert.deepEqual(computeSegments(50, 100, 10), { filledCount: 5, percentage: 50 })
  assert.deepEqual(computeSegments(0, 100, 10), { filledCount: 0, percentage: 0 })
  assert.deepEqual(computeSegments(100, 100, 10), { filledCount: 10, percentage: 100 })
  assert.deepEqual(computeSegments(-20, 100, 10), { filledCount: 0, percentage: 0 })
  assert.deepEqual(computeSegments(150, 100, 10), { filledCount: 10, percentage: 100 })
  assert.deepEqual(computeSegments(23, 100, 20), { filledCount: 5, percentage: 23 })
})
