import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'
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
  loadSingleStoryboardMedia,
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
    getSbFirstFrameUrl,
    getSbLastFrameUrl,
    getNextStoryboard,
    getPrevStoryboard,
    isSbVideoGenerating,
    getSbResumableFailedVideo,
    getSbVideoError,
    loadStoryboardMedia,
    restoreSelectionsFromBackend,
    sbMainVideoPlayerKey,
  }
}
