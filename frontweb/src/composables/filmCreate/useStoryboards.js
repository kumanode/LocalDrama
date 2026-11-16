import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'
import { uploadAPI } from '@/api/upload'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'
import { assetImageUrl, assetVideoUrl } from '@/utils/mediaUrl'

export function useStoryboards({ 
  store, 
  dramaId, 
  currentEpisodeId,
  storyboardUseFirstLastFrame,
  gridMode,
  getSelectedStyle,
  projectAspectRatio,
  videoResolution,
  isSbUniversalMode,
  buildSbGenMeta,
  pollTask,
  genStore,
  loadDrama,
  refreshStoryboardsOnly
}) {
  const sbImages = ref({})
  const sbVideos = ref({})
  const sbVideoErrors = ref({})
  const sbSelectedImgId = ref({})
  const sbSelectedLastImgId = ref({})
  const sbSelectedVideoId = ref({})
  const generatingSbImageIds = reactive(new Set())
  const generatingSbFirstImageIds = reactive(new Set())
  const generatingSbLastImageIds = reactive(new Set())
  const generatingSbVideoIds = reactive(new Set())
  const upscalingSbIds = reactive(new Set())
  const linkingTailFrameIds = reactive(new Set())
  const usingPrevTailAsFirstIds = reactive(new Set())
  const sbImageUploadSlotById = ref({})
  const uploadingSbImageId = ref(null)
  const sbImageUploadForId = ref(null)
  const sbImageFileInput = ref(null)

  const batchImageRunning = ref(false)
  const batchImageStopping = ref(false)
  const batchImageProgress = ref({ current: 0, total: 0, failed: 0 })
  const batchImageErrors = ref([])

  const batchVideoRunning = ref(false)
  const batchVideoStopping = ref(false)
  const batchVideoProgress = ref({ current: 0, total: 0, failed: 0 })
  const batchVideoErrors = ref([])

  const storyboards = computed(() => store.storyboards || [])

  function isHttpVideoUrl(url) {
    if (!url || typeof url !== 'string') return false
    const t = url.trim()
    return t.startsWith('http://') || t.startsWith('https://')
  }

  function recordHasPlayableVideoUrl(i) {
    if (!i) return false
    const lp = i.local_path && String(i.local_path).trim()
    if (lp) return true
    return isHttpVideoUrl(i.video_url)
  }

  function getSbAllImages(storyboardId) {
    const list = sbImages.value[storyboardId]
    if (!Array.isArray(list)) return []
    return list.filter((i) => 
      i.status === 'completed' && 
      i.frame_type !== 'quad_grid' && 
      i.frame_type !== 'nine_grid' && 
      (i.image_url || i.local_path)
    )
  }

  function getSbAllVideos(storyboardId) {
    const list = sbVideos.value[storyboardId]
    if (!Array.isArray(list)) return []
    return list.filter((i) => i.status === 'completed' && recordHasPlayableVideoUrl(i))
  }

  function resolveSbImageById(storyboardId, imageId) {
    if (imageId == null) return null
    const images = getSbAllImages(storyboardId)
    return images.find((i) => i.id === imageId) || null
  }

  function getSbFirstImage(storyboardId) {
    const images = getSbAllImages(storyboardId)
    const sb = storyboards.value.find((b) => b.id === storyboardId)
    if (sb?.first_frame_image_id != null) {
      const bound = resolveSbImageById(storyboardId, sb.first_frame_image_id)
      if (bound) return bound
    }
    const sel = sbSelectedImgId.value[storyboardId]
    if (sel != null) {
      const found = images.find((i) => i.id === sel)
      if (found) return found
    }
    const typed = images.find((i) => i.frame_type === 'storyboard_first')
    if (typed) return typed
    return null
  }

  function getSbLastImage(storyboardId) {
    const images = getSbAllImages(storyboardId)
    const sb = storyboards.value.find((b) => b.id === storyboardId)
    if (sb?.last_frame_image_id != null) {
      const bound = resolveSbImageById(storyboardId, sb.last_frame_image_id)
      if (bound) return bound
    }
    const sel = sbSelectedLastImgId.value[storyboardId]
    if (sel != null) {
      const found = images.find((i) => i.id === sel)
      if (found) return found
    }
    const typed = images.find((i) => i.frame_type === 'storyboard_last')
    if (typed) return typed
    if (sb?.last_frame_image_url || sb?.last_frame_local_path) {
      return {
        id: sb.last_frame_image_id,
        image_url: sb.last_frame_image_url,
        local_path: sb.last_frame_local_path,
        frame_type: 'storyboard_last',
      }
    }
    return null
  }

  function getSbImage(storyboardId) {
    if (storyboardUseFirstLastFrame.value) return getSbFirstImage(storyboardId)
    const images = getSbAllImages(storyboardId)
    if (!images.length) return null
    const selectedId = sbSelectedImgId.value[storyboardId]
    if (selectedId != null) {
      const found = images.find((i) => i.id === selectedId)
      if (found) return found
    }
    return images[0]
  }

  function getSbVideo(storyboardId) {
    const all = getSbAllVideos(storyboardId)
    if (all.length === 0) return null
    const selectedId = sbSelectedVideoId.value[storyboardId]
    if (selectedId != null) {
      const found = all.find((v) => v.id === selectedId)
      if (found) return found
    }
    return all[0]
  }

  function hasSbImage(sb) {
    if (storyboardUseFirstLastFrame.value && !isSbUniversalMode(sb.id)) {
      return !!(getSbFirstImage(sb.id) || (sb && (sb.composed_image || sb.image_url)))
    }
    return !!(getSbImage(sb.id) || (sb && (sb.composed_image || sb.image_url)))
  }

  function getSbFirstFrameUrl(sb) {
    const img = storyboardUseFirstLastFrame.value ? getSbFirstImage(sb.id) : getSbImage(sb.id)
    if (img && (img.image_url || img.local_path)) return assetImageUrl(img)
    if (sb.composed_image || sb.image_url) return assetImageUrl({ image_url: sb.composed_image || sb.image_url })
    return ''
  }

  function getSbLastFrameUrl(sb) {
    const img = getSbLastImage(sb.id)
    if (img && (img.image_url || img.local_path)) return assetImageUrl(img)
    if (sb.last_frame_image_url || sb.last_frame_local_path) {
      return assetImageUrl({ image_url: sb.last_frame_image_url, local_path: sb.last_frame_local_path })
    }
    return ''
  }

  function getNextStoryboard(storyboardId) {
    const list = storyboards.value
    const idx = list.findIndex((s) => s.id === storyboardId)
    if (idx === -1 || idx === list.length - 1) return null
    return list[idx + 1]
  }

  function getPrevStoryboard(storyboardId) {
    const list = storyboards.value
    const idx = list.findIndex((s) => s.id === storyboardId)
    if (idx === -1 || idx === 0) return null
    return list[idx - 1]
  }

  function isSbVideoGenerating(sbId) {
    if (generatingSbVideoIds.has(sbId)) return true
    if (sbId == null || dramaId.value == null || currentEpisodeId.value == null) return false
    return genStore.isRunning({
      dramaId: dramaId.value,
      episodeId: currentEpisodeId.value,
      resourceType: GEN_RESOURCE.SB_VIDEO,
      resourceId: sbId,
    })
  }

  function getSbResumableFailedVideo(storyboardId) {
    const list = sbVideos.value[storyboardId]
    if (!Array.isArray(list) || list.length === 0) return null
    return list.find((i) => i.status === 'failed' && i.can_resume_poll) || null
  }

  function getSbVideoError(storyboardId) {
    if (sbVideoErrors.value[storyboardId]) return sbVideoErrors.value[storyboardId]
    const list = sbVideos.value[storyboardId]
    if (!Array.isArray(list) || list.length === 0) return ''
    const hasCompleted = list.some((i) => i.status === 'completed' && recordHasPlayableVideoUrl(i))
    if (hasCompleted) return ''
    const bogusCompleted = list.find(
      (i) => i.status === 'completed' && i.video_url && !recordHasPlayableVideoUrl(i)
    )
    if (bogusCompleted) {
      const u = String(bogusCompleted.video_url || '').trim()
      if (u) return u
      if (bogusCompleted.error_msg) return bogusCompleted.error_msg
    }
    const failed = list.filter((i) => i.status === 'failed' && i.error_msg)
    if (failed.length === 0) return ''
    return failed[0].error_msg
  }

  async function loadStoryboardMedia() {
    const boards = storyboards.value
    if (boards.length === 0) {
      sbImages.value = {}
      sbVideos.value = {}
      return
    }
    const nextImages = { ...sbImages.value }
    const nextVideos = { ...sbVideos.value }
    await Promise.all(
      boards.map(async (sb) => {
        try {
          const [imgRes, vidRes] = await Promise.all([
            imagesAPI.list({ storyboard_id: sb.id, page: 1, page_size: 100 }),
            videosAPI.list({ storyboard_id: sb.id, page: 1, page_size: 50 })
          ])
          nextImages[sb.id] = (imgRes && imgRes.items) ? imgRes.items : []
          nextVideos[sb.id] = (vidRes && vidRes.items) ? vidRes.items : []
        } catch (_) {
          nextImages[sb.id] = []
          nextVideos[sb.id] = []
        }
      })
    )
    sbImages.value = nextImages
    sbVideos.value = nextVideos
    restoreSelectionsFromBackend()
  }

  function restoreSelectionsFromBackend() {
    const boards = storyboards.value
    for (const sb of boards) {
      const images = getSbAllImages(sb.id)
      if (sbSelectedImgId.value[sb.id] == null) {
        if (sb.first_frame_image_id != null) {
          sbSelectedImgId.value = { ...sbSelectedImgId.value, [sb.id]: sb.first_frame_image_id }
        } else {
          const sbPath = (sb.local_path || '').trim()
          const sbUrl = (sb.image_url || '').trim()
          if (sbPath || sbUrl) {
            const matched = images.find(
              (img) =>
                (sbPath && img.local_path && img.local_path === sbPath) ||
                (sbUrl && img.image_url && img.image_url === sbUrl)
            )
            if (matched) {
              sbSelectedImgId.value = { ...sbSelectedImgId.value, [sb.id]: matched.id }
            }
          }
        }
      }
      if (sbSelectedLastImgId.value[sb.id] == null && sb.last_frame_image_id != null) {
        sbSelectedLastImgId.value = { ...sbSelectedLastImgId.value, [sb.id]: sb.last_frame_image_id }
      }
    }
  }

  function sbMainVideoPlayerKey(sbId) {
    const v = getSbVideo(sbId)
    if (!v) return ''
    const src = assetVideoUrl(v)
    return `${v.id}:${v.updated_at || ''}:${src.slice(0, 160)}`
  }

  async function loadSingleStoryboardMedia(sbId) {
    if (!sbId) return
    try {
      const [imgRes, vidRes] = await Promise.all([
        imagesAPI.list({ storyboard_id: sbId, page: 1, page_size: 100 }),
        videosAPI.list({ storyboard_id: sbId, page: 1, page_size: 50 })
      ])
      sbImages.value = {
        ...sbImages.value,
        [sbId]: (imgRes && imgRes.items) ? imgRes.items : []
      }
      sbVideos.value = {
        ...sbVideos.value,
        [sbId]: (vidRes && vidRes.items) ? vidRes.items : []
      }
      restoreSelectionsFromBackend()
    } catch (_) {}
  }

  function hasSbFirstLastPair(sb) {
    return !!(getSbFirstImage(sb.id) && getSbLastImage(sb.id))
  }

  function getQuadGridImage(storyboardId) {
    const list = sbImages.value[storyboardId]
    if (!Array.isArray(list)) return null
    return list.find((i) => i.status === 'completed' && (i.frame_type === 'quad_grid' || i.frame_type === 'nine_grid') && (i.image_url || i.local_path)) || null
  }

  function canUsePrevTailAsFirst(sb) {
    const p = getPrevStoryboard(sb?.id)
    return !!(p && getSbLastImage(p.id))
  }

  function getVideoStripItems(storyboardId) {
    const all = getSbAllVideos(storyboardId)
    const current = getSbVideo(storyboardId)
    return all
      .filter((v) => !current || v.id !== current.id)
      .map((v, idx) => ({
        key: `vid-${v.id}`,
        video: v,
        src: assetVideoUrl(v),
        label: t('filmCreate.videoHistoryItem', { num: idx + 2 }),
      }))
  }

  function onSelectSbMainVideo(sb, video) {
    sbSelectedVideoId.value = { ...sbSelectedVideoId.value, [sb.id]: video.id }
    storyboardsAPI.update(sb.id, {
      video_url: video.video_url || null,
      local_path: video.local_path || undefined,
    }).catch(e => console.warn('[mainVideo] save failed', e))
  }

  function quadPanelLabel(frameType) {
    const map = {
      quad_panel_0: t('filmCreate.quad_topLeft'),
      quad_panel_1: t('filmCreate.quad_topRight'),
      quad_panel_2: t('filmCreate.quad_bottomLeft'),
      quad_panel_3: t('filmCreate.quad_bottomRight'),
      nine_panel_0: t('filmCreate.nine_topLeft'),
      nine_panel_1: t('filmCreate.nine_topCenter'),
      nine_panel_2: t('filmCreate.nine_topRight'),
      nine_panel_3: t('filmCreate.nine_centerLeft'),
      nine_panel_4: t('filmCreate.nine_center'),
      nine_panel_5: t('filmCreate.nine_centerRight'),
      nine_panel_6: t('filmCreate.nine_bottomLeft'),
      nine_panel_7: t('filmCreate.nine_bottomCenter'),
      nine_panel_8: t('filmCreate.nine_bottomRight'),
    }
    return map[frameType] || null
  }

  function getStripItems(storyboardId) {
    const allImgs = getSbAllImages(storyboardId)
    const firstImg = storyboardUseFirstLastFrame.value ? getSbFirstImage(storyboardId) : getSbImage(storyboardId)
    const lastImg = storyboardUseFirstLastFrame.value ? getSbLastImage(storyboardId) : null
    const boundIds = new Set([firstImg?.id, lastImg?.id].filter((x) => x != null))
    return allImgs
      .filter((img) => !boundIds.has(img.id))
      .map((img) => ({
        key: `img-${img.id}`,
        src: assetImageUrl(img),
        type: 'img',
        img,
        label: quadPanelLabel(img.frame_type),
        frameBadge: img.frame_type === 'storyboard_first' ? t('filmCreate.badgeFirst') : img.frame_type === 'storyboard_last' ? t('filmCreate.badgeLast') : null,
        prompt: img.prompt || '',
      }))
  }

  function stripItemTitle(sbId, item) {
    const lines = [item.label, item.prompt].filter(Boolean)
    if (storyboardUseFirstLastFrame.value) {
      lines.unshift(t('filmCreate.clickSetFirstLastFrame'))
    } else {
      lines.unshift(t('filmCreate.clickSetMainImage'))
    }
    return lines.join('\n\n')
  }

  function onSelectSbFrameImage(sb, img, slot) {
    if (!sb?.id || !img) return
    const isLast = slot === 'last'

    if (isLast) {
      sbSelectedLastImgId.value = { ...sbSelectedLastImgId.value, [sb.id]: img.id }
    } else {
      sbSelectedImgId.value = { ...sbSelectedImgId.value, [sb.id]: img.id }
    }

    const list = store.currentEpisode?.storyboards
    if (Array.isArray(list)) {
      const row = list.find((x) => Number(x.id) === Number(sb.id))
      if (row) {
        const now = new Date().toISOString()
        if (isLast) {
          row.last_frame_image_id = img.id
          row.last_frame_image_url = img.image_url || null
          row.last_frame_local_path = img.local_path || null
        } else {
          row.first_frame_image_id = img.id
          row.image_url = img.image_url || null
          row.local_path = img.local_path || null
        }
        row.updated_at = now
      }
    }

    const patch = { updated_at: new Date().toISOString() }
    if (isLast) {
      patch.last_frame_image_id = img.id
      patch.last_frame_image_url = img.image_url || null
      patch.last_frame_local_path = img.local_path || undefined
    } else {
      patch.image_url = img.image_url || null
      patch.local_path = img.local_path || undefined
      patch.first_frame_image_id = img.id
    }

    storyboardsAPI.update(sb.id, patch).catch((e) => console.warn('[refFrame] save failed', e))
  }

  function onSelectSbMainImage(sb, img) {
    onSelectSbFrameImage(sb, img, 'first')
  }

  function onSelectStripItem(sb, item) {
    onSelectSbMainImage(sb, item.img)
  }

  async function onStripItemClick(sb, item) {
    if (!storyboardUseFirstLastFrame.value) {
      onSelectStripItem(sb, item)
      return
    }
    try {
      await ElMessageBox.confirm(t('filmCreate.bindFrameConfirmMsg'), t('filmCreate.bindFrameConfirmTitle'), {
        confirmButtonText: t('filmCreate.setAsFirstFrame'),
        cancelButtonText: t('filmCreate.setAsLastFrame'),
        distinguishCancelAndClose: true,
        type: 'info',
      })
      onSelectSbFrameImage(sb, item.img, 'first')
      ElMessage.success(t('filmCreate.setAsFirstFrameSuccess'))
    } catch (action) {
      if (action === 'cancel') {
        onSelectSbFrameImage(sb, item.img, 'last')
        ElMessage.success(t('filmCreate.setAsLastFrameSuccess'))
      }
    }
  }

  async function onRemoveSbHistoryImage(storyboardId, imageGenId) {
    if (!storyboardId || !imageGenId) return
    try {
      await ElMessageBox.confirm(t('filmCreate.confirmDeleteHistoryImage'), t('filmCreate.deleteHistoryImageTitle'), {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        distinguishCancelAndClose: true,
      })
      await imagesAPI.delete(imageGenId)
      await loadSingleStoryboardMedia(storyboardId)
      ElMessage.success(t('filmCreate.historyImageDeleted'))
    } catch (err) {
      if (err !== 'cancel' && err !== 'close') {
        ElMessage.error(err?.message || t('filmCreate.msgDeleteFailed'))
      }
    }
  }

  function frameTypeForSlot(slot) {
    return slot === 'last' ? 'storyboard_last' : 'storyboard_first'
  }

  function uploadingSbImageSlot(sbId) {
    return sbImageUploadSlotById.value[sbId] || null
  }

  function onUploadSbImageClick(sb, slot = 'first') {
    if (!sb?.id) return
    sbImageUploadForId.value = sb.id
    sbImageUploadSlotById.value = { ...sbImageUploadSlotById.value, [sb.id]: slot }
    if (!storyboardUseFirstLastFrame.value) {
      uploadingSbImageId.value = sb.id
    }
    if (sbImageFileInput.value) {
      sbImageFileInput.value.value = ''
      sbImageFileInput.value.click()
    }
  }

  async function doUploadSbImage(sbId, file, slot = 'first') {
    if (!file || !sbId || !dramaId.value) return
    const useSlot = storyboardUseFirstLastFrame.value ? slot : 'first'
    if (storyboardUseFirstLastFrame.value) {
      sbImageUploadSlotById.value = { ...sbImageUploadSlotById.value, [sbId]: useSlot }
    } else {
      uploadingSbImageId.value = sbId
    }
    try {
      const res = await uploadAPI.uploadImage(file, { dramaId: dramaId.value })
      const url = res?.url || res?.path
      const localPath = res?.local_path
      if (!url && !localPath) {
        ElMessage.error(t('filmCreate.uploadNoUrlReturned'))
        return
      }
      const uploaded = await imagesAPI.upload({
        storyboard_id: sbId,
        drama_id: dramaId.value,
        image_url: url || '',
        local_path: localPath || undefined,
        frame_type: storyboardUseFirstLastFrame.value ? frameTypeForSlot(useSlot) : undefined,
      })
      ElMessage.success(useSlot === 'last' ? t('filmCreate.lastFrameUploadSuccess') : t('filmCreate.firstFrameUploadSuccess'))
      if (uploaded?.id) {
        const sb = (storyboards.value || []).find((b) => b.id === sbId)
        if (sb) onSelectSbFrameImage(sb, uploaded, useSlot)
      } else if (!storyboardUseFirstLastFrame.value) {
        const { [sbId]: _r, ...rest } = sbSelectedImgId.value
        sbSelectedImgId.value = rest
      }
      await loadSingleStoryboardMedia(sbId)
      restoreSelectionsFromBackend()
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.uploadFailed'))
    } finally {
      uploadingSbImageId.value = null
      const next = { ...sbImageUploadSlotById.value }
      delete next[sbId]
      sbImageUploadSlotById.value = next
    }
  }

  function onSbImageFileChange(ev) {
    const file = ev.target?.files?.[0]
    const sid = sbImageUploadForId.value
    if (!file || !sid) {
      ev.target.value = ''
      return
    }
    const slot = sbImageUploadSlotById.value[sid] || 'first'
    doUploadSbImage(sid, file, slot).finally(() => {
      sbImageUploadForId.value = null
      ev.target.value = ''
    })
  }

  return {
    sbImages,
    sbVideos,
    sbVideoErrors,
    sbSelectedImgId,
    sbSelectedLastImgId,
    sbSelectedVideoId,
    generatingSbImageIds,
    generatingSbFirstImageIds,
    generatingSbLastImageIds,
    generatingSbVideoIds,
    upscalingSbIds,
    linkingTailFrameIds,
    usingPrevTailAsFirstIds,
    sbImageUploadSlotById,
    uploadingSbImageId,
    sbImageUploadForId,
    sbImageFileInput,
    batchImageRunning,
    batchImageStopping,
    batchImageProgress,
    batchImageErrors,
    batchVideoRunning,
    batchVideoStopping,
    batchVideoProgress,
    batchVideoErrors,
    storyboards,
    getSbAllImages,
    getSbAllVideos,
    getSbFirstImage,
    getSbLastImage,
    getSbImage,
    getSbVideo,
    hasSbImage,
    hasSbFirstLastPair,
    getQuadGridImage,
    getSbFirstFrameUrl,
    getSbLastFrameUrl,
    getNextStoryboard,
    getPrevStoryboard,
    canUsePrevTailAsFirst,
    isSbVideoGenerating,
    getSbResumableFailedVideo,
    getSbVideoError,
    loadStoryboardMedia,
    loadSingleStoryboardMedia,
    restoreSelectionsFromBackend,
    sbMainVideoPlayerKey,
    getVideoStripItems,
    onSelectSbMainVideo,
    quadPanelLabel,
    getStripItems,
    stripItemTitle,
    onSelectSbFrameImage,
    onSelectSbMainImage,
    onSelectStripItem,
    onStripItemClick,
    onRemoveSbHistoryImage,
    frameTypeForSlot,
    uploadingSbImageSlot,
    onUploadSbImageClick,
    doUploadSbImage,
    onSbImageFileChange,
    recordHasPlayableVideoUrl,
    resolveSbImageById,
  }
}
