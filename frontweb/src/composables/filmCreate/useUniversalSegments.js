import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'

export function useUniversalSegments({
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
}) {
  const generatingUniversalSegmentIds = reactive(new Set())
  const universalOmniPolishRunning = ref(false)
  const universalOmniPolishAbort = ref(false)
  const universalOmniPolishProgress = ref({ current: 0, total: 0, label: '' })

  function sbUniversalSegmentTrimmed(sb) {
    if (!sb?.id) return ''
    return (sbUniversalSegmentText?.value?.[sb.id] ?? sb.universal_segment_text ?? '').toString().trim()
  }

  function universalSegmentDurationSecForSb(sb) {
    const dUi = Number(sbDuration?.value?.[sb?.id])
    const dRow = Number(sb?.duration)
    const dProj = Number(videoClipDuration?.value)
    return Number.isFinite(dUi) && dUi > 0
      ? dUi
      : Number.isFinite(dRow) && dRow > 0
        ? dRow
        : Number.isFinite(dProj) && dProj > 0
          ? dProj
          : 5
  }

  /** 提交视频 API 时使用的时长：优先本分镜配置，其次项目「每段秒数」 */
  function getSbVideoDurationForApi(sb) {
    const perSb = Number(sbDuration?.value?.[sb?.id] ?? sb?.duration)
    if (Number.isFinite(perSb) && perSb > 0) return perSb
    const clip = Number(videoClipDuration?.value)
    if (Number.isFinite(clip) && clip > 0) return clip
    return undefined
  }

  /** 全能提示词生成/润色：提交当前编辑区中的分镜字段（避免未点保存时仍用库内旧对白） */
  function buildUniversalSegmentFieldOverrides(sb) {
    if (!sb?.id) return {}
    const id = sb.id
    const trimOrNull = (v) => {
      const s = (v ?? '').toString().trim()
      return s || null
    }
    return {
      title: trimOrNull(sbTitle?.value?.[id] ?? sb.title),
      description: trimOrNull(sb.description),
      location: trimOrNull(sbLocation?.value?.[id] ?? sb.location),
      time: trimOrNull(sbTime?.value?.[id] ?? sb.time),
      action: trimOrNull(sbAction?.value?.[id] ?? sb.action),
      dialogue: trimOrNull(sbDialogue?.value?.[id] ?? sb.dialogue),
      narration: trimOrNull(sbNarration?.value?.[id] ?? sb.narration),
      result: trimOrNull(sbResult?.value?.[id] ?? sb.result),
      atmosphere: trimOrNull(sbAtmosphere?.value?.[id] ?? sb.atmosphere),
      shot_type: trimOrNull(sbShotType?.value?.[id] ?? sb.shot_type),
      movement: trimOrNull(sbMovement?.value?.[id] ?? sb.movement),
      layout_description: trimOrNull(sbLayoutDescription?.value?.[id] ?? sb.layout_description),
    }
  }

  /** 全能片段：@图片N 转 Grok 占位符 <IMAGE_N> */
  function universalSegmentAtImageToGrokTags(text) {
    return (text || '').replace(/@图片(\d+)/g, '<IMAGE_$1>') // i18n-scan-ignore: regex
  }

  function onUniversalSegmentToGrokVideoTags(sb) {
    if (!sb?.id) return
    const raw = (sbUniversalSegmentText?.value?.[sb.id] ?? '').toString()
    if (!raw.trim()) {
      ElMessage.warning(t('filmCreate.enterSegmentDescFirst'))
      return
    }
    const next = universalSegmentAtImageToGrokTags(raw)
    if (next === raw) {
      ElMessage.info(t('filmCreate.noAtImageTagFound'))
      return
    }
    if (sbUniversalSegmentText) {
      sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: next }
    }
    if (onSaveUniversalSegmentField) {
      void onSaveUniversalSegmentField(sb)
    }
    ElMessage.success(t('filmCreate.convertedToGrokTagsSuccess'))
  }

  function onUniversalSegmentPromptMenu(sb, cmd) {
    if (cmd === 'generate') onGenerateUniversalSegmentPrompt(sb, {})
    else if (cmd === 'generate-force') onGenerateUniversalSegmentPrompt(sb, { forceWithoutReferenceImages: true })
    else if (cmd === 'polish') onPolishUniversalSegmentPromptStream(sb, {})
    else if (cmd === 'polish-force') onPolishUniversalSegmentPromptStream(sb, { forceWithoutReferenceImages: true })
    else if (cmd === 'to-grok-video-tags') onUniversalSegmentToGrokVideoTags(sb)
  }

  /** 全能模式：根据当前分镜结构化字段流式生成片段描述（NDJSON） */
  async function onGenerateUniversalSegmentPrompt(sb, opts = {}) {
    if (!sb?.id || generatingUniversalSegmentIds.has(sb.id)) return
    const force = !!opts.forceWithoutReferenceImages
    generatingUniversalSegmentIds.add(sb.id)
    let live = ''
    try {
      const durationSec = universalSegmentDurationSecForSb(sb)
      const data = await storyboardsAPI.generateUniversalSegmentPromptStream(
        sb.id,
        {
          duration: durationSec,
          field_overrides: buildUniversalSegmentFieldOverrides(sb),
          ...(force ? { force_without_reference_images: true } : {}),
        },
        (delta) => {
          live += delta
          if (sbUniversalSegmentText) {
            sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: live }
          }
        }
      )
      const text = (data?.universal_segment_text ?? '').toString().trim()
      if (!text) {
        ElMessage.warning(t('filmCreate.incompleteGenResultRetry'))
        return
      }
      if (sbUniversalSegmentText) {
        sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: text }
      }
      const list = store.currentEpisode?.storyboards
      if (Array.isArray(list)) {
        const row = list.find((x) => Number(x.id) === Number(sb.id))
        if (row) row.universal_segment_text = text
      }
      ElMessage.success(force ? t('filmCreate.omniPromptForcedNoImage') : t('filmCreate.omniPromptGenerated'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.genFailedCheckModel'))
    } finally {
      generatingUniversalSegmentIds.delete(sb.id)
    }
  }

  /** 全能模式：结合剧本与邻镜流式润色片段描述（服务端 NDJSON） */
  async function onPolishUniversalSegmentPromptStream(sb, opts = {}) {
    if (!sb?.id || generatingUniversalSegmentIds.has(sb.id)) return
    const force = !!opts.forceWithoutReferenceImages
    const draft = sbUniversalSegmentTrimmed(sb)
    if (!draft) {
      ElMessage.warning(t('filmCreate.fillDescBeforePolishWarning'))
      return
    }
    generatingUniversalSegmentIds.add(sb.id)
    let live = ''
    try {
      const durationSec = universalSegmentDurationSecForSb(sb)
      const data = await storyboardsAPI.polishUniversalSegmentPromptStream(
        sb.id,
        {
          duration: durationSec,
          draft_universal_segment_text: draft,
          field_overrides: buildUniversalSegmentFieldOverrides(sb),
          ...(force ? { force_without_reference_images: true } : {}),
        },
        (delta) => {
          live += delta
          if (sbUniversalSegmentText) {
            sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: live }
          }
        }
      )
      const text = (data?.universal_segment_text ?? '').toString().trim()
      if (!text) {
        ElMessage.warning(t('filmCreate.incompletePolishResultRetry'))
        return
      }
      if (sbUniversalSegmentText) {
        sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: text }
      }
      const list = store.currentEpisode?.storyboards
      if (Array.isArray(list)) {
        const row = list.find((x) => Number(x.id) === Number(sb.id))
        if (row) row.universal_segment_text = text
      }
      ElMessage.success(force ? t('filmCreate.omniPolishedForcedNoImage') : t('filmCreate.omniPolishedSaved'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.polishFailedCheckModel'))
    } finally {
      generatingUniversalSegmentIds.delete(sb.id)
    }
  }

  /**
   * 分镜脚本生成完成后：按镜序逐个流式润色全能片段（服务端已落库）。
   * @param {{ checkPause?: () => Promise<void>, onShotProgress?: (cur:number,total:number,sb:object)=>void, onShotError?: (sb:object,msg:string)=>void }} opts
   */
  async function polishUniversalSegmentsAfterGeneration(opts = {}) {
    const checkPause = typeof opts.checkPause === 'function' ? opts.checkPause : async () => {}
    const onShotProgress = typeof opts.onShotProgress === 'function' ? opts.onShotProgress : null
    const onShotError = typeof opts.onShotError === 'function' ? opts.onShotError : null

    const omniVal = typeof storyboardUniversalOmni === 'function'
      ? storyboardUniversalOmni()
      : storyboardUniversalOmni?.value
    if (!omniVal) return { polished: 0, skipped: true }

    const rawList = store.currentEpisode?.storyboards || []
    const list = rawList.slice().sort((a, b) => (Number(a.storyboard_number) || 0) - (Number(b.storyboard_number) || 0))
    const targets = list.filter((sb) => sb?.id && (isSbUniversalMode ? isSbUniversalMode(sb.id) : true) && sbUniversalSegmentTrimmed(sb))

    if (!targets.length) return { polished: 0, skipped: true }

    universalOmniPolishRunning.value = true
    universalOmniPolishAbort.value = false
    universalOmniPolishProgress.value = { current: 0, total: targets.length, label: '' }
    let polished = 0
    try {
      for (let i = 0; i < targets.length; i++) {
        if (universalOmniPolishAbort.value) break
        await checkPause()
        const sb = targets[i]
        const cur = i + 1
        const label = '#' + (sb.storyboard_number ?? cur) + (sb.title ? ' ' + String(sb.title).slice(0, 20) : '')
        universalOmniPolishProgress.value = { current: cur, total: targets.length, label }
        if (onShotProgress) onShotProgress(cur, targets.length, sb)

        const draft = sbUniversalSegmentTrimmed(sb)
        if (!draft) continue

        generatingUniversalSegmentIds.add(sb.id)
        let live = ''
        try {
          const durationSec = universalSegmentDurationSecForSb(sb)
          const data = await storyboardsAPI.polishUniversalSegmentPromptStream(
            sb.id,
            {
              duration: durationSec,
              draft_universal_segment_text: draft,
              field_overrides: buildUniversalSegmentFieldOverrides(sb),
              force_without_reference_images: true,
            },
            (delta) => {
              live += delta
              if (sbUniversalSegmentText) {
                sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: live }
              }
            }
          )
          const text = (data?.universal_segment_text ?? '').toString().trim()
          if (text) {
            polished += 1
            if (sbUniversalSegmentText) {
              sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: text }
            }
            const storyList = store.currentEpisode?.storyboards
            if (Array.isArray(storyList)) {
              const row = storyList.find((x) => Number(x.id) === Number(sb.id))
              if (row) row.universal_segment_text = text
            }
          }
        } catch (e) {
          const msg = e?.message || String(e)
          if (onShotError) onShotError(sb, msg)
          else ElMessage.warning(t('filmCreate.shotOmniPolishFailed', { num: sb.storyboard_number ?? sb.id, msg }))
        } finally {
          generatingUniversalSegmentIds.delete(sb.id)
        }
        if (pipelineRest) await pipelineRest()
      }
    } finally {
      universalOmniPolishRunning.value = false
      universalOmniPolishProgress.value = { current: 0, total: 0, label: '' }
    }
    return { polished, skipped: false }
  }

  return {
    generatingUniversalSegmentIds,
    universalOmniPolishRunning,
    universalOmniPolishAbort,
    universalOmniPolishProgress,
    sbUniversalSegmentTrimmed,
    universalSegmentDurationSecForSb,
    getSbVideoDurationForApi,
    buildUniversalSegmentFieldOverrides,
    universalSegmentAtImageToGrokTags,
    onUniversalSegmentToGrokVideoTags,
    onUniversalSegmentPromptMenu,
    onGenerateUniversalSegmentPrompt,
    onPolishUniversalSegmentPromptStream,
    polishUniversalSegmentsAfterGeneration,
  }
}
