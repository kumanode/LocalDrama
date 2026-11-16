import { useVideoParams } from './useVideoParams'
import { useStoryboardPrompts } from './useStoryboardPrompts'
import { useNarration } from './useNarration'

export function useStoryboardConfig({
  store,
  dramaId,
  currentEpisodeId,
  loadDrama,
  refreshStoryboardsOnly,
  getSelectedStylePromptZh,
  getSelectedStylePrompt,
  pollTask,
  videoClipDuration,
  storyboardUniversalOmni,
  pipelineRest,
  storyboards,
}) {
  const videoParams = useVideoParams({
    store,
    dramaId,
    currentEpisodeId,
    loadDrama,
    refreshStoryboardsOnly,
  })

  const storyboardPrompts = useStoryboardPrompts({
    store,
    sbLocation: videoParams.sbLocation,
    sbTime: videoParams.sbTime,
    sbShotType: videoParams.sbShotType,
    sbAngleH: videoParams.sbAngleH,
    sbAngleV: videoParams.sbAngleV,
    sbAngleS: videoParams.sbAngleS,
    sbResult: videoParams.sbResult,
    sbAction: videoParams.sbAction,
    sbAtmosphere: videoParams.sbAtmosphere,
    angleToPromptFragment: videoParams.angleToPromptFragment,
    getSelectedStylePromptZh,
    getSelectedStylePrompt,
    pollTask,
    videoClipDuration,
    sbDuration: videoParams.sbDuration,
    sbTitle: videoParams.sbTitle,
    sbDialogue: videoParams.sbDialogue,
    sbNarration: videoParams.sbNarration,
    sbMovement: videoParams.sbMovement,
    sbLayoutDescription: videoParams.sbLayoutDescription,
    sbUniversalSegmentText: videoParams.sbUniversalSegmentText,
    onSaveUniversalSegmentField: videoParams.onSaveUniversalSegmentField,
    isSbUniversalMode: videoParams.isSbUniversalMode,
    storyboardUniversalOmni,
    pipelineRest,
    loadDrama,
  })

  const narration = useNarration({
    store,
    currentEpisodeId,
    storyboards,
    sbDuration: videoParams.sbDuration,
    sbNarration: videoParams.sbNarration,
  })

  const sbFields = {
    sbTitle: videoParams.sbTitle,
    sbLocation: videoParams.sbLocation,
    sbTime: videoParams.sbTime,
    sbDuration: videoParams.sbDuration,
    sbDialogue: videoParams.sbDialogue,
    sbNarration: videoParams.sbNarration,
    sbAction: videoParams.sbAction,
    sbResult: videoParams.sbResult,
    sbAtmosphere: videoParams.sbAtmosphere,
    sbShotType: videoParams.sbShotType,
    sbMovement: videoParams.sbMovement,
    sbLayoutDescription: videoParams.sbLayoutDescription,
    sbUniversalSegmentText: videoParams.sbUniversalSegmentText,
  }

  return {
    ...videoParams,
    ...storyboardPrompts,
    ...narration,
    videoParamsComposable: videoParams,
    sbFields,
  }
}
