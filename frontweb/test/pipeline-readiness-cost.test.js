import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculatePipelineReadiness,
  calculatePipelineCost,
} from '../src/utils/pipelineReadinessAndCost.js'

test('calculatePipelineReadiness validates all dimensions', () => {
  const notReady = calculatePipelineReadiness()
  assert.equal(notReady.episode, false)
  assert.equal(notReady.script, false)
  assert.equal(notReady.models, false)
  assert.equal(notReady.ffmpeg, false)
  assert.equal(notReady.isReady, false)

  const ready = calculatePipelineReadiness({
    currentEpisodeId: 10,
    scriptContent: 'Once upon a time',
    aiConfigs: [
      { service_type: 'text', is_default: true, is_active: true },
      { service_type: 'image', is_default: true, is_active: true },
      { service_type: 'video', is_default: true, is_active: true },
    ],
    systemStatus: { ffmpeg: true },
    characters: [{ id: 1, name: 'Alice', image_url: 'http://img.jpg' }],
    storyboards: [{ id: 100, character_ids: [1] }],
  })

  assert.equal(ready.episode, true)
  assert.equal(ready.script, true)
  assert.equal(ready.models, true)
  assert.equal(ready.ffmpeg, true)
  assert.equal(ready.characterRefs, true)
  assert.equal(ready.isReady, true)
})

test('calculatePipelineReadiness catches missing character reference images', () => {
  const res = calculatePipelineReadiness({
    currentEpisodeId: 10,
    scriptContent: 'Script text',
    aiConfigs: [
      { service_type: 'text' },
      { service_type: 'image' },
      { service_type: 'video' },
    ],
    characters: [{ id: 1, name: 'Alice', image_url: '' }],
    storyboards: [{ id: 100, character_ids: [1] }],
  })

  assert.equal(res.characterRefs, false)
})

const PRICED_CONFIGS = [
  { service_type: 'text', is_default: true, settings: JSON.stringify({ cost_per_call: 0.05 }) },
  { service_type: 'image', is_default: true, settings: JSON.stringify({ cost_per_call: 0.20 }) },
  { service_type: 'video', is_default: true, settings: JSON.stringify({ cost_per_call: 1.50 }) },
]

test('calculatePipelineCost multiplies missing calls by the configured price', () => {
  const cost = calculatePipelineCost({
    storyboards: [
      { id: 1, image_url: '', video_url: '' },
      { id: 2, image_url: 'http://img', video_url: '' },
    ],
    characters: [{ id: 1, image_url: '' }],
    scenes: [{ id: 1, image_url: 'http://scene' }],
    aiConfigs: PRICED_CONFIGS,
  })

  // storyboards exist => 0 text calls; 1 missing shot image + 1 missing character image = 2 image calls; 2 videos
  assert.equal(cost.textCalls, 0)
  assert.equal(cost.imageCalls, 2)
  assert.equal(cost.videoCalls, 2)
  assert.equal(cost.totalCalls, 4)
  assert.equal(cost.priced, true)
  assert.equal(cost.partial, false)
  assert.equal(cost.totalCost, 3.4) // 2 * 0.20 + 2 * 1.50
})

test('calculatePipelineCost never invents a price when none is configured', () => {
  const cost = calculatePipelineCost({
    storyboards: [{ id: 1 }],
    aiConfigs: [{ service_type: 'text' }, { service_type: 'image' }, { service_type: 'video' }],
  })
  assert.equal(cost.priced, false)
  assert.equal(cost.textPrice, null)
  assert.equal(cost.imagePrice, null)
  assert.equal(cost.videoPrice, null)
  assert.equal(cost.totalCost, null)
  assert.equal(cost.totalCalls, cost.imageCalls + cost.videoCalls + cost.textCalls)
})

test('calculatePipelineCost prices only the types that have a configured price', () => {
  const cost = calculatePipelineCost({
    storyboards: [{ id: 1 }],
    aiConfigs: [
      { service_type: 'text' },
      { service_type: 'image' },
      { service_type: 'video', is_default: true, settings: { cost_per_call: 2 } },
    ],
  })
  assert.equal(cost.priced, true)
  assert.equal(cost.videoCost, 2)
  assert.equal(cost.imageCost, null)
  assert.equal(cost.totalCost, 2)
})

test('calculatePipelineCost marks the figure partial until shots exist', () => {
  const cost = calculatePipelineCost({ aiConfigs: PRICED_CONFIGS })
  assert.equal(cost.partial, true)
  assert.equal(cost.textCalls, 2) // storyboard + characters still have to be generated
  assert.equal(cost.imageCalls, 0)
  assert.equal(cost.videoCalls, 0)
})

test('calculatePipelineCost uses the planned shot count before a storyboard exists', () => {
  const cost = calculatePipelineCost({ aiConfigs: PRICED_CONFIGS, expectedShotCount: 8 })
  assert.equal(cost.partial, false)
  assert.equal(cost.imageCalls, 8)
  assert.equal(cost.videoCalls, 8)
  assert.equal(cost.totalCost, Number((2 * 0.05 + 8 * 0.2 + 8 * 1.5).toFixed(2)))
})

test('calculatePipelineCost respects custom "already generated" predicates', () => {
  const cost = calculatePipelineCost({
    storyboards: [{ id: 1 }, { id: 2 }, { id: 3 }],
    aiConfigs: PRICED_CONFIGS,
    hasShotImage: (sb) => sb.id !== 3,
    hasShotVideo: (sb) => sb.id === 1,
  })
  assert.equal(cost.imageCalls, 1)
  assert.equal(cost.videoCalls, 2)
})
