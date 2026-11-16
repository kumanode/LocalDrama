import { useFramePrompts } from './useFramePrompts'
import { useUniversalSegments } from './useUniversalSegments'
import { useStoryboardPromptDialog } from './useStoryboardPromptDialog'

export function useStoryboardPrompts({
  store,
  sbLocation,
  sbTime,
  sbShotType,
  sbAngleH,
  sbAngleV,
  sbAngleS,
  sbResult,
  sbAction,
  sbAtmosphere,
  angleToPromptFragment,
  getSelectedStylePromptZh,
  getSelectedStylePrompt,
  pollTask,
  videoClipDuration,
  sbDuration,
  sbTitle,
  sbDialogue,
  sbNarration,
  sbMovement,
  sbLayoutDescription,
  sbUniversalSegmentText,
  onSaveUniversalSegmentField,
  isSbUniversalMode,
  storyboardUniversalOmni,
  pipelineRest,
  loadDrama,
}) {
  const framePrompts = useFramePrompts({
    store,
    sbLocation,
    sbTime,
    sbShotType,
    sbAngleH,
    sbAngleV,
    sbAngleS,
    sbResult,
    sbAction,
    sbAtmosphere,
    angleToPromptFragment,
    getSelectedStylePromptZh,
    getSelectedStylePrompt,
    pollTask,
  })

  const universalSegments = useUniversalSegments({
    store,
    videoClipDuration,
    sbDuration,
    sbTitle,
    sbLocation,
    sbTime,
    sbAction,
    sbDialogue,
    sbNarration,
    sbResult,
    sbAtmosphere,
    sbShotType,
    sbMovement,
    sbLayoutDescription,
    sbUniversalSegmentText,
    onSaveUniversalSegmentField,
    isSbUniversalMode,
    storyboardUniversalOmni,
    pipelineRest,
  })

  const promptDialog = useStoryboardPromptDialog({
    loadDrama,
  })

  return {
    ...framePrompts,
    ...universalSegments,
    ...promptDialog,
  }
}
