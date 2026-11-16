import test from 'node:test'
import assert from 'node:assert/strict'
import { getStoryboardAspectRatio } from '../src/utils/storyboardAspectRatio.js'

test('storyboard-specific ratio wins over the project default', () => {
  assert.equal(getStoryboardAspectRatio({ aspect_ratio: '9:16' }, '16:9'), '9:16')
  assert.equal(getStoryboardAspectRatio({}, '1:1'), '1:1')
  assert.equal(getStoryboardAspectRatio(null, ''), '16:9')
})
