import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowNarration } from '../src/utils/narrationSection.js'

test('shows narration when project narration is enabled', () => {
  assert.equal(shouldShowNarration({ enabled: true }), true)
})

test('shows narration when a draft or saved narration exists', () => {
  assert.equal(shouldShowNarration({ draft: 'Draft narration' }), true)
  assert.equal(shouldShowNarration({ saved: 'Saved narration' }), true)
})

test('hides narration when disabled and both draft and saved text are blank', () => {
  assert.equal(shouldShowNarration({ enabled: false, draft: '  ', saved: '' }), false)
})
