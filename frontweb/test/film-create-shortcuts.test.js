import test from 'node:test'
import assert from 'node:assert/strict'
import { handleFilmCreateShortcut } from '../src/utils/filmCreateShortcuts.js'

function keyboardEvent(key, extras = {}) {
  return {
    key,
    target: null,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    prevented: false,
    preventDefault() { this.prevented = true },
    ...extras,
  }
}

test('film editor shortcuts dispatch save and storyboard navigation/generation', () => {
  const calls = []
  const actions = {
    save: () => calls.push('save'),
    next: () => calls.push('next'),
    previous: () => calls.push('previous'),
    generate: () => calls.push('generate'),
  }

  for (const [key, expected] of [['s', 'save'], ['j', 'next'], ['k', 'previous'], ['g', 'generate']]) {
    const event = keyboardEvent(key, { ctrlKey: key === 's' })
    assert.equal(handleFilmCreateShortcut(event, actions), true)
    assert.equal(event.prevented, true)
    assert.equal(calls.at(-1), expected)
  }
})

test('film editor shortcuts do not steal keys from editable fields', () => {
  const event = keyboardEvent('g', { target: { matches: () => true } })
  assert.equal(handleFilmCreateShortcut(event, { generate() { assert.fail('must not generate') } }), false)
})
