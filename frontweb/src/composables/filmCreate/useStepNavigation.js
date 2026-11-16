import { computed } from 'vue'
import { t } from '@/i18n'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'
import { createFilmCreateExportStep } from '@/utils/filmCreateNavigation'

export function useStepNavigation({
  genStore,
  dramaId,
  currentEpisodeId,
  scriptContent,
  isStoryGenRunning,
  characters,
  charactersGenerating,
  generatingCharIds,
  hasAssetImage,
  props,
  propsExtracting,
  generatingPropIds,
  scenes,
  scenesExtracting,
  generatingSceneIds,
  storyboards,
  storyboardGenerating,
  universalOmniPolishRunning,
  hasSbImage,
  generatingSbImageIds,
  batchImageRunning,
  getSbAllVideos,
  generatingSbVideoIds,
  batchVideoRunning,
}) {
  const navSteps = computed(() => {
    const epRunning = genStore.getRunningForEpisode(dramaId.value, currentEpisodeId.value)
    const episodeTasks = [...(genStore.tasks?.values?.() || [])].filter((task) =>
      Number(task.dramaId) === Number(dramaId.value)
      && Number(task.episodeId) === Number(currentEpisodeId.value)
    )
    const failedFor = (...resourceTypes) => episodeTasks.some((task) =>
      task.status === 'failed' && resourceTypes.includes(task.resourceType)
    )
    // 剧本
    const hasScript = !!(scriptContent?.value?.trim())
    const scriptStatus = isStoryGenRunning.value
      ? 'generating'
      : failedFor(GEN_RESOURCE.GENERATE_STORY) ? 'failed'
        : hasScript ? 'done' : 'pending'

    // 角色
    const charList = characters.value || []
    const charDone = charList.length > 0 && charList.every((c) => hasAssetImage(c))
    const charGen = charactersGenerating.value || generatingCharIds.size > 0
      || epRunning.some((tTask) => tTask.resourceType === GEN_RESOURCE.CHAR_IMAGE || tTask.resourceType === GEN_RESOURCE.EXTRACT_CHARACTERS)
    const charStatus = charGen ? 'generating'
      : failedFor(GEN_RESOURCE.CHAR_IMAGE, GEN_RESOURCE.EXTRACT_CHARACTERS) ? 'failed'
        : charDone ? 'done' : charList.length > 0 ? 'partial' : 'pending'

    // 道具
    const propList = props.value || []
    const propDone = propList.length > 0 && propList.every((p) => hasAssetImage(p))
    const propGen = propsExtracting.value || generatingPropIds.size > 0
      || epRunning.some((tTask) => tTask.resourceType === GEN_RESOURCE.PROP_IMAGE || tTask.resourceType === GEN_RESOURCE.EXTRACT_PROPS)
    const propStatus = propGen ? 'generating'
      : failedFor(GEN_RESOURCE.PROP_IMAGE, GEN_RESOURCE.EXTRACT_PROPS) ? 'failed'
        : propDone ? 'done' : propList.length > 0 ? 'partial' : 'pending'

    // 场景
    const sceneList = scenes.value || []
    const sceneDone = sceneList.length > 0 && sceneList.every((s) => hasAssetImage(s))
    const sceneGen = scenesExtracting.value || generatingSceneIds.size > 0
      || epRunning.some((tTask) => tTask.resourceType === GEN_RESOURCE.SCENE_IMAGE || tTask.resourceType === GEN_RESOURCE.EXTRACT_SCENES)
    const sceneStatus = sceneGen ? 'generating'
      : failedFor(GEN_RESOURCE.SCENE_IMAGE, GEN_RESOURCE.EXTRACT_SCENES) ? 'failed'
        : sceneDone ? 'done' : sceneList.length > 0 ? 'partial' : 'pending'

    // 分镜脚本
    const sbList = storyboards.value || []
    const sbScriptDone = sbList.length > 0
    const sbScriptGen = storyboardGenerating.value || universalOmniPolishRunning.value
      || epRunning.some((tTask) => tTask.resourceType === GEN_RESOURCE.GENERATE_STORYBOARD)
    const sbScriptStatus = sbScriptGen ? 'generating'
      : failedFor(GEN_RESOURCE.GENERATE_STORYBOARD) ? 'failed'
        : sbScriptDone ? 'done' : 'pending'

    // 分镜图
    const sbImgDone = sbList.length > 0 && sbList.every((sb) => hasSbImage(sb))
    const sbImgGen = generatingSbImageIds.size > 0 || batchImageRunning.value || epRunning.some((tTask) =>
      tTask.resourceType === GEN_RESOURCE.SB_IMAGE
      || tTask.resourceType === GEN_RESOURCE.SB_FIRST_IMAGE
      || tTask.resourceType === GEN_RESOURCE.SB_LAST_IMAGE
    )
    const sbImgStatus = sbImgGen ? 'generating'
      : failedFor(GEN_RESOURCE.SB_IMAGE, GEN_RESOURCE.SB_FIRST_IMAGE, GEN_RESOURCE.SB_LAST_IMAGE) ? 'failed'
        : sbImgDone ? 'done' : sbList.length > 0 ? 'partial' : 'pending'

    // 视频
    const sbVideoAllDone = sbList.length > 0 && sbList.every((sb) => (getSbAllVideos ? getSbAllVideos(sb.id) : []).length > 0)
    const sbVideoSome = sbList.some((sb) => (getSbAllVideos ? getSbAllVideos(sb.id) : []).length > 0)
    const sbVideoGen = batchVideoRunning.value || generatingSbVideoIds.size > 0
      || epRunning.some((tTask) => tTask.resourceType === GEN_RESOURCE.SB_VIDEO)
    const videoStatus = sbVideoGen ? 'generating'
      : failedFor(GEN_RESOURCE.SB_VIDEO) ? 'failed'
        : sbVideoAllDone ? 'done' : sbVideoSome ? 'partial' : 'pending'

    return [
      { key: 'script',   label: t('filmCreate.stepScript'),   anchor: 'anchor-script',     status: scriptStatus,    count: hasScript ? 1 : 0 },
      { key: 'chars',    label: t('filmCreate.stepCharacters'), anchor: 'anchor-characters', status: charStatus,      count: charList.length },
      { key: 'props',    label: t('filmCreate.stepProps'),      anchor: 'anchor-props',      status: propStatus,      count: propList.length },
      { key: 'scenes',   label: t('filmCreate.stepScenes'),     anchor: 'anchor-scenes',     status: sceneStatus,     count: sceneList.length },
      { key: 'sb',       label: t('filmCreate.stepStoryboard'), anchor: 'anchor-storyboard', status: sbScriptStatus,  count: sbList.length },
      { key: 'sbimg',    label: t('filmCreate.stepStoryboardImages'), anchor: 'anchor-storyboard', status: sbImgStatus, count: sbList.filter((sb) => hasSbImage(sb)).length },
      { key: 'video',    label: t('filmCreate.stepVideos'),     anchor: 'anchor-video',      status: videoStatus,     count: sbList.filter((sb) => (getSbAllVideos ? getSbAllVideos(sb.id) : []).length > 0).length },
      { ...createFilmCreateExportStep(t), count: sbList.length },
    ]
  })

  return {
    navSteps,
  }
}
