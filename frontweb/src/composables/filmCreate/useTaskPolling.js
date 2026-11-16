import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'
import { syncGeneratingSetsFromStore, buildEpisodeContext } from '@/composables/useGenerationTaskSync'

export function useTaskPolling({
  store,
  dramaId,
  currentEpisodeId,
  genStore,
  loadDrama,
  loadSingleStoryboardMedia,
  generatingCharIds,
  generatingPropIds,
  generatingSceneIds,
  generatingSbImageIds,
  generatingSbFirstImageIds,
  generatingSbLastImageIds,
  generatingSbVideoIds,
  videoErrorMsg,
}) {
  function getGeneratingSetsBag() {
    return {
      generatingCharIds,
      generatingPropIds,
      generatingSceneIds,
      generatingSbImageIds,
      generatingSbFirstImageIds,
      generatingSbLastImageIds,
      generatingSbVideoIds,
    }
  }

  function buildSbGenMeta(sb, resourceType, labelPrefix) {
    const num = sb?.storyboard_number ?? sb?.id
    const epNum = store.currentEpisode?.episode_number
    const dramaTitle = store.drama?.title || ''
    const epText = t('filmCreate.episodeNum', { num: epNum ?? '' })
    const epLabel = dramaTitle ? `${dramaTitle} · ${epText}` : epText
    return {
      dramaId: dramaId.value,
      episodeId: currentEpisodeId.value,
      dramaTitle,
      episodeNumber: epNum,
      resourceType,
      resourceId: sb?.id,
      label: `${epLabel} ${labelPrefix} #${num}`,
    }
  }

  function resolvePollMeta(meta = {}) {
    return {
      dramaId: meta.dramaId ?? dramaId.value,
      episodeId: meta.episodeId ?? currentEpisodeId.value,
      dramaTitle: meta.dramaTitle ?? store.drama?.title,
      episodeNumber: meta.episodeNumber ?? store.currentEpisode?.episode_number,
      resourceType: meta.resourceType || 'unknown',
      resourceId: meta.resourceId,
      label: meta.label,
      ...meta,
    }
  }

  function pollTask(taskId, onDone, meta = {}) {
    return genStore.pollTask(taskId, resolvePollMeta(meta), onDone, { ElMessage })
  }

  async function pollUntilResourceHasImage(checker, maxAttempts = 20, intervalMs = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs))
      if (loadDrama) await loadDrama()
      if (checker()) return
    }
  }

  async function recoverAndSyncEpisodeTasks(epId) {
    const did = dramaId.value
    const eid = epId ?? currentEpisodeId.value
    if (!did || !eid) return
    const ctx = buildEpisodeContext(store, did, eid)
    await genStore.recoverPendingForEpisode({
      ...ctx,
      ElMessage,
      callbacks: {
        onStoryboardMedia: (sbId) => (loadSingleStoryboardMedia ? loadSingleStoryboardMedia(sbId) : Promise.resolve()),
        onDramaRefresh: () => (loadDrama ? loadDrama() : Promise.resolve()),
        onEpisodeMergeComplete: () => {
          store.setVideoStatus('done', did, eid)
          store.setVideoProgress(100, did, eid)
        },
        onEpisodeMergeFailed: (err) => {
          store.setVideoStatus('error', did, eid)
          if (videoErrorMsg) videoErrorMsg.value = err || t('filmCreate.videoGenFailed')
        },
      },
    })
    syncGeneratingSetsFromStore(genStore, did, eid, getGeneratingSetsBag())
    const mergeRunning = genStore.getRunningForEpisode(did, eid).some(
      (tTask) => tTask.resourceType === GEN_RESOURCE.EPISODE_MERGE
    )
    if (mergeRunning) {
      store.setVideoStatus('generating', did, eid)
    }
  }

  return {
    getGeneratingSetsBag,
    buildSbGenMeta,
    resolvePollMeta,
    pollTask,
    pollUntilResourceHasImage,
    recoverAndSyncEpisodeTasks,
  }
}
