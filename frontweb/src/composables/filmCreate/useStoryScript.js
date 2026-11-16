import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { dramaAPI } from '@/api/drama'
import { storyboardsAPI } from '@/api/storyboards'
import { parseScriptIntoEpisodes } from '@/utils/scriptEpisodes'
import { runGenerateStoryFromPremise } from '@/composables/useStoryGeneration'
import { buildExtractTaskMeta } from '@/composables/useGenerationTaskSync'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export function useStoryScript({
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
  loadDrama,
  pollTask,
  genStore,
  getSelectedStyle,
  projectStylePromptMetadata,
  polishUniversalSegmentsAfterGeneration,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  trackFilmCreateAction,
  onEpisodeSelect,
  storyboardIncludeNarration = ref(false),
  storyboardUniversalOmni = ref(false),
}) {
  const storyboardCount = ref(null)
  const videoDuration = ref(null)

  const storyGenerating = ref(false)
  const scriptGenerating = ref(false)

  const showSelectScriptDialog = ref(false)
  const selectScriptLoading = ref(false)
  const selectScriptImporting = ref(false)
  const selectScriptDramas = ref([])
  const selectPreviewEpisodeId = ref('')

  function clipSecondsForStoryboardEstimate() {
    const c = Number(videoClipDuration?.value)
    return Math.max(2, Math.min(60, Number.isFinite(c) && c > 0 ? c : 5))
  }

  function shotCountEstimateFromDurationSec(sec) {
    const s = Math.max(10, Math.min(600, Math.round(Number(sec) || 0)))
    const clip = clipSecondsForStoryboardEstimate()
    const ideal = s / clip
    const locked = Math.max(1, Math.min(200, Math.round(ideal)))
    const minR = Math.max(1, locked - 1)
    const maxR = Math.min(200, locked + 1)
    const range = minR >= maxR ? { min: locked, max: locked } : { min: minR, max: maxR }
    return { locked, range, clip }
  }

  function estimateVideoDurationSecFromCharLen(charLen) {
    const len = Math.max(0, Math.floor(Number(charLen) || 0))
    if (len < 1) return null
    const raw = Math.round(10 + (len / 600) * 60)
    return Math.min(600, Math.max(10, raw))
  }

  const scriptStoryboardEstimate = computed(() => {
    const script = (scriptContent?.value || '').toString().trim()
    const len = script.length
    if (!len) return null
    const sec = estimateVideoDurationSecFromCharLen(len)
    if (sec == null) return null
    const { locked, range, clip } = shotCountEstimateFromDurationSec(sec)
    return { sec, locked, range, clip, len }
  })

  const scriptEstimateVideoDurationHint = computed(() => {
    const e = scriptStoryboardEstimate.value
    if (!e) return ''
    return `(${t('filmCreate.approxSec', { sec: e.sec })})`
  })

  const scriptEstimateVideoDurationTitle = computed(() => {
    const e = scriptStoryboardEstimate.value
    if (!e) return ''
    return t('filmCreate.estVideoDurationTitle', { len: e.len, sec: e.sec })
  })

  const scriptEstimateStoryboardHint = computed(() => {
    const e = scriptStoryboardEstimate.value
    if (!e) return ''
    if (e.range && e.range.min !== e.range.max) {
      return `(${t('filmCreate.approxShotsRange', { locked: e.locked, min: e.range.min, max: e.range.max })})`
    }
    return `(${t('filmCreate.approxShots', { locked: e.locked })})`
  })

  const scriptEstimateStoryboardTitle = computed(() => {
    const e = scriptStoryboardEstimate.value
    if (!e) return ''
    return t('filmCreate.estStoryboardTitle', { sec: e.sec, clip: e.clip, locked: e.locked })
  })

  function scriptTextTrimmedForEstimate() {
    return (scriptContent?.value || '').toString().trim()
  }

  function userFilledStoryboardCount() {
    const v = storyboardCount.value
    return v != null && Number.isFinite(Number(v)) && Number(v) >= 1
  }

  function userFilledVideoDuration() {
    const v = videoDuration.value
    return v != null && Number.isFinite(Number(v)) && Number(v) >= 10
  }

  function getVideoDurationForApi() {
    if (userFilledVideoDuration()) return Math.round(Number(videoDuration.value))
    const len = scriptTextTrimmedForEstimate().length
    if (len < 1) return undefined
    return estimateVideoDurationSecFromCharLen(len) ?? undefined
  }

  function getStoryboardCountForApi() {
    if (userFilledStoryboardCount()) return Math.round(Number(storyboardCount.value))
    const sec = getVideoDurationForApi()
    if (sec == null || !Number.isFinite(sec)) return undefined
    return shotCountEstimateFromDurationSec(sec).locked
  }

  async function saveScriptToBackend(content) {
    const trimmed = (content ?? '').toString().trim()
    if (!trimmed) return
    const parsed = parseScriptIntoEpisodes(trimmed)
    const multiFromMarkers = parsed.split && parsed.episodes.length >= 2
    const toPayload = (list) =>
      list.map((e, i) => ({
        episode_number: i + 1,
        title: (e.title && String(e.title).trim()) || t('filmCreate.episodeNum', { num: i + 1 }),
        script_content: e.script_content ?? '',
        description: null,
        duration: 0,
      }))

    let did = store.dramaId
    const curEp = store.currentEpisode
    if (!did) {
      const drama = await dramaAPI.create({
        title: scriptTitle.value || t('filmCreate.newStoryTitle'),
        description: storyInput.value?.trim() || trimmed.slice(0, 200),
        genre: storyType.value || undefined,
        style: generationStyle.value || undefined,
        metadata: {
          ...(projectStylePromptMetadata ? projectStylePromptMetadata() : {}),
          story_style: storyStyle.value || undefined,
          aspect_ratio: projectAspectRatio.value || '16:9',
        },
      })
      store.setDrama(drama)
      did = drama.id
      savedCurrentEpisodeNumber.value = 1
      const first = parsed.episodes[0] || { title: '', script_content: trimmed }
      const episodes = multiFromMarkers
        ? toPayload(parsed.episodes)
        : [
            {
              episode_number: 1,
              title: scriptTitle.value || first.title || t('filmCreate.episodeNum', { num: 1 }),
              script_content: first.script_content || trimmed,
            },
          ]
      await dramaAPI.saveEpisodes(did, episodes)
      await loadDrama()
      if (route.params.id === 'new') {
        router.replace('/film/' + did)
      }
      if (multiFromMarkers) {
        ElMessage.success(t('filmCreate.splitIntoEpisodesSuccess', { count: episodes.length }))
      }
      return { created: true }
    }
    if (multiFromMarkers) {
      savedCurrentEpisodeNumber.value = 1
      const payload = toPayload(parsed.episodes)
      await dramaAPI.saveEpisodes(did, payload)
      if (storyInput.value?.trim()) {
        await dramaAPI.saveOutline(did, {
          summary: storyInput.value.trim(),
          genre: storyType.value || undefined,
          style: generationStyle.value || undefined,
          metadata: {
            ...(projectStylePromptMetadata ? projectStylePromptMetadata() : {}),
            story_style: storyStyle.value || undefined,
            aspect_ratio: projectAspectRatio.value || '16:9',
          },
        }).catch(() => {})
      }
      await loadDrama()
      ElMessage.success(t('filmCreate.splitIntoEpisodesSuccess', { count: payload.length }))
      return { created: false, splitEpisodes: true }
    }
    const episodes = store.drama?.episodes || []
    savedCurrentEpisodeNumber.value = curEp?.episode_number ?? 1
    const updated = episodes.map((ep, i) => {
      const num = ep.episode_number ?? i + 1
      const isCurrent = curEp && Number(ep.id) === Number(curEp.id)
      const first = parsed.episodes[0]
      const singleBody = first?.script_content ?? trimmed
      const singleTitle = first?.title && String(first.title).trim()
      return {
        episode_number: num,
        title: isCurrent
          ? scriptTitle.value || singleTitle || t('filmCreate.episodeNum', { num })
          : ep.title || '',
        script_content: isCurrent ? (parsed.episodes.length === 1 && singleTitle ? singleBody : trimmed) : (ep.script_content || ''),
        description: ep.description,
        duration: ep.duration,
      }
    })
    if (updated.length === 0) {
      updated.push({ episode_number: 1, title: scriptTitle.value || t('filmCreate.episodeNum', { num: 1 }), script_content: trimmed })
    }
    await dramaAPI.saveEpisodes(did, updated)
    if (storyInput.value?.trim()) {
      await dramaAPI.saveOutline(did, {
        summary: storyInput.value.trim(),
        genre: storyType.value || undefined,
        style: generationStyle.value || undefined,
        metadata: {
          ...(projectStylePromptMetadata ? projectStylePromptMetadata() : {}),
          story_style: storyStyle.value || undefined,
          aspect_ratio: projectAspectRatio.value || '16:9',
        },
      }).catch(() => {})
    }
    await loadDrama()
    return { created: false }
  }

  async function onGenerateStory() {
    trackFilmCreateAction?.('generate_script_click')
    await runGenerateStoryFromPremise({
      premise: storyInput.value,
      storyStyle: storyStyle.value,
      storyType: storyType.value,
      storyEpisodeCount: storyEpisodeCount?.value,
      scriptTitle: scriptTitle?.value,
      generationStyle: generationStyle.value,
      customStylePrompt: customStylePrompt.value,
      projectAspectRatio: projectAspectRatio.value,
      store,
      router,
      route,
      loadDrama,
      savedCurrentEpisodeNumber,
      selectedEpisodeId,
      onEpisodeSelect,
      storyGenerating,
      scriptGenerating,
      pollTask,
      replaceRouteWhenNew: true,
      skipPostLoad: false,
      onComplete: ({ episodeCount }) => {
        trackFilmCreateAction?.('generate_script_complete', {
          extra: { episode_count: episodeCount },
        })
      },
    })
  }

  function openSelectScriptDialog() {
    showSelectScriptDialog.value = true
  }

  async function loadSelectScriptList() {
    selectScriptLoading.value = true
    try {
      const res = await dramaAPI.list({ page: 1, page_size: 100 })
      const items = res?.items ?? []
      selectScriptDramas.value = items.filter((d) => d?.metadata?.script_template === true)
    } catch {
      selectScriptDramas.value = []
    } finally {
      selectScriptLoading.value = false
    }
  }

  async function onPickScriptFromDialog(sourceId) {
    if (!sourceId || selectScriptImporting.value) return
    const srcNum = Number(sourceId)
    const routeId = route.params.id
    const targetFromRoute = routeId && routeId !== 'new' ? Number(routeId) : null
    const targetId = store.dramaId ?? targetFromRoute ?? null

    if (targetId != null && Number(targetId) === srcNum) {
      ElMessage.info(t('filmCreate.currentProjectAlreadyOpened'))
      return
    }

    if (targetId != null) {
      try {
        await ElMessageBox.confirm(
          t('filmCreate.importScriptConfirmMsg'),
          t('filmCreate.importScriptConfirmTitle'),
          { type: 'warning', confirmButtonText: t('common.import'), cancelButtonText: t('common.cancel') }
        )
      } catch {
        return
      }
    }

    selectScriptImporting.value = true
    try {
      const src = await dramaAPI.get(srcNum)
      const rawEps = [...(src.episodes || [])].sort(
        (a, b) => (Number(a.episode_number) || 0) - (Number(b.episode_number) || 0)
      )
      const summary = (src.description || '').toString().trim()
      const episodesPayload = rawEps.map((ep, i) => ({
        episode_number: ep.episode_number != null ? Number(ep.episode_number) : i + 1,
        title: (ep.title || '').toString(),
        script_content: ep.script_content ?? '',
        description: ep.description ?? null,
        duration: ep.duration ?? 0,
      }))

      if (!targetId) {
        if (episodesPayload.length === 0 && !summary) {
          ElMessage.warning(t('filmCreate.noSummaryOrEpisodesToImport'))
          return
        }
        const title = (src.title || t('filmCreate.newStoryTitle')).toString().trim() || t('filmCreate.newStoryTitle')
        const created = await dramaAPI.create({
          title,
          description: summary || undefined,
          metadata: {},
        })
        const workId = created.id
        store.setDrama({ id: workId })
        if (episodesPayload.length > 0) {
          await dramaAPI.saveEpisodes(workId, episodesPayload)
        }
        if (summary) {
          await dramaAPI.saveOutline(workId, { summary }).catch(() => {})
        }
        showSelectScriptDialog.value = false
        router.replace('/film/' + workId)
        ElMessage.success(t('filmCreate.createdAndImportedSuccess'))
        scriptWorkbenchMode.value = 'select'
        return
      }

      if (summary) {
        await dramaAPI.saveOutline(targetId, { summary }).catch(() => {})
      }
      if (episodesPayload.length > 0) {
        await dramaAPI.saveEpisodes(targetId, episodesPayload)
      } else if (!summary) {
        ElMessage.warning(t('filmCreate.noSummaryOrEpisodesToImport'))
        return
      }

      showSelectScriptDialog.value = false
      await loadDrama()
      ElMessage.success(t('filmCreate.importedScriptSuccessNoSwitch'))
      scriptWorkbenchMode.value = 'select'
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.importFailed'))
    } finally {
      selectScriptImporting.value = false
    }
  }

  watch(
    () => [store.drama?.episodes, selectedEpisodeId.value],
    () => {
      const eps = store.drama?.episodes || []
      if (eps.length > 1) {
        const cur = selectedEpisodeId.value
        const hit = cur != null && eps.some((e) => Number(e.id) === Number(cur))
        selectPreviewEpisodeId.value = hit ? String(cur) : String(eps[0].id)
      } else {
        selectPreviewEpisodeId.value = ''
      }
    },
    { deep: true, immediate: true }
  )

  async function onGenerateScript() {
    trackFilmCreateAction?.('save_script_click')
    const content = (scriptContent.value ?? store.scriptContent ?? '').toString().trim()
    if (!content) {
      ElMessage.warning(t('filmCreate.generateOrInputScriptFirst'))
      return
    }
    scriptGenerating.value = true
    try {
      const result = await saveScriptToBackend(content)
      if (result?.created) {
        ElMessage.success(t('filmCreate.projectCreatedScriptSaved'))
      } else {
        ElMessage.success(t('filmCreate.scriptSaved'))
      }
      trackFilmCreateAction?.('save_script_complete', {
        extra: { created_project: !!result?.created },
      })
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    } finally {
      scriptGenerating.value = false
    }
  }

  async function onAddEpisode() {
    if (!store.dramaId) return
    const list = store.drama?.episodes || []
    const nextNum = list.length > 0
      ? Math.max(...list.map((e) => Number(e.episode_number) || 0), 0) + 1
      : 1
    const updated = list.map((ep, i) => ({
      episode_number: ep.episode_number ?? i + 1,
      title: ep.title || t('filmCreate.episodeNum', { num: ep.episode_number ?? i + 1 }),
      script_content: ep.script_content || '',
      description: ep.description,
      duration: ep.duration
    }))
    updated.push({
      episode_number: nextNum,
      title: t('filmCreate.episodeNum', { num: nextNum }),
      script_content: '',
      description: null,
      duration: 0
    })
    try {
      await dramaAPI.saveEpisodes(store.dramaId, updated)
      savedCurrentEpisodeNumber.value = nextNum
      await loadDrama()
      ElMessage.success(t('filmCreate.addedEpisodeSuccess', { num: nextNum }))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgAddFailed'))
    }
  }

  async function refreshStoryboardsForEpisode(episodeId) {
    if (!episodeId) return
    try {
      const res = await dramaAPI.getStoryboards(episodeId)
      const list = Array.isArray(res) ? res : (res?.storyboards ?? null)
      if (!Array.isArray(list)) return
      if (Number(store.currentEpisode?.id) === Number(episodeId)) {
        store.currentEpisode.storyboards = list
      }
      const epInDrama = store.drama?.episodes?.find((e) => Number(e.id) === Number(episodeId))
      if (epInDrama) {
        epInDrama.storyboards = list
      }
    } catch (_) {}
  }

  async function refreshStoryboardsOnly() {
    return refreshStoryboardsForEpisode(currentEpisodeId.value)
  }

  async function onGenerateStoryboard() {
    trackFilmCreateAction?.('generate_storyboard_click')
    const epId = currentEpisodeId.value
    if (!epId) return
    const meta = buildExtractTaskMeta(store, dramaId.value, epId, GEN_RESOURCE.GENERATE_STORYBOARD, t('filmCreate.aiGenerateStoryboard'))
    genStore.markRunning(meta)
    const refreshTimer = setInterval(() => refreshStoryboardsForEpisode(epId), 2000)
    try {
      const res = await dramaAPI.generateStoryboard(epId, {
        model: undefined,
        style: getSelectedStyle(),
        storyboard_count: getStoryboardCountForApi(),
        video_duration: getVideoDurationForApi(),
        aspect_ratio: projectAspectRatio.value || '16:9',
        include_narration: !!storyboardIncludeNarration.value,
        universal_omni_storyboard: !!storyboardUniversalOmni.value,
      })
      const taskId = res?.task_id ?? (typeof res === 'string' ? res : null)
      if (taskId) {
        const pollRes = await pollTask(taskId, () => loadDrama(), meta)
        if (pollRes?.status !== 'completed') return
        if (pollRes?.result?.truncated) {
          sbTruncatedWarning.value = true
          sbTruncatedDismissed.value = false
        }
      }
      await loadDrama()
      storyboardsAPI.batchInferParams(epId, false).catch(() => {})
      const polishRes = await polishUniversalSegmentsAfterGeneration?.({})
      const polishedN = polishRes?.polished ?? 0
      ElMessage.success(
        storyboardUniversalOmni.value
          ? polishedN > 0
            ? t('filmCreate.omniSbGenDoneWithPolish', { count: polishedN })
            : t('filmCreate.omniSbGenDone')
          : t('filmCreate.storyboardGenDone')
      )
      trackFilmCreateAction?.('generate_storyboard_complete', {
        extra: { storyboard_count: (store.storyboards || []).length },
      })
    } catch (e) {
      if (!e.response) ElMessage.error(e.message || t('filmCreate.generationFailed'))
    } finally {
      clearInterval(refreshTimer)
      genStore.markDone(meta)
    }
  }

  async function onAddSingleStoryboard() {
    if (!currentEpisodeId.value) {
      ElMessage.warning(t('filmCreate.msgSelectEpisodeFirst'))
      return
    }
    try {
      const maxNum = (store.storyboards || [])
        .filter(sb => sb.episode_id === currentEpisodeId.value)
        .reduce((max, sb) => Math.max(max, sb.storyboard_number || 0), 0)
      await storyboardsAPI.create({
        episode_id: currentEpisodeId.value,
        storyboard_number: maxNum + 1,
        title: t('filmCreate.shotTitleDefault', { num: maxNum + 1 }),
        description: '',
      })
      ElMessage.success(t('common.addSuccess'))
      await loadDrama()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgAddFailed'))
    }
  }

  async function onDeleteSingleStoryboard(id) {
    try {
      await ElMessageBox.confirm(t('filmCreate.confirmDeleteStoryboard'), t('common.warning'), {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })
      await storyboardsAPI.delete(id)
      ElMessage.success(t('common.deleteSuccess'))
      await loadDrama()
    } catch (e) {
      if (e !== 'cancel') {
        ElMessage.error(e.message || t('filmCreate.deleteFailed'))
      }
    }
  }

  async function onInsertStoryboardBefore(sb) {
    try {
      await storyboardsAPI.insertBefore(sb.id)
      ElMessage.success(t('filmCreate.insertedBlankShotSuccess'))
      await loadDrama()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.insertFailed'))
    }
  }

  return {
    storyboardCount,
    videoDuration,
    storyboardIncludeNarration,
    storyboardUniversalOmni,
    storyGenerating,
    scriptGenerating,
    showSelectScriptDialog,
    selectScriptLoading,
    selectScriptImporting,
    selectScriptDramas,
    selectPreviewEpisodeId,
    clipSecondsForStoryboardEstimate,
    shotCountEstimateFromDurationSec,
    estimateVideoDurationSecFromCharLen,
    scriptStoryboardEstimate,
    scriptEstimateVideoDurationHint,
    scriptEstimateVideoDurationTitle,
    scriptEstimateStoryboardHint,
    scriptEstimateStoryboardTitle,
    scriptTextTrimmedForEstimate,
    userFilledStoryboardCount,
    userFilledVideoDuration,
    getVideoDurationForApi,
    getStoryboardCountForApi,
    saveScriptToBackend,
    onGenerateStory,
    openSelectScriptDialog,
    loadSelectScriptList,
    onPickScriptFromDialog,
    onGenerateScript,
    onAddEpisode,
    refreshStoryboardsForEpisode,
    refreshStoryboardsOnly,
    onGenerateStoryboard,
    onAddSingleStoryboard,
    onDeleteSingleStoryboard,
    onInsertStoryboardBefore,
  }
}
