import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { dramaAPI } from '@/api/drama'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export function useMergeExport({
  store,
  dramaId,
  currentEpisodeId,
  currentEpisode,
  genStore,
  loadDrama,
  pollTask,
}) {
  const videoSubtitle = ref(false)
  const videoBurnDialogue = ref(false)
  const videoWatermark = ref(false)
  const videoWatermarkText = ref('')
  const videoErrorMsg = ref('')

  const currentEpisodeVideoUrl = computed(() => {
    const url = currentEpisode?.value?.video_url
    if (!url || !String(url).trim()) return ''
    const s = String(url).trim()
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    return '/static/' + s.replace(/^\//, '')
  })

  function getFinalizeMergeOptions() {
    return {
      burn_narration_subtitles: !!videoSubtitle.value,
      burn_dialogue_audio: !!videoBurnDialogue.value,
      watermark_text: videoWatermark.value ? String(videoWatermarkText.value || '').trim().slice(0, 200) : '',
    }
  }

  async function onGenerateVideo() {
    if (!currentEpisodeId.value) return
    const epId = currentEpisodeId.value
    const did = dramaId.value
    const dramaTitle = store.drama?.title || ''
    const epNum = store.currentEpisode?.episode_number
    const epLabel = dramaTitle
      ? t('generationStore.episodeWithTitle', { title: dramaTitle, num: epNum ?? '' })
      : t('generationStore.episodeOnly', { num: epNum ?? '' })
    const mergeMeta = {
      dramaId: did,
      episodeId: epId,
      dramaTitle,
      episodeNumber: epNum,
      resourceType: GEN_RESOURCE.EPISODE_MERGE,
      resourceId: epId,
      label: `${epLabel} ${t('filmCreate.mergeFullEpisodeVideo')}`,
    }
    store.setVideoStatus('generating', did, epId)
    store.setVideoProgress(5, did, epId)
    genStore.markRunning(mergeMeta)
    videoErrorMsg.value = ''
    try {
      const result = await dramaAPI.finalizeEpisode(epId, getFinalizeMergeOptions())
      if (result?.task_id != null) {
        store.setVideoProgress(10, did, epId)
        ElMessage.success(result?.message || t('filmCreate.mergeVideoSubmittedTip'))
        const pollResult = await pollTask(result.task_id, () => loadDrama(), mergeMeta)
        await loadDrama()
        if (pollResult?.status === 'completed') {
          store.setVideoProgress(100, did, epId)
          if (currentEpisodeVideoUrl.value) {
            store.setVideoStatus('done', did, epId)
            ElMessage.success(t('filmCreate.videoGenDone'))
          } else {
            store.setVideoStatus('error', did, epId)
            videoErrorMsg.value = t('filmCreate.videoDoneNoUrlRefreshTip')
            ElMessage.warning(videoErrorMsg.value)
          }
        } else if (pollResult?.status === 'failed') {
          store.setVideoStatus('error', did, epId)
          videoErrorMsg.value = pollResult?.error || t('filmCreate.videoGenFailed')
        } else if (pollResult?.status === 'timeout') {
          store.setVideoStatus('generating', did, epId)
          videoErrorMsg.value = t('filmCreate.taskQueuedOrGenRefreshTip')
          ElMessage.warning(videoErrorMsg.value)
        }
      } else {
        store.setVideoStatus('error', did, epId)
        const msg = result?.message || t('filmCreate.noClipsToMergeTip')
        videoErrorMsg.value = msg
        ElMessage.warning(msg)
      }
    } catch (e) {
      videoErrorMsg.value = e.message || t('filmCreate.generationFailed')
      store.setVideoStatus('error', did, epId)
    } finally {
      if (store.getVideoStatus(did, epId) !== 'generating') {
        genStore.markDone(mergeMeta)
      }
    }
  }

  return {
    videoSubtitle,
    videoBurnDialogue,
    videoWatermark,
    videoWatermarkText,
    videoErrorMsg,
    currentEpisodeVideoUrl,
    getFinalizeMergeOptions,
    onGenerateVideo,
  }
}
