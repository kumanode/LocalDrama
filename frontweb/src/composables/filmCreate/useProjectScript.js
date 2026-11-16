import { computed, watch } from 'vue'
import { useProjectSettings } from './useProjectSettings'
import { useStoryScript } from './useStoryScript'

export function useProjectScript({
  store,
  route,
  router,
  dramaId,
  currentEpisodeId,
  storyInput,
  storyStyle,
  storyType,
  storyEpisodeCount,
  generationStyle,
  customStylePrompt,
  projectAspectRatio,
  videoClipDuration,
  storyboardIncludeNarration,
  storyboardUniversalOmni,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  selectedEpisodeId,
  savedCurrentEpisodeNumber,
  scriptTitle,
  scriptContent,
  scriptLanguage,
  scriptStoryboardStyle,
  scriptWorkbenchMode,
  projectStylePromptMetadata,
  syncAssociationsFromEpisode,
  syncVideoParamsFromStoryboards,
  loadStoryboardMedia,
  recoverAndSyncEpisodeTasks,
  getSbSelectedScene,
  getSbSelectedCharacters,
  getSbSelectedProps,
  getMovementLabel,
  getSbFirstImage,
  getSbLastImage,
  buildFirstFrameImagePrompt,
  buildLastFrameImagePrompt,
  sbFields,
  genStore,
  getSelectedStyle,
  polishUniversalSegmentsAfterGeneration,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  trackFilmCreateAction,
  pollTask,
}) {
  const projectSettings = useProjectSettings({
    store,
    route,
    router,
    storyInput,
    storyStyle,
    storyType,
    generationStyle,
    customStylePrompt,
    projectAspectRatio,
    videoClipDuration,
    storyboardIncludeNarration,
    storyboardUniversalOmni,
    storyboardUseFirstLastFrame,
    lastFrameUseFirstLayoutLock,
    gridMode,
    selectedEpisodeId,
    savedCurrentEpisodeNumber,
    scriptTitle,
    scriptLanguage,
    scriptStoryboardStyle,
    projectStylePromptMetadata,
    syncAssociationsFromEpisode,
    syncVideoParamsFromStoryboards,
    loadStoryboardMedia,
    recoverAndSyncEpisodeTasks,
    getSbSelectedScene,
    getSbSelectedCharacters,
    getSbSelectedProps,
    getMovementLabel,
    getSbFirstImage,
    getSbLastImage,
    buildFirstFrameImagePrompt,
    buildLastFrameImagePrompt,
    sbFields,
  })

  const {
    exportingStoryboardSheet,
    syncStoryboardStateFromEpisode,
    onEpisodeSelect,
    loadDrama,
    onLastFrameLayoutLockChange,
    onStoryboardUseFirstLastFrameChange,
    onNovelImported,
    updateStoryboardDialogue,
    saveProjectSettings,
    onExportStoryboardSheet,
    applyRouteToStore,
  } = projectSettings

  const storyScript = useStoryScript({
    store,
    route,
    router,
    dramaId,
    currentEpisodeId,
    scriptTitle,
    scriptContent,
    storyInput,
    storyStyle,
    storyType,
    storyEpisodeCount,
    scriptLanguage,
    scriptStoryboardStyle,
    generationStyle,
    customStylePrompt,
    projectAspectRatio,
    videoClipDuration,
    savedCurrentEpisodeNumber,
    selectedEpisodeId,
    scriptWorkbenchMode,
    loadDrama: (...args) => loadDrama(...args),
    pollTask,
    genStore,
    getSelectedStyle,
    projectStylePromptMetadata,
    polishUniversalSegmentsAfterGeneration,
    sbTruncatedWarning,
    sbTruncatedDismissed,
    trackFilmCreateAction,
    onEpisodeSelect: (...args) => onEpisodeSelect(...args),
  })

  const selectableScriptDramas = computed(() => {
    const cur = store.dramaId
    const list = storyScript.selectScriptDramas.value || []
    if (cur == null) return list
    return list.filter((d) => Number(d.id) !== Number(cur))
  })

  watch(
    () => selectedEpisodeId.value,
    (newId) => {
      if (!dramaId.value) return
      const currentInQuery = route.query.episode != null ? Number(route.query.episode) : null
      const desired = newId != null ? Number(newId) : null
      if (currentInQuery !== desired) {
        const newQuery = { ...route.query }
        if (desired != null) {
          newQuery.episode = String(desired)
        } else {
          delete newQuery.episode
        }
        router.replace({ query: newQuery }).catch(() => {})
      }
    },
    { flush: 'post' }
  )

  watch(
    () => route.query.episode,
    (newEp) => {
      if (!dramaId.value) return
      const newVal = newEp != null ? Number(newEp) : null
      const currentSel = selectedEpisodeId.value != null ? Number(selectedEpisodeId.value) : null
      if (currentSel !== newVal) {
        onEpisodeSelect(newVal)
      }
    }
  )

  return {
    ...projectSettings,
    ...storyScript,
    selectableScriptDramas,
  }
}
