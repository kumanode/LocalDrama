import { useCharacters } from '@/composables/filmCreate/useCharacters'
import { useProps as usePropsComposable } from '@/composables/filmCreate/useProps'
import { useScenes } from '@/composables/filmCreate/useScenes'

export function useResourceAssets({
  store,
  dramaId,
  currentEpisodeId,
  getSelectedStyle,
  scriptLanguage,
  loadDrama,
  pollTask,
  pollUntilResourceHasImage,
  hasAssetImage,
  dramaAPI,
}) {
  const charComposable = useCharacters({
    store,
    dramaId,
    currentEpisodeId,
    getSelectedStyle,
    loadDrama,
    pollTask,
    pollUntilResourceHasImage,
    hasAssetImage,
  })
  const { charactersGenerating, generatingCharIds } = charComposable

  const propComposable = usePropsComposable({
    store,
    dramaId,
    currentEpisodeId,
    getSelectedStyle,
    loadDrama,
    pollTask,
    pollUntilResourceHasImage,
    hasAssetImage,
  })
  const { propsExtracting, generatingPropIds } = propComposable

  const sceneComposable = useScenes({
    store,
    dramaId,
    currentEpisodeId,
    getSelectedStyle,
    scriptLanguage,
    loadDrama,
    pollTask,
    pollUntilResourceHasImage,
    hasAssetImage,
    dramaAPI,
  })
  const { scenesExtracting, generatingSceneIds } = sceneComposable

  return {
    charComposable,
    charactersGenerating,
    generatingCharIds,
    propComposable,
    propsExtracting,
    generatingPropIds,
    sceneComposable,
    scenesExtracting,
    generatingSceneIds,
  }
}
