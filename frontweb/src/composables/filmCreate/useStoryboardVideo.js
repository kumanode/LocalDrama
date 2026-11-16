import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { videosAPI } from '@/api/videos'
import { storyboardsAPI } from '@/api/storyboards'
import { aiAPI } from '@/api/ai'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'
import { getStoryboardAspectRatio } from '@/utils/storyboardAspectRatio'
import { canUseUniversalOmniVideoApi } from '@/utils/videoOmniSupport'

export function useStoryboardVideo({
  store,
  dramaId,
  videoResolution,
  projectAspectRatio,
  getSelectedStyle,
  getSbVideoDurationForApi,
  isSbUniversalMode,
  sbUniversalSegmentTrimmed,
  storyboardUseFirstLastFrame,
  getSbFirstFrameUrl,
  getSbLastFrameUrl,
  isSbVideoGenerating,
  getSbResumableFailedVideo,
  sbVideoErrors,
  sbSelectedVideoId,
  generatingSbVideoIds,
  getSbSelectedScene,
  getSbSelectedCharacters,
  getSbSelectedProps,
  hasAssetImage,
  assetImageUrl,
  buildSbGenMeta,
  pollTask,
  loadSingleStoryboardMedia,
  genStore,
}) {
  let activeVideoAiConfigCache = null
  let activeVideoAiConfigCacheAt = 0
  const ACTIVE_VIDEO_AI_CONFIG_TTL_MS = 15000

  function invalidateActiveVideoAiConfigCache() {
    activeVideoAiConfigCache = null
    activeVideoAiConfigCacheAt = 0
  }

  async function getActiveVideoAiConfig() {
    const now = Date.now()
    if (activeVideoAiConfigCache && now - activeVideoAiConfigCacheAt < ACTIVE_VIDEO_AI_CONFIG_TTL_MS) {
      return activeVideoAiConfigCache
    }
    try {
      const rows = await aiAPI.list('video')
      const list = Array.isArray(rows) ? rows : []
      const active = list.filter((c) => c.is_active !== false)
      activeVideoAiConfigCache = active.find((c) => c.is_default) || active[0] || null
    } catch {
      activeVideoAiConfigCache = null
    }
    activeVideoAiConfigCacheAt = now
    return activeVideoAiConfigCache
  }

  /** 为视频生成获取参考图的真实 URL */
  async function getMainImageUrlForVideo(sb) {
    return getSbFirstFrameUrl ? getSbFirstFrameUrl(sb) : ''
  }

  /** 转为视频接口可请求的绝对 URL（后端/第三方需能访问） */
  function toAbsoluteImageUrl(url) {
    if (!url || !String(url).trim()) return ''
    const s = String(url).trim()
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin ? origin + (s.startsWith('/') ? s : '/' + s) : s
  }

  function sbCanSubmitVideo(sb) {
    if (!sb) return false
    const vp = (sb.video_prompt || '').toString().trim()
    if (vp) return true
    if (isSbUniversalMode && isSbUniversalMode(sb.id)) {
      return !!(sbUniversalSegmentTrimmed ? sbUniversalSegmentTrimmed(sb) : '')
    }
    return false
  }

  /** 提交给视频 API 的文案：全能模式有片段描述时仅提交该段（不拼接 video_prompt，避免动作/旁白盖过 @图片 等编排） */
  function buildSbVideoPromptForApi(sb, { preferClassicPrompt = false } = {}) {
    const vp = (sb.video_prompt || '').toString().trim()
    const seg = sbUniversalSegmentTrimmed ? sbUniversalSegmentTrimmed(sb) : ''
    if (preferClassicPrompt) return vp || seg
    if (isSbUniversalMode && isSbUniversalMode(sb.id)) {
      if (seg) return seg
      return vp
    }
    return vp
  }

  /** 全能模式：与 collectSbOmniReferenceAbsoluteUrls 同序的参考槽位（用于 @ 选择器缩略图） */
  function getSbUniversalOmniRefSlots(sb) {
    if (!sb?.id) return []
    const out = []
    let idx = 1
    const scene = getSbSelectedScene ? getSbSelectedScene(sb.id) : null
    if (scene && hasAssetImage && hasAssetImage(scene)) {
      out.push({
        index: idx++,
        kind: 'scene',
        name: (scene.name || t('filmCreate.scene')).toString(),
        thumbUrl: assetImageUrl ? assetImageUrl(scene) : '',
      })
    }
    for (const c of (getSbSelectedCharacters ? getSbSelectedCharacters(sb.id) : [])) {
      if (hasAssetImage && hasAssetImage(c)) {
        out.push({
          index: idx++,
          kind: 'character',
          name: (c.name || t('filmCreate.character')).toString(),
          thumbUrl: assetImageUrl ? assetImageUrl(c) : '',
        })
      }
    }
    for (const p of (getSbSelectedProps ? getSbSelectedProps(sb.id) : [])) {
      if (hasAssetImage && hasAssetImage(p)) {
        out.push({
          index: idx++,
          kind: 'prop',
          name: (p.name || t('filmCreate.prop')).toString(),
          thumbUrl: assetImageUrl ? assetImageUrl(p) : '',
        })
      }
    }
    return out
  }

  /** 全能模式：场景/角色/物品 → 绝对 URL 列表（不含经典分镜中间主图；供可灵 Omni / 火山多图参考，最多 10，方舟侧最多取 9 张） */
  function collectSbOmniReferenceAbsoluteUrls(sb) {
    if (!sb?.id) return []
    const urls = []
    const seen = new Set()
    function pushAbs(u) {
      const abs = toAbsoluteImageUrl(u)
      if (!abs || seen.has(abs)) return
      seen.add(abs)
      urls.push(abs)
    }
    const scene = getSbSelectedScene ? getSbSelectedScene(sb.id) : null
    if (scene && hasAssetImage && hasAssetImage(scene)) pushAbs(assetImageUrl(scene))
    for (const c of (getSbSelectedCharacters ? getSbSelectedCharacters(sb.id) : [])) {
      if (hasAssetImage && hasAssetImage(c)) pushAbs(assetImageUrl(c))
    }
    for (const p of (getSbSelectedProps ? getSbSelectedProps(sb.id) : [])) {
      if (hasAssetImage && hasAssetImage(p)) pushAbs(assetImageUrl(p))
    }
    return urls.slice(0, 10)
  }

  /** 非 Seedance2 全能降级：仅场景参考图（若有） */
  function collectSbSceneOnlyReferenceAbsoluteUrls(sb) {
    if (!sb?.id) return []
    const scene = getSbSelectedScene ? getSbSelectedScene(sb.id) : null
    if (scene && hasAssetImage && hasAssetImage(scene)) {
      const abs = toAbsoluteImageUrl(assetImageUrl(scene))
      return abs ? [abs] : []
    }
    return []
  }

  async function confirmUniversalNonSeedance2Video() {
    await ElMessageBox.confirm(
      t('filmCreate.omniModelMismatchConfirm'),
      t('filmCreate.omniModelMismatchTitle'),
      { confirmButtonText: t('common.continue'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
  }

  /** 经典模式视频：首帧 URL（连贯帧可覆盖首帧）+ 可选尾帧 */
  function sbVideoFirstLastUrls(sb, universal, contiguityFirstFrameUrl) {
    let first =
      contiguityFirstFrameUrl ||
      (universal ? '' : toAbsoluteImageUrl(getSbFirstFrameUrl ? getSbFirstFrameUrl(sb) : ''))
    if (!first && !universal) {
      first = toAbsoluteImageUrl(getSbFirstFrameUrl ? getSbFirstFrameUrl(sb) : '')
    }
    let last = undefined
    if (storyboardUseFirstLastFrame?.value && !universal) {
      const lu = getSbLastFrameUrl ? getSbLastFrameUrl(sb) : null
      if (lu) last = toAbsoluteImageUrl(lu)
    }
    return { first: first || undefined, last }
  }

  async function onGenerateSbVideo(sb) {
    if (!dramaId.value || !sb?.id || !sbCanSubmitVideo(sb)) return
    const universal = isSbUniversalMode ? isSbUniversalMode(sb.id) : false
    let universalOmniApi = universal
    if (universal) {
      const videoCfg = await getActiveVideoAiConfig()
      if (!canUseUniversalOmniVideoApi(videoCfg)) {
        try {
          await confirmUniversalNonSeedance2Video()
        } catch {
          return
        }
        universalOmniApi = false
      }
    }
    const omniRefs = universalOmniApi ? collectSbOmniReferenceAbsoluteUrls(sb) : []
    const sceneOnlyRefs = universal && !universalOmniApi ? collectSbSceneOnlyReferenceAbsoluteUrls(sb) : []
    const hasClassicFrame = !!(getSbFirstFrameUrl && getSbFirstFrameUrl(sb))
    let hasAnyImage = false
    if (universalOmniApi) {
      hasAnyImage = omniRefs.length > 0
    } else if (universal) {
      hasAnyImage = hasClassicFrame || sceneOnlyRefs.length > 0
    } else {
      hasAnyImage = hasClassicFrame
    }
    if (!hasAnyImage) {
      if (!universal) {
        await ElMessageBox.alert(
          t('filmCreate.traditionalMissingImageAlertMsg'),
          t('filmCreate.traditionalMissingImageAlertTitle'),
          { confirmButtonText: t('common.confirm'), type: 'warning' }
        )
        return
      }
      try {
        await ElMessageBox.confirm(
          universalOmniApi
            ? t('filmCreate.omniNoRefImageConfirm')
            : t('filmCreate.degradedNoRefImageConfirm'),
          universalOmniApi ? t('filmCreate.omniNoRefImageTitle') : t('filmCreate.degradedNoRefImageTitle'),
          { confirmButtonText: t('filmCreate.continueGenerate'), cancelButtonText: t('common.cancel'), type: 'warning' }
        )
      } catch {
        return
      }
    }
    generatingSbVideoIds.add(sb.id)
    const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_VIDEO, t('filmCreate.storyboardVideo'))
    genStore.markRunning(meta)
    sbVideoErrors.value[sb.id] = ''
    if (sbSelectedVideoId?.value?.[sb.id] != null) {
      const next = { ...sbSelectedVideoId.value }
      delete next[sb.id]
      sbSelectedVideoId.value = next
    }
    storyboardsAPI.update(sb.id, { video_url: null }).catch(() => {})
    try {
      let absoluteUrl = ''
      let referenceUrls = undefined
      if (universalOmniApi) {
        referenceUrls = omniRefs.length ? omniRefs : undefined
        absoluteUrl = omniRefs[0] || ''
      } else if (universal) {
        const firstFrameUrl = await getMainImageUrlForVideo(sb)
        absoluteUrl = toAbsoluteImageUrl(firstFrameUrl)
        if (absoluteUrl) {
          referenceUrls = sceneOnlyRefs.length ? sceneOnlyRefs : [absoluteUrl]
        } else {
          referenceUrls = sceneOnlyRefs.length ? sceneOnlyRefs : undefined
          absoluteUrl = sceneOnlyRefs[0] || ''
        }
      } else {
        const firstFrameUrl = await getMainImageUrlForVideo(sb)
        absoluteUrl = toAbsoluteImageUrl(firstFrameUrl)
        referenceUrls = absoluteUrl ? [absoluteUrl] : undefined
      }
      const { first: vFirst, last: vLast } = sbVideoFirstLastUrls(sb, universalOmniApi, null)
      if (!universalOmniApi && vLast && referenceUrls && !referenceUrls.includes(vLast)) {
        referenceUrls = [...referenceUrls, vLast]
      }
      const preferClassicPrompt = universal && !universalOmniApi
      const res = await videosAPI.create({
        drama_id: dramaId.value,
        storyboard_id: sb.id,
        prompt: buildSbVideoPromptForApi(sb, { preferClassicPrompt }),
        image_url: universalOmniApi ? undefined : ((vFirst || absoluteUrl) || undefined),
        first_frame_url: universalOmniApi ? undefined : (vFirst || absoluteUrl || undefined),
        last_frame_url: universalOmniApi ? undefined : vLast,
        reference_image_urls: referenceUrls,
        style: getSelectedStyle ? getSelectedStyle() : undefined,
        aspect_ratio: getStoryboardAspectRatio(sb, projectAspectRatio?.value),
        resolution: videoResolution?.value || undefined,
        duration: getSbVideoDurationForApi ? getSbVideoDurationForApi(sb) : undefined,
      })
      if (res?.task_id) {
        const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
        if (pollRes?.status === 'failed') {
          sbVideoErrors.value[sb.id] = pollRes.error || t('filmCreate.videoGenFailed')
        } else if (pollRes?.status === 'completed') {
          sbVideoErrors.value[sb.id] = ''
          ElMessage.success(t('filmCreate.videoGenDone'))
        }
      } else {
        await loadSingleStoryboardMedia(sb.id)
        ElMessage.success(t('filmCreate.videoGenSubmittedTip'))
      }
    } catch (e) {
      sbVideoErrors.value[sb.id] = e.message || t('filmCreate.msgSubmitFailed')
      ElMessage.error(e.message || t('filmCreate.msgSubmitFailed'))
    } finally {
      generatingSbVideoIds.delete(sb.id)
      genStore.markDone(meta)
      await loadSingleStoryboardMedia(sb.id)
    }
  }

  /** 失败后继续查询上游任务（复用 provider_task_id，不重新提交） */
  async function onResumeSbVideoPoll(sb) {
    if (!sb?.id || (isSbVideoGenerating && isSbVideoGenerating(sb.id))) return
    const failed = getSbResumableFailedVideo ? getSbResumableFailedVideo(sb.id) : null
    if (!failed?.id) {
      ElMessage.warning(t('filmCreate.cannotQueryFailedRecordWarning'))
      return
    }
    generatingSbVideoIds.add(sb.id)
    const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_VIDEO, t('filmCreate.continueQuery'))
    genStore.markRunning(meta)
    sbVideoErrors.value[sb.id] = ''
    try {
      const res = await videosAPI.resumePoll(failed.id)
      const taskId = res?.task_id
      if (!taskId) {
        throw new Error(t('filmCreate.noTaskIdReturned'))
      }
      const pollRes = await pollTask(taskId, () => loadSingleStoryboardMedia(sb.id), meta)
      if (pollRes?.status === 'failed') {
        sbVideoErrors.value[sb.id] = pollRes.error || t('filmCreate.continueQueryFailed')
      } else if (pollRes?.status === 'completed') {
        sbVideoErrors.value[sb.id] = ''
        ElMessage.success(t('filmCreate.videoQueryDone'))
      }
    } catch (e) {
      sbVideoErrors.value[sb.id] = e.message || t('filmCreate.continueQueryFailed')
      ElMessage.error(e.message || t('filmCreate.continueQueryFailed'))
    } finally {
      generatingSbVideoIds.delete(sb.id)
      genStore.markDone(meta)
      await loadSingleStoryboardMedia(sb.id)
    }
  }

  return {
    toAbsoluteImageUrl,
    getMainImageUrlForVideo,
    sbCanSubmitVideo,
    buildSbVideoPromptForApi,
    getSbUniversalOmniRefSlots,
    collectSbOmniReferenceAbsoluteUrls,
    collectSbSceneOnlyReferenceAbsoluteUrls,
    invalidateActiveVideoAiConfigCache,
    getActiveVideoAiConfig,
    confirmUniversalNonSeedance2Video,
    sbVideoFirstLastUrls,
    onGenerateSbVideo,
    onResumeSbVideoPoll,
  }
}
