import test from 'node:test'
import assert from 'node:assert/strict'
import { getStoryboardStatus, getStoryboardTaskProgress } from '../src/utils/storyboardStatus.js'

test('storyboard status prioritizes failure, running work, completed video, then queued', () => {
  assert.deepEqual(getStoryboardStatus({ error: 'provider rejected request', hasVideo: false, isRunning: true }), {
    status: 'failed',
    error: 'provider rejected request',
  })
  assert.deepEqual(getStoryboardStatus({ hasVideo: false, isRunning: true }), { status: 'running', error: '' })
  assert.deepEqual(getStoryboardStatus({ hasVideo: true, isRunning: false }), { status: 'done', error: '' })
  assert.deepEqual(getStoryboardStatus({ hasVideo: false, isRunning: false }), { status: 'queued', error: '' })
})

test('returns a clamped numeric progress for the active storyboard task', () => {
  const progress = getStoryboardTaskProgress([
    { resourceId: 17, resourceType: 'sb_video', status: 'running', progress: 43 },
    { resourceId: 18, resourceType: 'sb_video', status: 'running', progress: 88 },
  ], 17)
  assert.equal(progress, 43)
})

test('does not fabricate progress when the active task has no numeric progress', () => {
  assert.equal(getStoryboardTaskProgress([
    { resourceId: 17, resourceType: 'sb_video', status: 'running' },
  ], 17), null)
})

test('ignores completed tasks and clamps invalid progress values', () => {
  assert.equal(getStoryboardTaskProgress([
    { resourceId: 17, resourceType: 'sb_video', status: 'completed', progress: 100 },
  ], 17), null)
  assert.equal(getStoryboardTaskProgress([
    { resourceId: 17, resourceType: 'sb_video', status: 'running', progress: 140 },
  ], 17), 100)
})
