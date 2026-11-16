import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSelectedStoryboards,
  selectAllStoryboards,
  toggleStoryboardSelection,
} from '../src/utils/storyboardSelection.js'

test('toggling a shot selection preserves the input set', () => {
  const original = new Set([1])
  const next = toggleStoryboardSelection(original, 2)

  assert.deepEqual([...original], [1])
  assert.deepEqual([...next], [1, 2])
  assert.deepEqual([...toggleStoryboardSelection(next, 1)], [2])
})

test('bulk selection follows the current storyboard list', () => {
  const storyboards = [{ id: 1 }, { id: 2 }]
  const all = selectAllStoryboards(storyboards, new Set(), true)

  assert.deepEqual([...all], [1, 2])
  assert.deepEqual([...selectAllStoryboards(storyboards, false)], [])
  assert.deepEqual(getSelectedStoryboards(storyboards, new Set([2])), [{ id: 2 }])
})
