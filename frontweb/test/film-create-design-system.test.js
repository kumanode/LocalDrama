import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const fcDir = path.resolve(testDir, '../src/components/filmCreate')

test('filmCreate: storyboard card does not contain translateY or box-shadow hover', () => {
  const sbCard = fs.readFileSync(path.join(fcDir, 'StoryboardCard.vue'), 'utf8')
  assert.doesNotMatch(sbCard, /translateY/, 'StoryboardCard must not use translateY')
  assert.doesNotMatch(sbCard, /box-shadow:\s*0\s+[1-9]/, 'StoryboardCard must not use floating shadow')
})

test('filmCreate: resource section does not contain translateY or box-shadow hover', () => {
  const resource = fs.readFileSync(path.join(fcDir, 'ResourceSection.vue'), 'utf8')
  assert.doesNotMatch(resource, /translateY/, 'ResourceSection must not use translateY')
  assert.doesNotMatch(resource, /box-shadow:\s*0\s+[1-9]/, 'ResourceSection must not use floating shadow')
})

test('filmCreate: pipeline panel uses mechanical tokens without hardcoded hex colors', () => {
  const pipeline = fs.readFileSync(path.join(fcDir, 'PipelinePanel.vue'), 'utf8')
  assert.doesNotMatch(pipeline, /#7c3aed/i, 'PipelinePanel must not use purple #7c3aed')
})
