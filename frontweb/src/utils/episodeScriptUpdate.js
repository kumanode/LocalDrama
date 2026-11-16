export function updateEpisodeScript(episodes, episodeId, scriptContent) {
  return episodes.map((episode) => (
    Number(episode.id) === Number(episodeId)
      ? { ...episode, script_content: scriptContent }
      : episode
  ))
}
