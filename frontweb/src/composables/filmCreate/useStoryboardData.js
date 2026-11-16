import { useStoryboards } from './useStoryboards'
import { useTaskPolling } from './useTaskPolling'
import { useStoryboardAssociations } from './useStoryboardAssociations'

export function useStoryboardData({
  store,
  dramaId,
  currentEpisodeId,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  genStore,
  loadDrama,
  generatingCharIds,
  generatingPropIds,
  generatingSceneIds,
  videoErrorMsg,
  storyboards,
  characters,
  props,
  scenes,
  ensureProfessionalFramePrompt,
  getSelectedStyle,
  projectAspectRatio,
}) {
  const storyboardsBase = useStoryboards({
    store,
    dramaId,
    currentEpisodeId,
    storyboardUseFirstLastFrame,
    isSbUniversalMode,
    genStore,
  })

  const {
    generatingSbImageIds,
    generatingSbFirstImageIds,
    generatingSbLastImageIds,
    generatingSbVideoIds,
    loadSingleStoryboardMedia,
    sbSelectedImgId,
  } = storyboardsBase

  const taskPolling = useTaskPolling({
    store,
    dramaId,
    currentEpisodeId,
    genStore,
    loadDrama,
    loadSingleStoryboardMedia: (...args) => loadSingleStoryboardMedia(...args),
    generatingCharIds,
    generatingPropIds,
    generatingSceneIds,
    generatingSbImageIds,
    generatingSbFirstImageIds,
    generatingSbLastImageIds,
    generatingSbVideoIds,
    videoErrorMsg,
  })

  const associations = useStoryboardAssociations({
    storyboards,
    characters,
    props,
    scenes,
    dramaId,
    storyboardUseFirstLastFrame,
    isSbUniversalMode,
    ensureProfessionalFramePrompt: (...args) => ensureProfessionalFramePrompt(...args),
    getSelectedStyle,
    projectAspectRatio,
    pollTask: (...args) => taskPolling.pollTask(...args),
    loadSingleStoryboardMedia: (...args) => loadSingleStoryboardMedia(...args),
    sbSelectedImgId,
  })

  return {
    ...storyboardsBase,
    ...taskPolling,
    ...associations,
  }
}
