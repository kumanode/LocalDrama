import test from 'node:test'
import assert from 'node:assert/strict'
import { updateEpisodeScript } from '../src/utils/episodeScriptUpdate.js'

test('autosaving an episode script only changes the selected episode', () => {
  const episodes = [
    { id: 4, episode_number: 1, script_content: 'first' },
    { id: 9, episode_number: 2, script_content: 'second', title: 'Episode 2' },
  ]

  const updated = updateEpisodeScript(episodes, 9, 'edited')

  assert.deepEqual(updated, [
    episodes[0],
    { ...episodes[1], script_content: 'edited' },
  ])
  assert.equal(episodes[1].script_content, 'second')
})
