import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'
import { storyboardsAPI } from '@/api/storyboards'
import { uploadAPI } from '@/api/upload'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export async function captureVideoLastFrame(videoUrl) {
  return new Promise((resolve) => {
    if (!videoUrl) return resolve(null)
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'metadata'
    let captured = false
    const timeout = setTimeout(() => { if (!captured) resolve(null) }, 12000)
    video.addEventListener('error', () => { clearTimeout(timeout); if (!captured) resolve(null) })
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.max(0, video.duration - 0.5)
    })
    video.addEventListener('seeked', () => {
      if (captured) return
      captured = true
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 512
        canvas.height = video.videoHeight || 288
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      } catch (_) {
        resolve(null)
      }
    })
    video.src = videoUrl
  })
}

export function useBatchGeneration({
  store,
  dramaId,
  currentEpisodeId,
  pipelineRunning,
  pipelineConcurrency,
  pipelineVideoConcurrency,
  batchImageRunning,
  batchImageStopping,
  batchImageProgress,
  batchImageErrors,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
  batchVideoErrors,
  videoFrameContiguity,
  sbImages,
  sbVideos,
  hasSbImage,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  gridMode,
  ensureProfessionalFramePrompt,
  getSelectedStyle,
  projectAspectRatio,
  videoResolution,
  pollTask,
  loadStoryboardMedia,
  loadSingleStoryboardMedia,
  sbSelectedImgId,
  sbSelectedVideoId,
  restoreSelectionsFromBackend,
  recordHasPlayableVideoUrl,
  sbCanSubmitVideo,
  collectSbOmniReferenceAbsoluteUrls,
  getSbFirstFrameUrl,
  generatingSbVideoIds,
  getMainImageUrlForVideo,
  toAbsoluteImageUrl,
  sbVideoFirstLastUrls,
  buildSbVideoPromptForApi,
  getSbVideoDurationForApi,
  buildSbGenMeta,
}) {
  async function startBatchImageGeneration() {
    if (!currentEpisodeId.value || batchImageRunning.value || pipelineRunning.value) return
    batchImageErrors.value = []
    batchImageStopping.value = false
    batchImageRunning.value = true
    try {
      if (Object.keys(sbImages.value).length === 0) {
        await loadStoryboardMedia()
      }
      const boards = store.storyboards || []
      const todo = boards.filter((sb) => !hasSbImage(sb))
      if (todo.length === 0) {
        ElMessage.info(t('filmCreate.allShotsHaveImagesTip'))
        return
      }
      batchImageProgress.value = { current: 0, total: todo.length, failed: 0 }
      const concurrency = pipelineConcurrency.value || 3
      let doneCount = 0

      let queueIdx = 0
      const worker = async () => {
        while (queueIdx < todo.length) {
          if (batchImageStopping.value) break
          const sb = todo[queueIdx++]
          const useFirstLast = storyboardUseFirstLastFrame.value && !isSbUniversalMode(sb.id)
          try {
            let prompt = sb.polished_prompt || sb.image_prompt || sb.description || ''
            let frameTypeForCreate = gridMode.value !== 'single' ? gridMode.value : undefined
            if (useFirstLast) {
              prompt = await ensureProfessionalFramePrompt(sb, 'first')
              frameTypeForCreate = 'storyboard_first'
            }
            const res = await imagesAPI.create({
              storyboard_id: sb.id,
              drama_id: dramaId.value,
              prompt,
              style: getSelectedStyle(),
              frame_type: frameTypeForCreate,
              aspect_ratio: projectAspectRatio.value || '16:9',
            })
            if (res?.task_id) {
              const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id))
              if (pollRes?.status === 'failed') {
                batchImageErrors.value.push(`#${sb.storyboard_number ?? sb.id}: ${pollRes.error || t('filmCreate.generationFailed')}`)
                batchImageProgress.value = { ...batchImageProgress.value, failed: batchImageProgress.value.failed + 1 }
              }
            } else {
              await loadSingleStoryboardMedia(sb.id)
            }
            if (useFirstLast) {
              delete sbSelectedImgId.value[sb.id]
            }
          } catch (e) {
            batchImageErrors.value.push(`#${sb.storyboard_number ?? sb.id}: ${e.message || t('filmCreate.msgSubmitFailed')}`)
            batchImageProgress.value = { ...batchImageProgress.value, failed: batchImageProgress.value.failed + 1 }
          }
          doneCount++
          batchImageProgress.value = { ...batchImageProgress.value, current: doneCount }
        }
      }
      await Promise.allSettled(Array.from({ length: Math.min(concurrency, todo.length) }, () => worker()))
      if (!batchImageStopping.value) {
        restoreSelectionsFromBackend()
        if (batchImageProgress.value.failed === 0) ElMessage.success(t('filmCreate.batchImageSuccessAll', { count: todo.length }))
        else ElMessage.warning(t('filmCreate.batchImagePartial', { failed: batchImageProgress.value.failed, total: todo.length }))
      } else {
        ElMessage.info(t('filmCreate.batchImageStopped'))
      }
    } finally {
      batchImageRunning.value = false
    }
  }

  async function startBatchVideoGeneration() {
    if (!currentEpisodeId.value || batchVideoRunning.value || pipelineRunning.value) return
    batchVideoErrors.value = []
    batchVideoStopping.value = false
    batchVideoRunning.value = true
    try {
      if (Object.keys(sbVideos.value).length === 0) {
        await loadStoryboardMedia()
      }
      const boards = store.storyboards || []
      const todo = boards.filter((sb) => {
        const vidList = sbVideos.value[sb.id] || []
        if (vidList.some((v) => v.status === 'completed' && recordHasPlayableVideoUrl(v))) return false
        if (isSbUniversalMode(sb.id)) {
          if (!sbCanSubmitVideo(sb)) return false
          return collectSbOmniReferenceAbsoluteUrls(sb).length > 0
        }
        return !!getSbFirstFrameUrl(sb)
      })
      if (todo.length === 0) {
        ElMessage.info(t('filmCreate.noShotsNeedVideoTip'))
        return
      }
      batchVideoProgress.value = { current: 0, total: todo.length, failed: 0 }
      const contiguity = videoFrameContiguity.value
      const videoConcurrency = contiguity ? 1 : (pipelineVideoConcurrency.value || 2)
      let videoDoneCount = 0
      let prevVideoItem = null

      let videoQueueIdx = 0
      const videoWorker = async () => {
        while (videoQueueIdx < todo.length) {
          if (batchVideoStopping.value) break
          const sb = todo[videoQueueIdx++]
          const universal = isSbUniversalMode(sb.id)
          const omniRefs = universal ? collectSbOmniReferenceAbsoluteUrls(sb) : []
          if (!universal && !getSbFirstFrameUrl(sb)) {
            videoDoneCount++
            batchVideoProgress.value = { ...batchVideoProgress.value, current: videoDoneCount }
            continue
          }
          if (universal && !omniRefs.length) {
            videoDoneCount++
            batchVideoProgress.value = { ...batchVideoProgress.value, current: videoDoneCount }
            continue
          }
          try {
            generatingSbVideoIds.add(sb.id)
            storyboardsAPI.update(sb.id, { video_url: null }).catch(() => {})
            if (sbSelectedVideoId.value[sb.id] != null) {
              const next = { ...sbSelectedVideoId.value }
              delete next[sb.id]
              sbSelectedVideoId.value = next
            }
            const firstFrameUrl = await getMainImageUrlForVideo(sb)
            const absoluteUrl = universal ? (omniRefs[0] || '') : toAbsoluteImageUrl(firstFrameUrl)
            let contiguityFirstFrameUrl = absoluteUrl
            if (contiguity && prevVideoItem && !universal) {
              const prevVideoUrl = prevVideoItem.local_path
                ? toAbsoluteImageUrl('/static/' + prevVideoItem.local_path.replace(/^\//, ''))
                : prevVideoItem.video_url
              if (prevVideoUrl) {
                try {
                  const lastFrameBlob = await captureVideoLastFrame(prevVideoUrl)
                  if (lastFrameBlob) {
                    const file = new File([lastFrameBlob], 'continuity_frame.jpg', { type: 'image/jpeg' })
                    const uploadRes = await uploadAPI.uploadImage(file, { dramaId: dramaId.value })
                    if (uploadRes?.local_path) {
                      contiguityFirstFrameUrl = toAbsoluteImageUrl('/static/' + uploadRes.local_path.replace(/^\//, ''))
                    }
                  }
                } catch (_) {}
              }
            }
            const { first: vFirst, last: vLast } = sbVideoFirstLastUrls(sb, universal, contiguityFirstFrameUrl || undefined)
            let refUrls = universal
              ? (omniRefs.length ? omniRefs : undefined)
              : (absoluteUrl ? [absoluteUrl] : undefined)
            if (!universal && vLast && refUrls && !refUrls.includes(vLast)) {
              refUrls = [...refUrls, vLast]
            }
            const res = await videosAPI.create({
              drama_id: dramaId.value,
              storyboard_id: sb.id,
              prompt: buildSbVideoPromptForApi(sb),
              image_url: vFirst || undefined,
              first_frame_url: vFirst,
              last_frame_url: vLast,
              reference_image_urls: refUrls,
              style: getSelectedStyle(),
              aspect_ratio: projectAspectRatio.value || '16:9',
              resolution: videoResolution.value || undefined,
              duration: getSbVideoDurationForApi(sb),
            })
            if (res?.task_id) {
              const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_VIDEO, t('filmCreate.storyboardVideoShort'))
              const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
              if (pollRes?.status === 'failed') {
                batchVideoErrors.value.push(`#${sb.storyboard_number ?? sb.id}: ${pollRes.error || t('filmCreate.generationFailed')}`)
                batchVideoProgress.value = { ...batchVideoProgress.value, failed: batchVideoProgress.value.failed + 1 }
                prevVideoItem = null
              } else if (contiguity && pollRes?.status === 'completed') {
                const vList = sbVideos.value[sb.id] || []
                prevVideoItem = vList.find((v) => v.status === 'completed') || null
              }
            } else {
              await loadSingleStoryboardMedia(sb.id)
              if (contiguity) {
                const vList = sbVideos.value[sb.id] || []
                prevVideoItem = vList.find((v) => v.status === 'completed') || null
              }
            }
          } catch (e) {
            batchVideoErrors.value.push(`#${sb.storyboard_number ?? sb.id}: ${e.message || t('filmCreate.msgSubmitFailed')}`)
            batchVideoProgress.value = { ...batchVideoProgress.value, failed: batchVideoProgress.value.failed + 1 }
            if (contiguity) prevVideoItem = null
          } finally {
            generatingSbVideoIds.delete(sb.id)
          }
          videoDoneCount++
          batchVideoProgress.value = { ...batchVideoProgress.value, current: videoDoneCount }
        }
      }
      await Promise.allSettled(Array.from({ length: Math.min(videoConcurrency, todo.length) }, () => videoWorker()))
      if (!batchVideoStopping.value) {
        if (batchVideoProgress.value.failed === 0) ElMessage.success(t('filmCreate.batchVideoSuccessAll', { count: todo.length }))
        else ElMessage.warning(t('filmCreate.batchVideoPartial', { failed: batchVideoProgress.value.failed, total: todo.length }))
      } else {
        ElMessage.info(t('filmCreate.batchVideoStopped'))
      }
    } finally {
      batchVideoRunning.value = false
    }
  }

  return {
    startBatchImageGeneration,
    startBatchVideoGeneration,
    captureVideoLastFrame,
  }
}
