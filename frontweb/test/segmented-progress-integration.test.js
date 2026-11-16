import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const taskCenterPath = path.resolve(testDir, '../src/components/TaskCenter.vue')
const mergeExportPath = path.resolve(testDir, '../src/components/filmCreate/MergeExportSection.vue')

test('integration: TaskCenter imports and uses SegmentedProgress', () => {
  const content = fs.readFileSync(taskCenterPath, 'utf8')
  assert.match(content, /import SegmentedProgress from/, 'TaskCenter must import SegmentedProgress')
  assert.match(content, /<SegmentedProgress/, 'TaskCenter must render SegmentedProgress')
  assert.doesNotMatch(content, /<el-progress/, 'TaskCenter must not render el-progress')
})

test('integration: MergeExportSection imports and uses SegmentedProgress', () => {
  const content = fs.readFileSync(mergeExportPath, 'utf8')
  assert.match(content, /import SegmentedProgress from/, 'MergeExportSection must import SegmentedProgress')
  assert.match(content, /<SegmentedProgress/, 'MergeExportSection must render SegmentedProgress')
  assert.doesNotMatch(content, /<el-progress/, 'MergeExportSection must not render el-progress')
})
