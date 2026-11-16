import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { imagesAPI } from '@/api/images'
import { storyboardsAPI } from '@/api/storyboards'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'
import { getStoryboardAspectRatio } from '@/utils/storyboardAspectRatio'

export function useStoryboardImages({
  store,
  dramaId,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  generatingSbFirstImageIds,
  generatingSbLastImageIds,
  generatingSbImageIds,
  upscalingSbIds,
  linkingTailFrameIds,
  usingPrevTailAsFirstIds,
  sbCharacterIds,
  sbSelectedImgId,
  sbSelectedLastImgId,
  ensureProfessionalFramePrompt,
  buildLastFrameImagePrompt,
  getSbFirstImage,
  getSbLastImage,
  getSbImage,
  getSbVideo,
  getNextStoryboard,
  getPrevStoryboard,
  getSelectedStyle,
  projectAspectRatio,
  assetImageUrl,
  frameTypeForSlot,
  buildSbGenMeta,
  pollTask,
  loadDrama,
  loadSingleStoryboardMedia,
  refreshStoryboardsOnly,
  restoreSelectionsFromBackend,
  onSelectSbFrameImage,
  genStore,
}) {
  async function onGenerateSbFrameImage(sb, slot) {
    if (!dramaId.value || !sb?.id) return
    const isLast = slot === 'last'
    const loadingSet = isLast ? generatingSbLastImageIds : generatingSbFirstImageIds
    const meta = buildSbGenMeta(
      sb,
      isLast ? GEN_RESOURCE.SB_LAST_IMAGE : GEN_RESOURCE.SB_FIRST_IMAGE,
      isLast ? t('filmCreate.lastFrame') : t('filmCreate.firstFrame')
    )
    sb.errorMsg = ''
    sb.error_msg = ''
    loadingSet.add(sb.id)
    genStore.markRunning(meta)
    try {
      let idsToSave = sbCharacterIds?.value?.[sb.id]
      if (idsToSave === undefined) {
        const sbRowForChars = (store.storyboards || []).find((b) => b.id === sb.id)
        const charList = Array.isArray(sbRowForChars?.characters) ? sbRowForChars.characters : []
        idsToSave = charList
          .map((c) => Number(typeof c === 'object' && c != null ? c.id : c))
          .filter((n) => Number.isFinite(n))
      }
      const sbRow = (store.storyboards || []).find((b) => b.id === sb.id)
      let prompt = ''
      if (storyboardUseFirstLastFrame.value) {
        prompt = await ensureProfessionalFramePrompt(sb, isLast ? 'last' : 'first')
      } else if (isLast) {
        prompt = (buildLastFrameImagePrompt ? buildLastFrameImagePrompt(sb.id) : '') || sbRow?.image_prompt || sbRow?.description || ''
      } else {
        prompt = sbRow?.polished_prompt || sbRow?.image_prompt || sbRow?.description || ''
      }
      try {
        await storyboardsAPI.update(sb.id, { character_ids: Array.isArray(idsToSave) ? idsToSave : [] })
      } catch (e) {
        ElMessage.warning(t('filmCreate.saveSbCharFailed'))
        return
      }
      let refImagesForCreate = undefined
      const useFirstLayoutLock = isLast && lastFrameUseFirstLayoutLock.value
      if (useFirstLayoutLock) {
        const firstImg = getSbFirstImage ? getSbFirstImage(sb.id) : null
        if (firstImg) {
          const firstUrl = (assetImageUrl ? assetImageUrl(firstImg) : '') || firstImg.image_url || firstImg.local_path
          if (firstUrl) {
            refImagesForCreate = [firstUrl]
          }
        }
      }
      const res = await imagesAPI.create({
        storyboard_id: sb.id,
        drama_id: dramaId.value,
        prompt,
        model: undefined,
        style: getSelectedStyle ? getSelectedStyle() : undefined,
        frame_type: frameTypeForSlot ? frameTypeForSlot(slot) : undefined,
        aspect_ratio: getStoryboardAspectRatio(sb, projectAspectRatio.value),
        reference_images: refImagesForCreate,
        use_first_frame_layout_lock: isLast ? !!lastFrameUseFirstLayoutLock.value : undefined,
      })
      ElMessage.success(isLast ? t('filmCreate.lastFrameTaskSubmitted') : t('filmCreate.firstFrameTaskSubmitted'))
      if (res?.task_id) {
        const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
        if (pollRes?.status === 'failed') {
          sb.errorMsg = pollRes.error || t('filmCreate.generationFailed')
        } else {
          if (loadDrama) await loadDrama()
          if (restoreSelectionsFromBackend) restoreSelectionsFromBackend()
          if (storyboardUseFirstLastFrame.value) {
            if (isLast) {
              if (sbSelectedLastImgId?.value) delete sbSelectedLastImgId.value[sb.id]
            } else {
              if (sbSelectedImgId?.value) delete sbSelectedImgId.value[sb.id]
            }
          }
        }
      } else {
        if (loadSingleStoryboardMedia) await loadSingleStoryboardMedia(sb.id)
        if (restoreSelectionsFromBackend) restoreSelectionsFromBackend()
        if (storyboardUseFirstLastFrame.value) {
          if (isLast) {
            if (sbSelectedLastImgId?.value) delete sbSelectedLastImgId.value[sb.id]
          } else {
            if (sbSelectedImgId?.value) delete sbSelectedImgId.value[sb.id]
          }
        }
      }
    } catch (e) {
      sb.errorMsg = e.message || t('filmCreate.generationFailed')
      ElMessage.error(e.message || t('filmCreate.generationFailed'))
    } finally {
      loadingSet.delete(sb.id)
      genStore.markDone(meta)
    }
  }

  async function onGenerateSbFramePair(sb) {
    const hasFirst = !!((getSbFirstImage ? getSbFirstImage(sb.id) : null) || (sb.image_url || sb.composed_image))
    if (!hasFirst) {
      await onGenerateSbFrameImage(sb, 'first')
      if (!(getSbFirstImage ? getSbFirstImage(sb.id) : null) && !(sb.image_url || sb.composed_image)) return
    }
    await onGenerateSbFrameImage(sb, 'last')
  }

  async function onGenerateSbImage(sb) {
    if (!dramaId.value || !sb?.id) return
    sb.errorMsg = ''
    sb.error_msg = ''
    const meta = buildSbGenMeta(sb, GEN_RESOURCE.SB_IMAGE, t('filmCreate.storyboardImage'))
    generatingSbImageIds.add(sb.id)
    genStore.markRunning(meta)
    try {
      let idsToSave = sbCharacterIds?.value?.[sb.id]
      if (idsToSave === undefined) {
        const charList = Array.isArray(sb.characters) ? sb.characters : []
        idsToSave = charList
          .map((c) => Number(typeof c === 'object' && c != null ? c.id : c))
          .filter((n) => Number.isFinite(n))
      }
      try {
        await storyboardsAPI.update(sb.id, { character_ids: Array.isArray(idsToSave) ? idsToSave : [] })
      } catch (e) {
        console.warn('[sbImage] save character check failed', e)
        ElMessage.warning(t('filmCreate.saveSbCharFailedRetry'))
        return
      }
      const res = await imagesAPI.create({
        storyboard_id: sb.id,
        drama_id: dramaId.value,
        prompt: sb.polished_prompt || sb.image_prompt || sb.description || '',
        model: undefined,
        style: getSelectedStyle ? getSelectedStyle() : undefined,
        frame_type: gridMode.value !== 'single' ? gridMode.value : undefined,
        aspect_ratio: getStoryboardAspectRatio(sb, projectAspectRatio.value),
      })
      ElMessage.success(t('filmCreate.sbImageTaskSubmitted'))
      if (res?.task_id) {
        const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id), meta)
        if (pollRes?.status === 'failed') {
          sb.errorMsg = pollRes.error || t('filmCreate.generationFailed')
        } else {
          ElMessage.success(t('filmCreate.sbImageGenDone'))
        }
      } else {
        if (loadSingleStoryboardMedia) await loadSingleStoryboardMedia(sb.id)
      }
    } catch (e) {
      console.error(e)
      sb.errorMsg = e.message || t('filmCreate.generationFailed')
      ElMessage.error(e.message || t('filmCreate.generationFailed'))
    } finally {
      generatingSbImageIds.delete(sb.id)
      genStore.markDone(meta)
    }
  }

  function getSbLocalImage(sb) {
    const img = getSbImage ? getSbImage(sb.id) : null
    return img?.local_path || sb.local_path || null
  }

  async function onUpscaleSbImage(sb) {
    if (!sb?.id || upscalingSbIds.has(sb.id)) return
    upscalingSbIds.add(sb.id)
    try {
      await storyboardsAPI.upscale(sb.id)
      ElMessage.success(t('filmCreate.upscaleSuccess'))
      if (loadSingleStoryboardMedia) await loadSingleStoryboardMedia(sb.id)
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.upscaleFailed'))
    } finally {
      upscalingSbIds.delete(sb.id)
    }
  }

  async function onLinkTailFrameToNext(sb) {
    if (!dramaId.value || !sb?.id) return
    const nextSb = getNextStoryboard ? getNextStoryboard(sb.id) : null
    if (!nextSb) {
      ElMessage.warning(t('filmCreate.alreadyLastShotWarning'))
      return
    }
    const video = getSbVideo ? getSbVideo(sb.id) : null
    if (!video) {
      ElMessage.warning(t('filmCreate.shotNoVideoWarning'))
      return
    }
    try {
      await ElMessageBox.confirm(
        t('filmCreate.tailLinkConfirmMsg', { cur: sb.storyboard_number ?? sb.id, next: nextSb.storyboard_number ?? nextSb.id }),
        t('filmCreate.tailLinkTitle'),
        { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
      )
    } catch {
      return
    }
    linkingTailFrameIds.add(sb.id)
    try {
      const data = await storyboardsAPI.linkTailFrame(sb.id, { drama_id: dramaId.value })
      if (data?.error) {
        throw new Error(data.error)
      }
      ElMessage.success(t('filmCreate.tailLinkSuccess', { num: nextSb.storyboard_number ?? nextSb.id }))
      await Promise.all([
        loadSingleStoryboardMedia(sb.id),
        loadSingleStoryboardMedia(nextSb.id)
      ])
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.tailLinkFailed'))
    } finally {
      linkingTailFrameIds.delete(sb.id)
    }
  }

  async function onUsePrevTailAsFirst(sb) {
    if (!dramaId.value || !sb?.id) return
    const prevSb = getPrevStoryboard ? getPrevStoryboard(sb.id) : null
    if (!prevSb) {
      ElMessage.warning(t('filmCreate.alreadyFirstShotWarning'))
      return
    }
    const prevLastImg = getSbLastImage ? getSbLastImage(prevSb.id) : null
    if (!prevLastImg) {
      ElMessage.warning(t('filmCreate.prevShotNoLastFrameWarning', { num: prevSb.storyboard_number ?? prevSb.id }))
      return
    }
    usingPrevTailAsFirstIds.add(sb.id)
    try {
      const uploaded = await imagesAPI.upload({
        storyboard_id: sb.id,
        drama_id: dramaId.value,
        image_url: prevLastImg.image_url || '',
        local_path: prevLastImg.local_path || undefined,
        prompt: t('filmCreate.prevTailFramePrompt', { num: prevSb.storyboard_number ?? prevSb.id }),
        frame_type: 'storyboard_first'
      })
      if (uploaded?.id && onSelectSbFrameImage) {
        onSelectSbFrameImage(sb, uploaded, 'first')
      }
      ElMessage.success(t('filmCreate.prevTailFrameSuccess', { num: prevSb.storyboard_number ?? prevSb.id }))
      await Promise.all([
        refreshStoryboardsOnly ? refreshStoryboardsOnly() : Promise.resolve(),
        loadSingleStoryboardMedia ? loadSingleStoryboardMedia(sb.id) : Promise.resolve()
      ])
      if (sbSelectedImgId?.value) delete sbSelectedImgId.value[sb.id]
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.prevTailFrameFailed'))
    } finally {
      usingPrevTailAsFirstIds.delete(sb.id)
    }
  }

  return {
    onGenerateSbFrameImage,
    onGenerateSbFramePair,
    onGenerateSbImage,
    getSbLocalImage,
    onUpscaleSbImage,
    onLinkTailFrameToNext,
    onUsePrevTailAsFirst,
  }
}
