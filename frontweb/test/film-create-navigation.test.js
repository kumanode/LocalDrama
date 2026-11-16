import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createFilmCreateExportStep,
  filmCreateScrollStorageKey,
  loadFilmCreateScrollPosition,
  saveFilmCreateScrollPosition,
} from '../src/utils/filmCreateNavigation.js'

test('export navigation points to the storyboard export controls', () => {
  const step = createFilmCreateExportStep((key) => key)
  assert.deepEqual(step, {
    key: 'export',
    label: 'filmCreate.stepExport',
    anchor: 'anchor-export',
    status: 'pending',
    count: 0,
  })
})

test('scroll storage key follows the current project route', () => {
  assert.equal(filmCreateScrollStorageKey(42), 'film-create-scroll:42')
  assert.equal(filmCreateScrollStorageKey(null), 'film-create-scroll:new')
})

test('scroll position is scoped to a project and safely restored', () => {
  const values = new Map()
  const storage = {
    setItem(key, value) { values.set(key, value) },
    getItem(key) { return values.get(key) ?? null },
  }
  saveFilmCreateScrollPosition(storage, 'film-create:42', 735)
  assert.equal(loadFilmCreateScrollPosition(storage, 'film-create:42'), 735)
  assert.equal(loadFilmCreateScrollPosition(storage, 'film-create:43'), null)

  values.set('film-create:bad', 'not-a-number')
  assert.equal(loadFilmCreateScrollPosition(storage, 'film-create:bad'), null)
})

test('scroll persistence tolerates unavailable storage', () => {
  assert.doesNotThrow(() => saveFilmCreateScrollPosition(null, 'key', 100))
  assert.equal(loadFilmCreateScrollPosition(null, 'key'), null)
})
