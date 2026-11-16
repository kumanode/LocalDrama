import { reactive, ref } from 'vue'

export function useStoryboardCardBindings({
  sbCharacterIds,
  sbPropIds,
  sbSceneId,
  sbNarration,
  sbUniversalSegmentText,
  ttsSbNarrationIds,
  generatingUniversalSegmentIds,
  generatingSbFirstImageIds,
  usingPrevTailAsFirstIds,
  sbImageUploadSlotById,
  generatingSbLastImageIds,
  generatingSbImageIds,
  uploadingSbImageId,
  upscalingSbIds,
  linkingTailFrameIds,
  ttsSbIds,
  getMovementLabel,
  onOpenVideoParamsDialog,
  isSbUniversalMode,
  onToggleSbUniversalMode,
  onInsertStoryboardBefore,
  onDeleteSingleStoryboard,
  setSbCharacterIds,
  setSbPropIds,
  onStoryboardSceneChange,
  openImagePreview,
  onSbAddCharacterCommand,
  onOpenSbPromptDialog,
  onSaveSbNarrationField,
  onTtsSbNarration,
  sbNarrationAudioRelPath,
  playSbNarrationTts,
  onUniversalSegmentPromptMenu,
  sbUniversalSegmentTrimmed,
  getSbUniversalOmniRefSlots,
  onSaveUniversalSegmentField,
  getStripItems,
  getFirstImageFile,
  doUploadSbImage,
  getSbFirstImage,
  canUsePrevTailAsFirst,
  onUsePrevTailAsFirst,
  onUploadSbImageClick,
  showSbFramePromptPreview,
  onGenerateSbFrameImage,
  getSbLastImage,
  onLastFrameLayoutLockChange,
  stripItemTitle,
  onStripItemClick,
  onRemoveSbHistoryImage,
  getSbImage,
  onGenerateSbImage,
  onSelectStripItem,
  hasSbImage,
  onGenerateSbFramePair,
  hasSbFirstLastPair,
  getSbLocalImage,
  onUpscaleSbImage,
  getSbVideo,
  sbMainVideoPlayerKey,
  getSbVideoError,
  getSbResumableFailedVideo,
  onResumeSbVideoPoll,
  isSbVideoGenerating,
  sbCanSubmitVideo,
  onGenerateSbVideo,
  getVideoStripItems,
  onSelectSbMainVideo,
  getNextStoryboard,
  onLinkTailFrameToNext,
  onTtsSbDialogue,
  sbDialogueAudioRelPath,
  playSbDialogueTts,
}) {
  const dragOverSbId = ref(null)

  function onSbImageDragOver(e, sbId) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    dragOverSbId.value = sbId
  }

  function onSbImageDragLeave(e, sbId) {
    e.preventDefault()
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
    if (sbId != null && dragOverSbId.value !== sbId) return
    dragOverSbId.value = null
  }

  function onSbImageDrop(e, sb) {
    e.preventDefault()
    e.stopPropagation()
    dragOverSbId.value = null
    const file = getFirstImageFile ? getFirstImageFile(e.dataTransfer) : null
    if (file && sb?.id && doUploadSbImage) doUploadSbImage(sb.id, file)
  }

  const sbCardState = reactive({
    sbCharacterIds,
    sbPropIds,
    sbSceneId,
    sbNarration,
    sbUniversalSegmentText,
    ttsSbNarrationIds,
    generatingUniversalSegmentIds,
    dragOverSbId,
    generatingSbFirstImageIds,
    usingPrevTailAsFirstIds,
    sbImageUploadSlotById,
    generatingSbLastImageIds,
    generatingSbImageIds,
    uploadingSbImageId,
    upscalingSbIds,
    linkingTailFrameIds,
    ttsSbIds,
  })

  const sbCardActions = {
    getMovementLabel,
    onOpenVideoParamsDialog,
    isSbUniversalMode,
    onToggleSbUniversalMode,
    onInsertStoryboardBefore,
    onDeleteSingleStoryboard,
    setSbCharacterIds,
    setSbPropIds,
    setSbSceneId: (sbId, v) => {
      sbSceneId.value = { ...sbSceneId.value, [sbId]: v }
    },
    onStoryboardSceneChange,
    openImagePreview,
    onSbAddCharacterCommand,
    onOpenSbPromptDialog,
    onSaveSbNarrationField,
    onTtsSbNarration,
    sbNarrationAudioRelPath,
    playSbNarrationTts,
    onUniversalSegmentPromptMenu,
    sbUniversalSegmentTrimmed,
    getSbUniversalOmniRefSlots,
    onSaveUniversalSegmentField,
    getStripItems,
    onSbImageDragOver,
    onSbImageDragLeave,
    onSbImageDrop,
    getSbFirstImage,
    canUsePrevTailAsFirst,
    onUsePrevTailAsFirst,
    onUploadSbImageClick,
    showSbFramePromptPreview,
    onGenerateSbFrameImage,
    getSbLastImage,
    onLastFrameLayoutLockChange,
    stripItemTitle,
    onStripItemClick,
    onRemoveSbHistoryImage,
    getSbImage,
    onGenerateSbImage,
    onSelectStripItem,
    hasSbImage,
    onGenerateSbFramePair,
    hasSbFirstLastPair,
    getSbLocalImage,
    onUpscaleSbImage,
    getSbVideo,
    sbMainVideoPlayerKey,
    getSbVideoError,
    getSbResumableFailedVideo,
    onResumeSbVideoPoll,
    isSbVideoGenerating,
    sbCanSubmitVideo,
    onGenerateSbVideo,
    getVideoStripItems,
    onSelectSbMainVideo,
    getNextStoryboard,
    onLinkTailFrameToNext,
    onTtsSbDialogue,
    sbDialogueAudioRelPath,
    playSbDialogueTts,
  }

  return {
    dragOverSbId,
    onSbImageDragOver,
    onSbImageDragLeave,
    onSbImageDrop,
    sbCardState,
    sbCardActions,
  }
}
