import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { dramaAPI } from '@/api/drama'
import { storyboardsAPI } from '@/api/storyboards'
import { exportStoryboardSheet } from '@/utils/exportStoryboardSheet'
import { backfillDramaStylePromptMetadataIfNeeded, CUSTOM_STYLE_VALUE } from '@/constants/styleOptions'

export function useProjectSettings({
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
}) {
  const exportingStoryboardSheet = ref(false)

  function syncStoryboardStateFromEpisode(ep) {
    if (syncAssociationsFromEpisode) syncAssociationsFromEpisode(ep)
    if (syncVideoParamsFromStoryboards) syncVideoParamsFromStoryboards(ep?.storyboards || [])
  }

  function onEpisodeSelect(epId) {
    if (epId == null) {
      store.setCurrentEpisode(null)
      store.setScriptContent('')
      scriptTitle.value = ''
      syncStoryboardStateFromEpisode(null)
      return
    }
    const list = store.drama?.episodes || []
    const ep = list.find((e) => Number(e.id) === Number(epId))
    if (!ep) return
    store.setCurrentEpisode(ep)
    store.setScriptContent(ep.script_content || '')
    scriptTitle.value = ep.title || t('filmCreate.episodeNum', { num: ep.episode_number || 0 })
    syncStoryboardStateFromEpisode(ep)
    if (loadStoryboardMedia) loadStoryboardMedia()
    if (recoverAndSyncEpisodeTasks) recoverAndSyncEpisodeTasks(epId)
  }

  async function loadDrama() {
    if (!store.dramaId) return
    try {
      let d = await dramaAPI.get(store.dramaId)
      d = await backfillDramaStylePromptMetadataIfNeeded(dramaAPI, store.dramaId, d)
      store.setDrama(d)
      storyInput.value = (d.description || '').toString().trim()
      storyStyle.value = (d.metadata && d.metadata.story_style) ? d.metadata.story_style : ''
      storyType.value = d.genre || ''
      generationStyle.value = d.style || ''
      if ((d.style || '') === CUSTOM_STYLE_VALUE) {
        customStylePrompt.value = (d.metadata?.style_prompt_zh || d.metadata?.style_prompt_en || '').toString()
      } else {
        customStylePrompt.value = ''
      }
      projectAspectRatio.value = (d.metadata && d.metadata.aspect_ratio) ? d.metadata.aspect_ratio : '16:9'
      videoClipDuration.value = (d.metadata && d.metadata.video_clip_duration) ? Number(d.metadata.video_clip_duration) : 5
      storyboardIncludeNarration.value = !!(d.metadata && d.metadata.storyboard_include_narration)
      storyboardUniversalOmni.value = !!(d.metadata && d.metadata.storyboard_universal_omni)
      storyboardUseFirstLastFrame.value = !!(d.metadata && d.metadata.storyboard_use_first_last_frame)
      lastFrameUseFirstLayoutLock.value = d.metadata?.last_frame_use_first_layout_lock !== false
      if (storyboardUseFirstLastFrame.value && gridMode.value !== 'single') {
        gridMode.value = 'single'
      }
      const list = d.episodes || []
      const currentId = selectedEpisodeId.value
      let ep = currentId != null ? list.find((e) => Number(e.id) === Number(currentId)) : null
      if (!ep) {
        const wantNum = savedCurrentEpisodeNumber.value
        ep = list.find((e) => Number(e.episode_number) === Number(wantNum)) || list[0] || null
      }
      store.setCurrentEpisode(ep)
      if (ep) {
        store.setScriptContent(ep.script_content || '')
        scriptTitle.value = ep.title || t('filmCreate.episodeNum', { num: ep.episode_number || 0 })
        selectedEpisodeId.value = ep.id
      } else {
        store.setScriptContent('')
        scriptTitle.value = ''
        selectedEpisodeId.value = null
      }
      syncStoryboardStateFromEpisode(ep)
      if (loadStoryboardMedia) await loadStoryboardMedia()
      if (recoverAndSyncEpisodeTasks) await recoverAndSyncEpisodeTasks(ep?.id)
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.loadFailed'))
    }
  }

  function onLastFrameLayoutLockChange() {
    saveProjectSettings()
  }

  function onStoryboardUseFirstLastFrameChange() {
    if (storyboardUseFirstLastFrame.value && gridMode.value !== 'single') {
      gridMode.value = 'single'
      ElMessage.info(t('filmCreate.firstLastFrameSingleGridTip'))
    }
    saveProjectSettings(false)
  }

  function onNovelImported({ multiple }) {
    if (multiple) {
      loadDrama()
    }
  }

  function updateStoryboardDialogue(_sbId) {
    // Reserved for debounce update dialogue
  }

  async function saveProjectSettings(includeGenerationStyle = false) {
    if (!store.dramaId) return
    const metadata = {
      story_style: storyStyle.value || undefined,
      aspect_ratio: projectAspectRatio.value || '16:9',
      video_clip_duration: videoClipDuration.value || 5,
      storyboard_include_narration: !!storyboardIncludeNarration.value,
      storyboard_universal_omni: !!storyboardUniversalOmni.value,
      storyboard_use_first_last_frame: !!storyboardUseFirstLastFrame.value,
      last_frame_use_first_layout_lock: !!lastFrameUseFirstLayoutLock.value,
    }
    if (includeGenerationStyle && projectStylePromptMetadata) {
      Object.assign(metadata, projectStylePromptMetadata())
    }
    const payload = {
      genre: storyType.value || undefined,
      metadata,
    }
    if (includeGenerationStyle) {
      payload.style = generationStyle.value || undefined
    }
    dramaAPI.saveOutline(store.dramaId, payload).catch((e) => console.error('Settings auto-save failed', e))
  }

  async function onExportStoryboardSheet() {
    const boards = store.storyboards || []
    if (!boards.length) {
      ElMessage.warning(t('filmCreate.noStoryboardsWarning'))
      return
    }
    const epNum = store.currentEpisode?.episode_number
    const dramaTitle = (store.drama?.title || 'project').replace(/[\\/:*?"<>|]/g, '_')
    const epLabel = epNum != null ? t('filmCreate.episodeNum', { num: epNum }) : `ep${store.currentEpisode?.id || '1'}`
    const filenameBase = `${dramaTitle}-${epLabel}-${t('filmCreate.storyboardSheetFilename')}`
    const useFirstLast = !!storyboardUseFirstLastFrame.value

    exportingStoryboardSheet.value = true
    const framePromptBySbId = {}
    try {
      await Promise.all(
        boards.map(async (sb) => {
          try {
            const res = await storyboardsAPI.getFramePrompts(sb.id)
            const fps = res?.frame_prompts || []
            framePromptBySbId[sb.id] = {
              first: fps.find((r) => r.frame_type === 'first')?.prompt?.trim() || '',
              last: fps.find((r) => r.frame_type === 'last')?.prompt?.trim() || '',
            }
          } catch (_) {
            framePromptBySbId[sb.id] = { first: '', last: '' }
          }
        })
      )
    } finally {
      exportingStoryboardSheet.value = false
    }

    function resolveFirstFramePrompt(sbId) {
      const cached = framePromptBySbId[sbId]?.first
      if (cached) return cached
      const imgPrompt = getSbFirstImage ? getSbFirstImage(sbId)?.prompt?.trim() : ''
      if (imgPrompt) return imgPrompt
      if (useFirstLast && buildFirstFrameImagePrompt) return buildFirstFrameImagePrompt(sbId)
      return ''
    }

    function resolveLastFramePrompt(sbId) {
      const cached = framePromptBySbId[sbId]?.last
      if (cached) return cached
      const imgPrompt = getSbLastImage ? getSbLastImage(sbId)?.prompt?.trim() : ''
      if (imgPrompt) return imgPrompt
      if (useFirstLast && buildLastFrameImagePrompt) return buildLastFrameImagePrompt(sbId)
      return ''
    }

    const result = exportStoryboardSheet(
      {
        storyboards: boards,
        getScene: (sbId) => (getSbSelectedScene ? getSbSelectedScene(sbId) : null),
        getCharacters: (sbId) => (getSbSelectedCharacters ? getSbSelectedCharacters(sbId) : []),
        getProps: (sbId) => (getSbSelectedProps ? getSbSelectedProps(sbId) : []),
        getMovementLabel,
        getFirstFramePrompt: resolveFirstFramePrompt,
        getLastFramePrompt: resolveLastFramePrompt,
        getField(sb, key) {
          const id = sb.id
          const map = {
            title: sbFields?.sbTitle?.value?.[id],
            location: sbFields?.sbLocation?.value?.[id],
            time: sbFields?.sbTime?.value?.[id],
            duration: sbFields?.sbDuration?.value?.[id] ?? sb.duration,
            dialogue: sbFields?.sbDialogue?.value?.[id],
            narration: sbFields?.sbNarration?.value?.[id],
            action: sbFields?.sbAction?.value?.[id],
            result: sbFields?.sbResult?.value?.[id],
            atmosphere: sbFields?.sbAtmosphere?.value?.[id],
            shot_type: sbFields?.sbShotType?.value?.[id],
            movement: sbFields?.sbMovement?.value?.[id],
            layout_description: sbFields?.sbLayoutDescription?.value?.[id],
            universal_segment_text: sbFields?.sbUniversalSegmentText?.value?.[id],
          }
          if (Object.prototype.hasOwnProperty.call(map, key)) {
            const v = map[key]
            return v != null && v !== '' ? v : sb[key]
          }
          return sb[key]
        },
      },
      filenameBase
    )

    if (!result.ok) {
      ElMessage.warning(t('filmCreate.noExportableContentWarning'))
      return
    }
    ElMessage.success(t('filmCreate.exportedStoryboardSheetCount', { count: result.count }))
  }

  function applyRouteToStore() {
    const id = route?.params?.id
    if (id && id !== 'new') {
      store.setDrama({ id: Number(id) })
      if (route?.query?.episode) {
        selectedEpisodeId.value = Number(route.query.episode)
      }
      loadDrama()
    } else {
      store.reset()
      storyInput.value = ''
      scriptTitle.value = ''
      selectedEpisodeId.value = null
      savedCurrentEpisodeNumber.value = 1
      storyStyle.value = ''
      storyType.value = ''
      if (scriptLanguage) scriptLanguage.value = 'zh'
      if (scriptStoryboardStyle) scriptStoryboardStyle.value = ''
      generationStyle.value = ''
      customStylePrompt.value = ''
    }
  }

  return {
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
  }
}
