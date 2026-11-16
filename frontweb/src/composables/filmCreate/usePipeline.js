import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { generationAPI } from '@/api/generation'
import { dramaAPI } from '@/api/drama'
import { characterAPI } from '@/api/characters'
import { sceneAPI } from '@/api/scenes'
import { propAPI } from '@/api/props'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'
import { generationSettingsAPI } from '@/api/prompts'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export function usePipeline({
  store,
  dramaId,
  currentEpisodeId,
  scriptLanguage,
  storyInput,
  projectAspectRatio,
  videoResolution,
  sceneUseQuadGrid,
  storyboardUseFirstLastFrame,
  storyboardUniversalOmni,
  storyboardIncludeNarration,
  getSelectedStyle,
  getStoryboardCountForApi,
  getVideoDurationForApi,
  hasAssetImage,
  hasSbImage,
  getSbFirstFrameUrl,
  getMainImageUrlForVideo,
  toAbsoluteImageUrl,
  sbVideoFirstLastUrls,
  buildSbVideoPromptForApi,
  getSbVideoDurationForApi,
  recordHasPlayableVideoUrl,
  sbVideos,
  loadDrama,
  loadStoryboardMedia,
  loadSingleStoryboardMedia,
  refreshStoryboardsOnly,
  pollUntilResourceHasImage,
  generatingCharIds,
  generatingSceneIds,
  generatingPropIds,
  generatingSbImageIds,
  generatingSbVideoIds,
  ensureProfessionalFramePrompt,
  isSbUniversalMode,
  sbCanSubmitVideo,
  collectSbOmniReferenceAbsoluteUrls,
  polishUniversalSegmentsAfterGeneration,
  buildSbGenMeta,
  resolvePollMeta,
  genStore,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  getFinalizeMergeOptions,
  trackFilmCreateAction,
}) {
  const pipelineRunning = ref(false)
  const pipelinePaused = ref(false)
  const pipelineAbortRequested = ref(false)
  const pipelineErrorLog = ref([])
  const pipelineCurrentStep = ref('')
  const pipelineStepIndex = ref(0)
  const pipelineStepTotal = ref(10)
  let pipelineResolveResume = null
  const pipelineCountdown = ref(0)
  const pipelineCountdownMsg = ref('')
  const pipelineConcurrency = ref(3)
  const pipelineVideoConcurrency = ref(3)
  const pipelineActiveTasks = reactive(new Set())

  async function loadPipelineConcurrency() {
    try {
      const res = await generationSettingsAPI.get()
      pipelineConcurrency.value = Math.max(1, Number(res?.concurrency) || 3)
      pipelineVideoConcurrency.value = Math.max(1, Number(res?.video_concurrency) || 3)
    } catch (_) {}
  }

  async function runConcurrently(items, concurrency, fn, options = {}) {
    let index = 0
    let anyPaused = false
    const getLabel = options.getLabel || (() => null)

    async function worker() {
      while (index < items.length) {
        const i = index++
        const item = items[i]
        const label = getLabel(item)
        if (label) pipelineActiveTasks.add(label)
        try {
          const result = await fn(item, i)
          if (result && typeof result === 'object' && result.paused) {
            anyPaused = true
            return
          }
        } finally {
          if (label) pipelineActiveTasks.delete(label)
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
    await Promise.allSettled(workers)
    return { paused: anyPaused }
  }

  function pollTaskWithPause(taskId, onDone, meta = {}) {
    return genStore.pollTask(taskId, resolvePollMeta(meta), onDone, {
      ElMessage,
      isPaused: () => pipelinePaused.value,
      isAborted: () => pipelineAbortRequested.value,
      abortErrorMsg: t('filmCreate.pipelineCancelled'),
      rejectOnAbort: true,
      timeoutMessage: t('filmCreate.taskQueryTimeout15m'),
    })
  }

  function waitForResume() {
    return new Promise((resolve) => {
      pipelineResolveResume = resolve
    })
  }

  function onPipelineResume() {
    pipelinePaused.value = false
    if (pipelineResolveResume) {
      pipelineResolveResume()
      pipelineResolveResume = null
    }
  }

  function addPipelineError(step, message) {
    const time = new Date().toLocaleTimeString('zh-CN')
    pipelineErrorLog.value = [...pipelineErrorLog.value, { time, step, message }]
  }

  async function checkPause() {
    if (pipelineAbortRequested.value) {
      throw Object.assign(new Error(t('filmCreate.pipelineCancelled')), { pipelineAborted: true })
    }
    while (pipelinePaused.value) {
      if (pipelineAbortRequested.value) {
        throw Object.assign(new Error(t('filmCreate.pipelineCancelled')), { pipelineAborted: true })
      }
      await waitForResume()
    }
  }

  function pipelineRest() {
    return new Promise((r) => setTimeout(r, 1000))
  }

  function skipPipelineCountdown() {
    pipelineCountdown.value = 0
  }

  async function runPipelineCountdown(totalSeconds, msg) {
    pipelineCountdown.value = totalSeconds
    pipelineCountdownMsg.value = msg
    try {
      while (pipelineCountdown.value > 0) {
        await checkPause()
        await new Promise((r) => setTimeout(r, 1000))
        if (pipelineCountdown.value > 0) pipelineCountdown.value--
      }
    } finally {
      pipelineCountdown.value = 0
      pipelineCountdownMsg.value = ''
    }
  }

  async function pipelineWithRetry(stepName, fn, maxRetries = 3) {
    let lastErr
    for (let r = 0; r < maxRetries; r++) {
      try {
        const result = await fn()
        if (result && result.paused === true) return result
        return true
      } catch (e) {
        lastErr = e
        if (r < maxRetries - 1) await pipelineRest()
      }
    }
    addPipelineError(stepName, t('filmCreate.retryFailed3Times', { error: lastErr?.message || String(lastErr) }))
    return false
  }

  async function startOneClickPipeline() {
    if (!currentEpisodeId.value || pipelineRunning.value) return
    trackFilmCreateAction('one_click_generate_start')
    pipelineErrorLog.value = []
    pipelineCurrentStep.value = ''
    pipelineStepIndex.value = 0
    pipelineActiveTasks.clear()
    pipelineStepTotal.value = 10
    pipelineRunning.value = true
    pipelinePaused.value = false
    pipelineAbortRequested.value = false
    try {
      await runOneClickPipeline(false)
    } catch (e) {
      if (!e?.pipelineAborted) throw e
    } finally {
      pipelineRunning.value = false
      pipelineActiveTasks.clear()
    }
  }

  async function startTextFrameworkPipeline() {
    if (!currentEpisodeId.value || pipelineRunning.value) return
    pipelineErrorLog.value = []
    pipelineCurrentStep.value = ''
    pipelineStepIndex.value = 0
    pipelineActiveTasks.clear()
    pipelineStepTotal.value = 4
    pipelineRunning.value = true
    pipelinePaused.value = false
    pipelineAbortRequested.value = false
    try {
      await runOneClickPipeline(true)
    } catch (e) {
      if (!e?.pipelineAborted) throw e
    } finally {
      pipelineRunning.value = false
      pipelineActiveTasks.clear()
    }
  }

  function setPipelineStep(idx, text) {
    pipelineStepIndex.value = idx
    pipelineCurrentStep.value = `[${t('filmCreate.stepNumOfTotal', { idx, total: pipelineStepTotal.value })}] ${text}`
  }

  async function runOneClickPipeline(textOnly = false) {
    const episodeId = currentEpisodeId.value
    const dramaIdVal = dramaId.value
    if (!episodeId || !dramaIdVal) return
    const style = getSelectedStyle()

    try {
      // 步骤 1：提取角色
      await checkPause()
      let chars = store.currentEpisode?.characters ?? []
      if (chars.length === 0) {
        setPipelineStep(1, t('filmCreate.pipeExtractChars'))
        try {
          const outline = (store.scriptContent || '').toString().trim() || (storyInput.value || '').toString().trim() || undefined
          const res = await generationAPI.generateCharacters(dramaIdVal, { episode_id: store.currentEpisode?.id ?? undefined, outline: outline || undefined })
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeExtractCharsShort'), result.error); return }
          } else {
            await loadDrama()
          }
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeExtractCharsShort'), e.message || String(e))
          return
        }
        chars = store.currentEpisode?.characters ?? []
      } else {
        setPipelineStep(1, t('filmCreate.pipeCharsExistSkip', { count: chars.length }))
      }

      // 步骤 2：提取场景
      await checkPause()
      let sceneList = store.currentEpisode?.scenes ?? []
      if (sceneList.length === 0) {
        setPipelineStep(2, t('filmCreate.pipeExtractScenes'))
        try {
          const res = await dramaAPI.extractBackgrounds(episodeId, { model: undefined, style, language: scriptLanguage.value })
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeExtractScenesShort'), result.error); return }
          } else {
            await loadDrama()
          }
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeExtractScenesShort'), e.message || String(e))
          return
        }
        sceneList = store.currentEpisode?.scenes ?? []
      } else {
        setPipelineStep(2, t('filmCreate.pipeScenesExistSkip', { count: sceneList.length }))
      }

      // 步骤 3：提取道具
      await checkPause()
      let propList = store.props ?? []
      if (propList.length === 0) {
        setPipelineStep(3, t('filmCreate.pipeExtractProps'))
        try {
          const res = await propAPI.extractFromScript(episodeId)
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeExtractPropsShort'), result.error); /* non-fatal */ }
          } else {
            await loadDrama()
          }
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeExtractPropsShort'), e.message || String(e))
        }
        propList = store.props ?? []
      } else {
        setPipelineStep(3, t('filmCreate.pipePropsExistSkip', { count: propList.length }))
      }

      // 步骤 4：生成分镜脚本
      await checkPause()
      await loadStoryboardMedia()
      let boards = store.storyboards || []
      const hadBoardsBeforeStep4 = boards.length > 0
      if (boards.length === 0) {
        setPipelineStep(4, t('filmCreate.pipeGenStoryboard'))
        const sbRefreshTimer = setInterval(refreshStoryboardsOnly, 2000)
        try {
          const res = await dramaAPI.generateStoryboard(episodeId, {
            style,
            aspect_ratio: projectAspectRatio.value || '16:9',
            storyboard_count: getStoryboardCountForApi(),
            video_duration: getVideoDurationForApi(),
            include_narration: !!storyboardIncludeNarration.value,
            universal_omni_storyboard: !!storyboardUniversalOmni.value,
          })
          const taskId = res?.task_id ?? (typeof res === 'string' ? res : null)
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { clearInterval(sbRefreshTimer); await waitForResume(); return }
            if (result?.error) {
              await loadDrama()
              addPipelineError(t('filmCreate.pipeGenStoryboardShort'), result.error)
              clearInterval(sbRefreshTimer)
              return
            }
            if (result?.result?.truncated) {
              sbTruncatedWarning.value = true
              sbTruncatedDismissed.value = false
            }
          }
          await loadDrama()
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeGenStoryboardShort'), e.message || String(e))
          clearInterval(sbRefreshTimer)
          return
        }
        clearInterval(sbRefreshTimer)
        await loadStoryboardMedia()
        boards = store.storyboards || []
      } else {
        setPipelineStep(4, t('filmCreate.pipeBoardsExistSkip', { count: boards.length }))
      }

      const generatedSbThisPipeline = !hadBoardsBeforeStep4
      if (generatedSbThisPipeline && storyboardUniversalOmni.value) {
        await checkPause()
        await polishUniversalSegmentsAfterGeneration({
          checkPause,
          onShotProgress: (cur, total, sb) =>
            setPipelineStep(
              4,
              t('filmCreate.pipePolishOmniStep', {
                cur,
                total,
                num: sb.storyboard_number ?? cur,
                title: (sb.title || '').slice(0, 16),
              })
            ),
          onShotError: (sb, msg) =>
            addPipelineError(
              t('filmCreate.pipePolishOmniShort'),
              `${t('filmCreate.shotHash', { num: sb.storyboard_number ?? sb.id })}: ${msg}`
            ),
        })
        await loadDrama()
        await loadStoryboardMedia()
      }

      if (textOnly) {
        pipelineCurrentStep.value = t('filmCreate.textFrameworkReadyNoMedia')
        ElMessage.success(t('filmCreate.textFrameworkGeneratedSuccess'))
        return
      }

      await runPipelineCountdown(20, t('filmCreate.countdownAfterSbPrompt'))
      await checkPause()

      // 步骤 5：生成角色图
      {
        const charsWithoutImage = chars.filter((c) => !hasAssetImage(c))
        const concurrency = pipelineConcurrency.value
        setPipelineStep(5, t('filmCreate.pipeGenCharImages', { count: charsWithoutImage.length, concurrency }))
        const { paused } = await runConcurrently(charsWithoutImage, concurrency, async (char) => {
          await checkPause()
          generatingCharIds.add(char.id)
          try {
            const stepName = `${t('filmCreate.charImageShort')} ${char.name || char.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const res = await characterAPI.generateImage(char.id, undefined, style)
              const taskId = res?.image_generation?.task_id ?? res?.task_id
              if (taskId) {
                const result = await pollTaskWithPause(taskId, () => loadDrama())
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else {
                await loadDrama()
                await pollUntilResourceHasImage(() => {
                  const list = store.currentEpisode?.characters ?? []
                  const c = list.find((x) => Number(x.id) === Number(char.id))
                  return !!(c && (c.image_url || c.local_path))
                })
              }
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingCharIds.delete(char.id)
          }
        }, { getLabel: (char) => `${t('filmCreate.charImageShort')} ${char.name || char.id}` })
        if (paused) { await waitForResume() }
      }

      // 步骤 6：生成场景图
      {
        const scenesWithoutImage = sceneList.filter((s) => !hasAssetImage(s))
        const concurrency = pipelineConcurrency.value
        setPipelineStep(6, t('filmCreate.pipeGenSceneImages', { count: scenesWithoutImage.length, concurrency }))
        await checkPause()
        const { paused } = await runConcurrently(scenesWithoutImage, concurrency, async (scene) => {
          await checkPause()
          generatingSceneIds.add(scene.id)
          try {
            const stepName = `${t('filmCreate.sceneImageShort')} ${scene.location || scene.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const useQuad = !!sceneUseQuadGrid.value
              const res = await sceneAPI.generateImage({ scene_id: scene.id, model: undefined, style, use_quad_grid: useQuad })
              const taskId = res?.image_generation?.task_id ?? res?.task_id
              if (taskId) {
                const result = await pollTaskWithPause(taskId, () => loadDrama())
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else {
                await loadDrama()
                await pollUntilResourceHasImage(() => {
                  const list = store.currentEpisode?.scenes ?? []
                  const s = list.find((x) => Number(x.id) === Number(scene.id))
                  return !!(s && (s.image_url || s.local_path))
                })
              }
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingSceneIds.delete(scene.id)
          }
        }, { getLabel: (scene) => `${t('filmCreate.sceneImageShort')} ${scene.location || scene.id}` })
        if (paused) { await waitForResume() }
      }

      // 步骤 7：生成道具图
      {
        const propsWithoutImage = propList.filter((p) => !hasAssetImage(p))
        const concurrency = pipelineConcurrency.value
        setPipelineStep(7, t('filmCreate.pipeGenPropImages', { count: propsWithoutImage.length, concurrency }))
        await checkPause()
        const { paused } = await runConcurrently(propsWithoutImage, concurrency, async (prop) => {
          await checkPause()
          generatingPropIds.add(prop.id)
          try {
            const stepName = `${t('filmCreate.propImageShort')} ${prop.name || prop.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const res = await propAPI.generateImage(prop.id, undefined, style)
              const taskId = res?.image_generation?.task_id ?? res?.task_id
              if (taskId) {
                const result = await pollTaskWithPause(taskId, () => loadDrama())
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else {
                await loadDrama()
                await pollUntilResourceHasImage(() => {
                  const list = store.props ?? []
                  const p = list.find((x) => Number(x.id) === Number(prop.id))
                  return !!(p && (p.image_url || p.local_path))
                })
              }
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingPropIds.delete(prop.id)
          }
        }, { getLabel: (prop) => `${t('filmCreate.propImageShort')} ${prop.name || prop.id}` })
        if (paused) { await waitForResume() }
      }

      await runPipelineCountdown(30, t('filmCreate.countdownAfterAssetsPrompt'))
      await checkPause()

      // 步骤 8：生成分镜图
      {
        await loadStoryboardMedia()
        boards = store.storyboards || []
        const boardsWithoutImg = boards.filter((sb) => !hasSbImage(sb))
        const concurrency = pipelineConcurrency.value
        setPipelineStep(8, t('filmCreate.pipeGenSbImages', { count: boardsWithoutImg.length, concurrency }))
        const { paused } = await runConcurrently(boardsWithoutImg, concurrency, async (sb) => {
          await checkPause()
          generatingSbImageIds.add(sb.id)
          try {
            const stepName = `${t('filmCreate.storyboardImageShort')} #${sb.storyboard_number ?? sb.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const useFirstLast = storyboardUseFirstLastFrame.value && !isSbUniversalMode(sb.id)
              let prompt = sb.polished_prompt || sb.image_prompt || sb.description || ''
              let frameTypeForCreate = undefined
              if (useFirstLast) {
                prompt = await ensureProfessionalFramePrompt(sb, 'first')
                frameTypeForCreate = 'storyboard_first'
              }
              const res = await imagesAPI.create({
                storyboard_id: sb.id,
                drama_id: dramaIdVal,
                prompt,
                model: undefined,
                style,
                frame_type: frameTypeForCreate,
                aspect_ratio: projectAspectRatio.value || '16:9',
              })
              if (res?.task_id) {
                const result = await pollTaskWithPause(res.task_id, () => loadSingleStoryboardMedia(sb.id))
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else await loadSingleStoryboardMedia(sb.id)
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingSbImageIds.delete(sb.id)
          }
        }, { getLabel: (sb) => `${t('filmCreate.storyboardImageShort')} #${sb.storyboard_number ?? sb.id}` })
        if (paused) { await waitForResume() }
      }

      await runPipelineCountdown(20, t('filmCreate.countdownAfterSbImagesPrompt'))
      await checkPause()

      // 步骤 9：生成分镜视频
      {
        await loadStoryboardMedia()
        const boards2 = (store.storyboards || []).filter((sb) => {
          const vidList = sbVideos.value[sb.id] || []
          if (vidList.some((v) => v.status === 'completed' && recordHasPlayableVideoUrl(v))) return false
          if (isSbUniversalMode(sb.id)) {
            if (!sbCanSubmitVideo(sb)) return false
            return collectSbOmniReferenceAbsoluteUrls(sb).length > 0
          }
          return !!getSbFirstFrameUrl(sb)
        })
        const concurrency = pipelineVideoConcurrency.value
        setPipelineStep(9, t('filmCreate.pipeGenSbVideos', { count: boards2.length, concurrency }))
        const { paused } = await runConcurrently(boards2, concurrency, async (sb) => {
          await checkPause()
          generatingSbVideoIds.add(sb.id)
          try {
            const stepName = `${t('filmCreate.storyboardVideoShort')} #${sb.storyboard_number ?? sb.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const universal = isSbUniversalMode(sb.id)
              const omniRefs = universal ? collectSbOmniReferenceAbsoluteUrls(sb) : []
              const firstFrameUrl = await getMainImageUrlForVideo(sb)
              const absoluteUrl = universal ? (omniRefs[0] || '') : toAbsoluteImageUrl(firstFrameUrl)
              const { first: vFirst, last: vLast } = sbVideoFirstLastUrls(sb, universal, null)
              let refUrls = universal
                ? (omniRefs.length ? omniRefs : undefined)
                : (absoluteUrl ? [absoluteUrl] : undefined)
              if (!universal && vLast && refUrls && !refUrls.includes(vLast)) {
                refUrls = [...refUrls, vLast]
              }
              const res = await videosAPI.create({
                drama_id: dramaIdVal,
                storyboard_id: sb.id,
                prompt: buildSbVideoPromptForApi(sb),
                image_url: vFirst || undefined,
                first_frame_url: vFirst,
                last_frame_url: vLast,
                reference_image_urls: refUrls,
                style,
                aspect_ratio: projectAspectRatio.value || '16:9',
                resolution: videoResolution.value || undefined,
                duration: getSbVideoDurationForApi(sb),
              })
              if (res?.task_id) {
                const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_VIDEO, t('filmCreate.storyboardVideoShort'))
                const result = await pollTaskWithPause(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else await loadSingleStoryboardMedia(sb.id)
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingSbVideoIds.delete(sb.id)
          }
        }, { getLabel: (sb) => `${t('filmCreate.storyboardVideoShort')} #${sb.storyboard_number ?? sb.id}` })
        if (paused) { await waitForResume() }
      }

      // 步骤 10：合成整集视频
      await checkPause()
      setPipelineStep(10, t('filmCreate.pipeMergeFullVideo'))
      try {
        const result = await dramaAPI.finalizeEpisode(episodeId, getFinalizeMergeOptions())
        if (result?.task_id != null) {
          const pollResult = await pollTaskWithPause(result.task_id, () => loadDrama())
          if (pollResult?.paused) { await waitForResume(); return }
          if (pollResult?.error) addPipelineError(t('filmCreate.pipeMergeFullVideoShort'), pollResult.error)
          else await pipelineRest()
        } else {
          addPipelineError(t('filmCreate.pipeMergeFullVideoShort'), result?.message || t('filmCreate.noClipsToMergeTip'))
        }
      } catch (e) {
        addPipelineError(t('filmCreate.pipeMergeFullVideoShort'), e.message || String(e))
      }

      pipelineCurrentStep.value = t('filmCreate.oneClickVideoWorkflowDone')
      ElMessage.success(t('filmCreate.oneClickVideoWorkflowDone'))
      trackFilmCreateAction('one_click_generate_complete', {
        extra: { error_count: pipelineErrorLog.value.length },
      })
    } catch (e) {
      addPipelineError(t('filmCreate.pipelineProcessShort'), e.message || String(e))
      trackFilmCreateAction('one_click_generate_failed', {
        extra: { message: String(e?.message || 'failed').slice(0, 120) },
      })
    }
  }

  async function startRepairPipeline() {
    if (!currentEpisodeId.value || pipelineRunning.value) return
    pipelineErrorLog.value = []
    pipelineCurrentStep.value = ''
    pipelineActiveTasks.clear()
    pipelineRunning.value = true
    pipelinePaused.value = false
    try {
      await runRepairPipeline()
    } finally {
      pipelineRunning.value = false
      pipelineActiveTasks.clear()
    }
  }

  async function runRepairPipeline() {
    const episodeId = currentEpisodeId.value
    const dramaIdVal = dramaId.value
    if (!episodeId || !dramaIdVal) return
    const style = getSelectedStyle()

    try {
      pipelineCurrentStep.value = t('filmCreate.pipeLoadingData')
      await loadDrama()

      // 1. 角色
      let chars = store.currentEpisode?.characters ?? []
      if (chars.length === 0) {
        await checkPause()
        pipelineCurrentStep.value = t('filmCreate.pipeGenCharList')
        try {
          const outline = (store.scriptContent || '').toString().trim() || (storyInput.value || '').toString().trim() || undefined
          const res = await generationAPI.generateCharacters(dramaIdVal, { episode_id: store.currentEpisode?.id ?? undefined, outline: outline || undefined })
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeGenCharShort'), result.error); return }
          } else await loadDrama()
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeGenCharShort'), e.message || String(e))
          return
        }
        chars = store.currentEpisode?.characters ?? []
      }
      const charsWithoutImage = chars.filter((c) => !hasAssetImage(c))
      {
        const concurrency = pipelineConcurrency.value
        pipelineCurrentStep.value = t('filmCreate.pipeGenCharImagesProgress', { concurrency })
        const { paused } = await runConcurrently(charsWithoutImage, concurrency, async (char) => {
          await checkPause()
          const stepName = `${t('filmCreate.charImageShort')} ${char.name || char.id}`
          const ok = await pipelineWithRetry(stepName, async () => {
            const res = await characterAPI.generateImage(char.id, undefined, style)
            const taskId = res?.image_generation?.task_id ?? res?.task_id
            if (taskId) {
              const result = await pollTaskWithPause(taskId, () => loadDrama())
              if (result?.paused) return { paused: true }
              if (result?.error) throw new Error(result.error)
            } else {
              await loadDrama()
              await pollUntilResourceHasImage(() => {
                const list = store.currentEpisode?.characters ?? []
                const c = list.find((x) => Number(x.id) === Number(char.id))
                return !!(c && (c.image_url || c.local_path))
              })
            }
          })
          if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
        }, { getLabel: (char) => `${t('filmCreate.charImageShort')} ${char.name || char.id}` })
        if (paused) { await waitForResume() }
      }

      // 2. 场景
      let sceneList = store.currentEpisode?.scenes ?? []
      if (sceneList.length === 0) {
        await checkPause()
        pipelineCurrentStep.value = t('filmCreate.pipeExtractingScenes')
        try {
          const res = await dramaAPI.extractBackgrounds(episodeId, { model: undefined, style, language: scriptLanguage.value })
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeExtractScenesShort'), result.error); return }
          } else await loadDrama()
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeExtractScenesShort'), e.message || String(e))
          return
        }
        sceneList = store.currentEpisode?.scenes ?? []
      }
      const scenesWithoutImage = sceneList.filter((s) => !hasAssetImage(s))
      {
        const concurrency = pipelineConcurrency.value
        pipelineCurrentStep.value = t('filmCreate.pipeGenSceneImagesProgress', { concurrency })
        const { paused } = await runConcurrently(scenesWithoutImage, concurrency, async (scene) => {
          await checkPause()
          const stepName = `${t('filmCreate.sceneImageShort')} ${scene.location || scene.id}`
          const ok = await pipelineWithRetry(stepName, async () => {
            const useQuad = !!sceneUseQuadGrid.value
            const res = await sceneAPI.generateImage({ scene_id: scene.id, model: undefined, style, use_quad_grid: useQuad })
            const taskId = res?.image_generation?.task_id ?? res?.task_id
            if (taskId) {
              const result = await pollTaskWithPause(taskId, () => loadDrama())
              if (result?.paused) return { paused: true }
              if (result?.error) throw new Error(result.error)
            } else {
              await loadDrama()
              await pollUntilResourceHasImage(() => {
                const list = store.currentEpisode?.scenes ?? []
                const s = list.find((x) => Number(x.id) === Number(scene.id))
                return !!(s && (s.image_url || s.local_path))
              })
            }
          })
          if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
        }, { getLabel: (scene) => `${t('filmCreate.sceneImageShort')} ${scene.location || scene.id}` })
        if (paused) { await waitForResume() }
      }

      // 2.5 道具
      let propList2 = store.props ?? []
      if (propList2.length === 0) {
        await checkPause()
        pipelineCurrentStep.value = t('filmCreate.pipeExtractingProps')
        try {
          const res = await propAPI.extractFromScript(episodeId)
          const taskId = res?.task_id
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeExtractPropsShort'), result.error); /* non-fatal */ }
          } else await loadDrama()
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeExtractPropsShort'), e.message || String(e))
        }
        propList2 = store.props ?? []
      }
      const propsWithoutImage2 = propList2.filter((p) => !hasAssetImage(p))
      {
        const concurrency = pipelineConcurrency.value
        pipelineCurrentStep.value = t('filmCreate.pipeGenPropImagesProgress', { concurrency })
        await checkPause()
        const { paused } = await runConcurrently(propsWithoutImage2, concurrency, async (prop) => {
          await checkPause()
          generatingPropIds.add(prop.id)
          try {
            const stepName = `${t('filmCreate.propImageShort')} ${prop.name || prop.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const res = await propAPI.generateImage(prop.id, undefined, style)
              const taskId = res?.image_generation?.task_id ?? res?.task_id
              if (taskId) {
                const result = await pollTaskWithPause(taskId, () => loadDrama())
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else {
                await loadDrama()
                await pollUntilResourceHasImage(() => {
                  const list = store.props ?? []
                  const p = list.find((x) => Number(x.id) === Number(prop.id))
                  return !!(p && (p.image_url || p.local_path))
                })
              }
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingPropIds.delete(prop.id)
          }
        }, { getLabel: (prop) => `${t('filmCreate.propImageShort')} ${prop.name || prop.id}` })
        if (paused) { await waitForResume() }
      }

      // 3. 分镜
      let boards = store.storyboards || []
      const hadBoardsBeforeRepairSb = boards.length > 0
      if (boards.length === 0) {
        await checkPause()
        pipelineCurrentStep.value = t('filmCreate.pipeGeneratingStoryboards')
        try {
          const res = await dramaAPI.generateStoryboard(episodeId, {
            aspect_ratio: projectAspectRatio.value || '16:9',
            storyboard_count: getStoryboardCountForApi(),
            video_duration: getVideoDurationForApi(),
            include_narration: !!storyboardIncludeNarration.value,
            universal_omni_storyboard: !!storyboardUniversalOmni.value,
          })
          const taskId = res?.task_id ?? (typeof res === 'string' ? res : null)
          if (taskId) {
            const result = await pollTaskWithPause(taskId, () => loadDrama())
            if (result?.paused) { await waitForResume(); return }
            if (result?.error) { addPipelineError(t('filmCreate.pipeGenStoryboardAltShort'), result.error); return }
          }
          await loadDrama()
          await pipelineRest()
        } catch (e) {
          addPipelineError(t('filmCreate.pipeGenStoryboardAltShort'), e.message || String(e))
          return
        }
        boards = store.storyboards || []
      }
      if (!hadBoardsBeforeRepairSb && storyboardUniversalOmni.value) {
        await checkPause()
        await polishUniversalSegmentsAfterGeneration({
          checkPause,
          onShotProgress: (cur, total, sb) => {
            pipelineCurrentStep.value = t('filmCreate.pipePolishOmniStep', {
              cur,
              total,
              num: sb.storyboard_number ?? cur,
              title: (sb.title || '').slice(0, 16),
            })
          },
          onShotError: (sb, msg) =>
            addPipelineError(
              t('filmCreate.pipePolishOmniShort'),
              `${t('filmCreate.shotHash', { num: sb.storyboard_number ?? sb.id })}: ${msg}`
            ),
        })
        await loadDrama()
      }

      await loadStoryboardMedia()
      const boardsWithoutImg = boards.filter((sb) => !hasSbImage(sb))
      {
        const concurrency = pipelineConcurrency.value
        pipelineCurrentStep.value = t('filmCreate.pipeGenSbImagesProgress', { concurrency })
        const { paused } = await runConcurrently(boardsWithoutImg, concurrency, async (sb) => {
          await checkPause()
          const stepName = `${t('filmCreate.storyboardImageShort')} #${sb.storyboard_number ?? sb.id}`
          const ok = await pipelineWithRetry(stepName, async () => {
            const useFirstLast = storyboardUseFirstLastFrame.value && !isSbUniversalMode(sb.id)
            let prompt = sb.polished_prompt || sb.image_prompt || sb.description || ''
            let frameTypeForCreate = undefined
            if (useFirstLast) {
              prompt = await ensureProfessionalFramePrompt(sb, 'first')
              frameTypeForCreate = 'storyboard_first'
            }
            const res = await imagesAPI.create({
              storyboard_id: sb.id,
              drama_id: dramaIdVal,
              prompt,
              model: undefined,
              style,
              frame_type: frameTypeForCreate,
              aspect_ratio: projectAspectRatio.value || '16:9',
            })
            if (res?.task_id) {
              const result = await pollTaskWithPause(res.task_id, () => loadSingleStoryboardMedia(sb.id))
              if (result?.paused) return { paused: true }
              if (result?.error) throw new Error(result.error)
            } else await loadSingleStoryboardMedia(sb.id)
          })
          if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
        }, { getLabel: (sb) => `${t('filmCreate.storyboardImageShort')} #${sb.storyboard_number ?? sb.id}` })
        if (paused) { await waitForResume() }
      }
      await loadStoryboardMedia()
      const boards2 = (store.storyboards || []).filter((sb) => {
        const vidList = sbVideos.value[sb.id] || []
        if (vidList.some((v) => v.status === 'completed' && recordHasPlayableVideoUrl(v))) return false
        if (isSbUniversalMode(sb.id)) {
          if (!sbCanSubmitVideo(sb)) return false
          return collectSbOmniReferenceAbsoluteUrls(sb).length > 0
        }
        return !!getSbFirstFrameUrl(sb)
      })
      {
        const concurrency = pipelineVideoConcurrency.value
        pipelineCurrentStep.value = t('filmCreate.pipeGenSbVideosProgress', { concurrency })
        const { paused } = await runConcurrently(boards2, concurrency, async (sb) => {
          await checkPause()
          generatingSbVideoIds.add(sb.id)
          try {
            const stepName = `${t('filmCreate.storyboardVideoShort')} #${sb.storyboard_number ?? sb.id}`
            const ok = await pipelineWithRetry(stepName, async () => {
              const universal = isSbUniversalMode(sb.id)
              const omniRefs = universal ? collectSbOmniReferenceAbsoluteUrls(sb) : []
              const firstFrameUrl = await getMainImageUrlForVideo(sb)
              const absoluteUrl = universal ? (omniRefs[0] || '') : toAbsoluteImageUrl(firstFrameUrl)
              const { first: vFirst, last: vLast } = sbVideoFirstLastUrls(sb, universal, null)
              let refUrls = universal
                ? (omniRefs.length ? omniRefs : undefined)
                : (absoluteUrl ? [absoluteUrl] : undefined)
              if (!universal && vLast && refUrls && !refUrls.includes(vLast)) {
                refUrls = [...refUrls, vLast]
              }
              const res = await videosAPI.create({
                drama_id: dramaIdVal,
                storyboard_id: sb.id,
                prompt: buildSbVideoPromptForApi(sb),
                image_url: vFirst || undefined,
                first_frame_url: vFirst,
                last_frame_url: vLast,
                reference_image_urls: refUrls,
                aspect_ratio: projectAspectRatio.value || '16:9',
                resolution: videoResolution.value || undefined,
                duration: getSbVideoDurationForApi(sb),
              })
              if (res?.task_id) {
                const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_VIDEO, t('filmCreate.storyboardVideoShort'))
                const result = await pollTaskWithPause(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
                if (result?.paused) return { paused: true }
                if (result?.error) throw new Error(result.error)
              } else await loadSingleStoryboardMedia(sb.id)
            })
            if (ok && typeof ok === 'object' && ok.paused) return { paused: true }
          } finally {
            generatingSbVideoIds.delete(sb.id)
          }
        }, { getLabel: (sb) => `${t('filmCreate.storyboardVideoShort')} #${sb.storyboard_number ?? sb.id}` })
        if (paused) { await waitForResume() }
      }

      // 4. 生成整集视频
      await checkPause()
      pipelineCurrentStep.value = t('filmCreate.pipeGeneratingFullVideo')
      try {
        const result = await dramaAPI.finalizeEpisode(episodeId, getFinalizeMergeOptions())
        if (result?.task_id != null) {
          const pollResult = await pollTaskWithPause(result.task_id, () => loadDrama())
          if (pollResult?.paused) { await waitForResume(); return }
          if (pollResult?.error) addPipelineError(t('filmCreate.pipeGenFullVideoShort'), pollResult.error)
          else await pipelineRest()
        } else {
          addPipelineError(t('filmCreate.pipeGenFullVideoShort'), result?.message || t('filmCreate.noClipsToMergeTip'))
        }
      } catch (e) {
        addPipelineError(t('filmCreate.pipeGenFullVideoShort'), e.message || String(e))
      }

      pipelineCurrentStep.value = t('filmCreate.fixMissingPipelineDone')
      ElMessage.success(t('filmCreate.fixMissingWorkflowDone'))
    } catch (e) {
      addPipelineError(t('filmCreate.pipelineProcessShort'), e.message || String(e))
    }
  }

  return {
    pipelineRunning,
    pipelinePaused,
    pipelineAbortRequested,
    pipelineErrorLog,
    pipelineCurrentStep,
    pipelineStepIndex,
    pipelineStepTotal,
    pipelineCountdown,
    pipelineCountdownMsg,
    pipelineConcurrency,
    pipelineVideoConcurrency,
    pipelineActiveTasks,
    loadPipelineConcurrency,
    runConcurrently,
    skipPipelineCountdown,
    startOneClickPipeline,
    startTextFrameworkPipeline,
    startRepairPipeline,
    onPipelineResume,
    pipelineRest,
    checkPause,
    waitForResume,
    pollTaskWithPause,
    addPipelineError,
  }
}
