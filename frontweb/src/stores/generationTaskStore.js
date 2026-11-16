import { t as i18nT } from '../i18n/index.js'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskAPI } from '@/api/task'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'

/** 资源类型常量 */
export const GEN_RESOURCE = {
  CHAR_IMAGE: 'char_image',
  PROP_IMAGE: 'prop_image',
  SCENE_IMAGE: 'scene_image',
  SB_IMAGE: 'sb_image',
  SB_FIRST_IMAGE: 'sb_first_image',
  SB_LAST_IMAGE: 'sb_last_image',
  SB_VIDEO: 'sb_video',
  EPISODE_MERGE: 'episode_merge',
  EXTRACT_CHARACTERS: 'extract_characters',
  EXTRACT_PROPS: 'extract_props',
  EXTRACT_SCENES: 'extract_scenes',
  GENERATE_STORYBOARD: 'generate_storyboard',
  GENERATE_STORY: 'generate_story',
}

/** 超过此时间仍为 running 且无进展则自动清理（毫秒） */
const STALE_TASK_MS = 30 * 60 * 1000
/** 后端任务 updated_at 长时间不变，视为重启后僵尸任务（毫秒） */
const ORPHAN_PROCESSING_MS = 10 * 60 * 1000

const LAST_FRAME_TYPES = new Set(['last', 'storyboard_last', 'tail', 'last_frame'])
const FIRST_FRAME_TYPES = new Set(['first', 'storyboard_first', 'head', 'first_frame'])

function taskKey({ dramaId, episodeId, resourceType, resourceId }) {
  return `${dramaId}:${episodeId}:${resourceType}:${resourceId}`
}

function isLastFrameType(frameType) {
  if (frameType == null || frameType === '') return false
  return LAST_FRAME_TYPES.has(String(frameType).toLowerCase())
}

function isFirstFrameType(frameType) {
  if (frameType == null || frameType === '') return false
  return FIRST_FRAME_TYPES.has(String(frameType).toLowerCase())
}

function sbImageResourceType(frameType) {
  if (isLastFrameType(frameType)) return GEN_RESOURCE.SB_LAST_IMAGE
  if (isFirstFrameType(frameType)) return GEN_RESOURCE.SB_FIRST_IMAGE
  return GEN_RESOURCE.SB_IMAGE
}

function isActiveTaskStatus(status) {
  return status === 'pending' || status === 'processing' || status === 'running'
}

function isOrphanedProcessingTask(remote, staleMs = ORPHAN_PROCESSING_MS) {
  if (!remote || !isActiveTaskStatus(remote.status)) return false
  const updatedAt = remote.updated_at ? new Date(remote.updated_at).getTime() : 0
  if (!updatedAt) return false
  return Date.now() - updatedAt > staleMs
}

// Resolved at call time: these messages must follow the active locale instead
// of the language that was active when this module was first imported.
function orphanTaskMsg() {
  return i18nT('messages.theTaskMadeNoProgressForALongTimeAndMayHaveB')
}

function userCancelTaskMsg() {
  return i18nT('messages.cancelledByUser')
}

function taskFailMessage(t) {
  if (!t) return i18nT('messages.taskFailed')
  return (t.error || t.message || i18nT('messages.taskFailed')).trim()
}

export const useGenerationTaskStore = defineStore('generationTask', () => {
  /** @type {Map<string, object>} */
  const tasks = ref(new Map())
  /** @type {Map<string, Promise>} taskId → poll promise */
  const pollPromises = ref(new Map())
  /** 本会话已处理过的恢复 taskId，避免切集重复注册 */
  const recoveredTaskIds = ref(new Set())
  /** 用户或系统主动停止轮询的 taskId */
  const cancelledPollTaskIds = ref(new Set())

  const runningTasks = computed(() => {
    return [...tasks.value.values()].filter((t) => t.status === 'running')
  })

  function _setTask(key, task) {
    const next = new Map(tasks.value)
    next.set(key, task)
    tasks.value = next
  }

  function _deleteTask(key) {
    const next = new Map(tasks.value)
    next.delete(key)
    tasks.value = next
  }

  function _findKeysByTaskId(taskId) {
    if (!taskId) return []
    return [...tasks.value.entries()]
      .filter(([, t]) => t.taskId === taskId)
      .map(([k]) => k)
  }

  function _finishKeys(keys, status, error) {
    for (const key of keys) {
      const existing = tasks.value.get(key)
      if (!existing) continue
      _setTask(key, {
        ...existing,
        status,
        error: error || '',
        finishedAt: Date.now(),
      })
      const delay = status === 'failed' ? 8000 : 3000
      setTimeout(() => _deleteTask(key), delay)
    }
  }

  function markRunning(meta) {
    const key = taskKey(meta)
    if (!key || key.includes('undefined') || key.includes('null')) return key
    _setTask(key, {
      ...meta,
      key,
      status: 'running',
      startedAt: Date.now(),
    })
    return key
  }

  function markDone(meta) {
    const key = typeof meta === 'string' ? meta : taskKey(meta)
    const existing = tasks.value.get(key)
    const taskId = existing?.taskId || (typeof meta === 'object' ? meta?.taskId : null)
    const keys = taskId ? _findKeysByTaskId(taskId) : [key]
    if (keys.length === 0 && key) keys.push(key)
    _finishKeys(keys, 'completed')
  }

  function markFailed(meta, error) {
    const key = typeof meta === 'string' ? meta : taskKey(meta)
    const existing = tasks.value.get(key)
    const taskId = existing?.taskId || (typeof meta === 'object' ? meta?.taskId : null)
    const keys = taskId ? _findKeysByTaskId(taskId) : [key]
    if (keys.length === 0 && key) keys.push(key)
    _finishKeys(keys, 'failed', error)
  }

  function isRunning(meta) {
    const key = taskKey(meta)
    const t = tasks.value.get(key)
    return t?.status === 'running'
  }

  function getRunningForEpisode(dramaId, episodeId) {
    if (dramaId == null || episodeId == null) return []
    return runningTasks.value.filter(
      (t) => Number(t.dramaId) === Number(dramaId) && Number(t.episodeId) === Number(episodeId)
    )
  }

  function getAllRunningTasks() {
    return runningTasks.value
  }

  /** 停止指定 taskId 的轮询并清除 store 中的 running 状态 */
  function stopPollingTask(taskId, reason) {
    if (!taskId) return
    cancelledPollTaskIds.value = new Set([...cancelledPollTaskIds.value, taskId])
    markFailed({ taskId }, reason || i18nT('messages.taskStopped'))
  }

  /** 取消任务：通知后端并停止前端轮询 */
  async function cancelTask(meta, options = {}) {
    const reason = options.reason || userCancelTaskMsg()
    const taskId = typeof meta === 'string' ? meta : meta?.taskId
    if (taskId) {
      try {
        await taskAPI.cancel(taskId, { reason })
      } catch (e) {
        console.warn('[generationTaskStore] cancel API failed:', e?.message)
      }
      stopPollingTask(taskId, reason)
      return
    }
    const key = typeof meta === 'string' ? meta : taskKey(meta)
    markFailed(key, reason)
  }

  /** 清除所有 running 任务（页面级兜底） */
  function clearAllRunningTasks(reason) {
    for (const t of [...runningTasks.value]) {
      if (t.taskId) stopPollingTask(t.taskId, reason)
      else markFailed(t, reason || i18nT('messages.cleared'))
    }
  }

  /**
   * 校验 store 中 running 任务是否与后端一致；清理已完成/失败/超时的僵尸条目。
   */
  async function reconcileRunningTasks(ctx = {}) {
    const { characters = [], props = [], scenes = [], storyboards = [] } = ctx
    const running = [...runningTasks.value]
    const now = Date.now()

    for (const t of running) {
      if (t.startedAt && now - t.startedAt > STALE_TASK_MS) {
        markFailed(t, i18nT('messages.theTaskTimedOutAndWasClearedAutomaticallyRef'))
        continue
      }

      if (t.taskId) {
        try {
          const remote = await taskAPI.get(t.taskId)
          if (remote.status === 'completed') {
            markDone(t)
            continue
          }
          if (remote.status === 'failed') {
            markFailed(t, taskFailMessage(remote))
            continue
          }
          if (!isActiveTaskStatus(remote.status)) {
            markDone(t)
            continue
          }
          if (isOrphanedProcessingTask(remote)) {
            markFailed(t, orphanTaskMsg())
          }
        } catch (_) {
          // 网络异常跳过，下次 reconcile 再试
        }
        continue
      }

      if (t.resourceType === GEN_RESOURCE.CHAR_IMAGE && t.resourceId != null) {
        const c = characters.find((x) => Number(x.id) === Number(t.resourceId))
        if (c && (c.image_url || c.local_path)) markDone(t)
      } else if (t.resourceType === GEN_RESOURCE.PROP_IMAGE && t.resourceId != null) {
        const p = props.find((x) => Number(x.id) === Number(t.resourceId))
        if (p && (p.image_url || p.local_path)) markDone(t)
      } else if (t.resourceType === GEN_RESOURCE.SCENE_IMAGE && t.resourceId != null) {
        const s = scenes.find((x) => Number(x.id) === Number(t.resourceId))
        if (s && (s.image_url || s.local_path)) markDone(t)
      }
    }

    void storyboards
  }

  /**
   * 轮询异步任务；同一 taskId 只轮询一次，多路 await 共享结果。
   */
  function pollTask(taskId, meta, onDone, options = {}) {
    if (!taskId) return Promise.resolve({ status: 'failed', error: i18nT('messages.missingTaskId') })

    const key = markRunning({ ...meta, taskId })

    if (pollPromises.value.has(taskId)) {
      return pollPromises.value.get(taskId)
    }

    const maxAttempts = options.maxAttempts ?? 450
    const interval = options.interval ?? 2000
    const showErrorToast = options.showErrorToast !== false
    const showTimeoutToast = options.showTimeoutToast !== false
    const onTick = options.onTick
    const isPaused = options.isPaused
    const isAborted = options.isAborted
    const abortErrorMsg = options.abortErrorMsg || i18nT('taskCancelled')
    const rejectOnAbort = options.rejectOnAbort ?? false

    let attempts = 0
    let stopped = false
    const promise = new Promise((resolve, reject) => {
      const tick = async () => {
        if (stopped || cancelledPollTaskIds.value.has(taskId)) {
          markFailed(key, i18nT('messages.taskPollingStopped'))
          return resolve({ status: 'cancelled', error: i18nT('messages.taskPollingStopped') })
        }
        if (isAborted?.()) {
          markFailed(key, abortErrorMsg)
          const err = Object.assign(new Error(abortErrorMsg), { pipelineAborted: true })
          if (rejectOnAbort) return reject(err)
          return resolve({ status: 'cancelled', error: abortErrorMsg })
        }
        if (isPaused?.()) {
          return resolve({ paused: true })
        }
        attempts++
        try {
          if (onTick) {
            try { await onTick() } catch (_) {}
          }
          const t = await taskAPI.get(taskId)
          const currentTask = tasks.value.get(key)
          const remoteProgress = Number(t?.progress)
          if (currentTask && t?.progress != null && t.progress !== '' && Number.isFinite(remoteProgress)) {
            _setTask(key, {
              ...currentTask,
              progress: Math.max(0, Math.min(100, remoteProgress)),
              message: t.message || currentTask.message || '',
            })
          }
          if (isAborted?.()) {
            markFailed(key, abortErrorMsg)
            const err = Object.assign(new Error(abortErrorMsg), { pipelineAborted: true })
            if (rejectOnAbort) return reject(err)
            return resolve({ status: 'cancelled', error: abortErrorMsg })
          }
          if (isOrphanedProcessingTask(t)) {
            const errMsg = orphanTaskMsg()
            markFailed(key, errMsg)
            if (showErrorToast && options.ElMessage) {
              options.ElMessage.warning(errMsg)
            }
            return resolve({ status: 'failed', error: errMsg })
          }
          if (t.status === 'completed') {
            if (onDone) {
              try {
                await onDone()
              } catch (e) {
                console.warn('[generationTaskStore] onDone failed:', e?.message)
              }
            }
            markDone(key)
            return resolve({ status: 'completed', result: t.result })
          }
          if (t.status === 'failed') {
            const errMsg = taskFailMessage(t)
            markFailed(key, errMsg)
            if (showErrorToast && options.ElMessage) {
              options.ElMessage.error(errMsg)
            }
            return resolve({ status: 'failed', error: errMsg })
          }
        } catch (pollErr) {
          console.warn('[generationTaskStore] poll attempt failed:', pollErr?.message)
        }
        if (attempts < maxAttempts) {
          setTimeout(tick, interval)
        } else {
          const timeoutMsg = options.timeoutMessage
            || i18nT('messages.generationTimedOutAfter15MinutesRefreshThePa')
          markFailed(key, timeoutMsg)
          if (showTimeoutToast && options.ElMessage) {
            options.ElMessage.warning(timeoutMsg)
          }
          resolve({ status: 'timeout', error: timeoutMsg })
        }
      }
      setTimeout(tick, interval)
    })

    const nextPolls = new Map(pollPromises.value)
    nextPolls.set(taskId, promise)
    pollPromises.value = nextPolls

    return promise.finally(() => {
      stopped = true
      cancelledPollTaskIds.value = new Set([...cancelledPollTaskIds.value, taskId])
      const cleaned = new Map(pollPromises.value)
      cleaned.delete(taskId)
      pollPromises.value = cleaned
    })
  }

  /**
   * 若 task 仍在运行且尚未轮询，则 attach 轮询（用于页面刷新/切集恢复）。
   */
  async function attachPollIfNeeded(taskId, meta, onDone, options = {}) {
    if (!taskId) return null

    if (pollPromises.value.has(taskId)) {
      markRunning({ ...meta, taskId })
      return pollPromises.value.get(taskId)
    }

    try {
      const t = await taskAPI.get(taskId)
      if (isOrphanedProcessingTask(t)) {
        markFailed({ ...meta, taskId }, orphanTaskMsg())
        return { status: 'failed', error: orphanTaskMsg() }
      }
      if (t.status === 'completed') {
        if (onDone) await onDone()
        markDone({ ...meta, taskId })
        return { status: 'completed', result: t.result }
      }
      if (t.status === 'failed') {
        markFailed({ ...meta, taskId }, taskFailMessage(t))
        return { status: 'failed', error: taskFailMessage(t) }
      }
      if (!isActiveTaskStatus(t.status)) {
        markDone({ ...meta, taskId })
        return { status: 'completed', result: t.result }
      }
    } catch (_) {
      // 网络异常时仍尝试轮询
    }

    markRunning({ ...meta, taskId })
    return pollTask(taskId, meta, onDone, { ...options, showErrorToast: false, showTimeoutToast: false })
  }

  async function _recoverAttachTask(taskId, meta, onDone, pollOpts) {
    if (!taskId) return
    if (recoveredTaskIds.value.has(taskId)) {
      try {
        const t = await taskAPI.get(taskId)
        if (t.status === 'completed') markDone({ ...meta, taskId })
        else if (t.status === 'failed') markFailed({ ...meta, taskId }, taskFailMessage(t))
        else if (!isActiveTaskStatus(t.status)) markDone({ ...meta, taskId })
        else if (cancelledPollTaskIds.value.has(taskId)) markFailed({ ...meta, taskId }, i18nT('messages.taskPollingStopped'))
      } catch (_) {}
      return
    }
    recoveredTaskIds.value = new Set([...recoveredTaskIds.value, taskId])
    const res = await attachPollIfNeeded(taskId, meta, onDone, pollOpts)
    if (res?.status === 'failed' || res?.status === 'timeout') {
      markFailed({ ...meta, taskId }, res.error)
    }
  }

  /**
   * 从后端恢复当前集进行中的图片/视频/合成任务，并重新 attach 轮询。
   */
  async function recoverPendingForEpisode(ctx) {
    const {
      dramaId,
      episodeId,
      dramaTitle,
      episodeNumber,
      storyboards = [],
      characters = [],
      scenes = [],
      props = [],
      allCharacters = [],
      allProps = [],
      allScenes = [],
      callbacks = {},
      ElMessage,
    } = ctx

    if (dramaId == null || episodeId == null) return

    const reconcileAssets = {
      characters: allCharacters.length ? allCharacters : characters,
      props: allProps.length ? allProps : props,
      scenes: allScenes.length ? allScenes : scenes,
      storyboards,
    }

    await reconcileRunningTasks(reconcileAssets)

    const sbIdSet = new Set(storyboards.map((s) => Number(s.id)))
    const charIdSet = new Set(characters.map((c) => Number(c.id)))
    const sceneIdSet = new Set(scenes.map((s) => Number(s.id)))
    const propIdSet = new Set(props.map((p) => Number(p.id)))
    const epLabel = dramaTitle
      ? i18nT('generationStore.episodeWithTitle', { title: dramaTitle, num: episodeNumber ?? '' })
      : i18nT('generationStore.episodeOnly', { num: episodeNumber ?? episodeId })

    const pollOpts = { ElMessage, showErrorToast: false, showTimeoutToast: false }

    const attachImage = (img) => {
      if (!img || !['pending', 'processing'].includes(img.status)) return
      if (!img.task_id) return

      let resourceType = GEN_RESOURCE.SB_IMAGE
      let resourceId = null
      let label = ''

      if (img.storyboard_id != null && sbIdSet.has(Number(img.storyboard_id))) {
        resourceType = sbImageResourceType(img.frame_type)
        resourceId = Number(img.storyboard_id)
        const sb = storyboards.find((s) => Number(s.id) === resourceId)
        const num = sb?.storyboard_number ?? resourceId
        label = resourceType === GEN_RESOURCE.SB_LAST_IMAGE
          ? i18nT('generationStore.sbLastImage', { episode: epLabel, num })
          : resourceType === GEN_RESOURCE.SB_FIRST_IMAGE
            ? i18nT('generationStore.sbFirstImage', { episode: epLabel, num })
            : i18nT('generationStore.sbImage', { episode: epLabel, num })
      } else if (img.character_id != null && charIdSet.has(Number(img.character_id))) {
        resourceType = GEN_RESOURCE.CHAR_IMAGE
        resourceId = Number(img.character_id)
        const c = characters.find((x) => Number(x.id) === resourceId)
        label = i18nT('generationStore.charImage', { episode: epLabel, name: c?.name || resourceId })
      } else if (img.scene_id != null && sceneIdSet.has(Number(img.scene_id))) {
        resourceType = GEN_RESOURCE.SCENE_IMAGE
        resourceId = Number(img.scene_id)
        const s = scenes.find((x) => Number(x.id) === resourceId)
        label = i18nT('generationStore.sceneImage', { episode: epLabel, name: s?.location || resourceId })
      } else {
        return
      }

      const meta = {
        dramaId,
        episodeId,
        dramaTitle,
        episodeNumber,
        resourceType,
        resourceId,
        label,
      }
      const onDone = resourceType.startsWith('sb_')
        ? () => callbacks.onStoryboardMedia?.(resourceId)
        : () => callbacks.onDramaRefresh?.()
      _recoverAttachTask(img.task_id, meta, onDone, pollOpts)
    }

    const attachVideo = (vid) => {
      if (!vid?.storyboard_id || !sbIdSet.has(Number(vid.storyboard_id))) return
      if (!['pending', 'processing'].includes(vid.status)) return
      if (!vid.task_id) return
      const resourceId = Number(vid.storyboard_id)
      const sb = storyboards.find((s) => Number(s.id) === resourceId)
      const num = sb?.storyboard_number ?? resourceId
      const meta = {
        dramaId,
        episodeId,
        dramaTitle,
        episodeNumber,
        resourceType: GEN_RESOURCE.SB_VIDEO,
        resourceId,
        label: i18nT('generationStore.sbVideo', { episode: epLabel, num }),
      }
      _recoverAttachTask(vid.task_id, meta, () => callbacks.onStoryboardMedia?.(resourceId), pollOpts)
    }

    try {
      const [pendingImg, processingImg, processingVid, episodeTasks] = await Promise.all([
        imagesAPI.list({ drama_id: dramaId, status: 'pending', page_size: 100 }).catch(() => ({ items: [] })),
        imagesAPI.list({ drama_id: dramaId, status: 'processing', page_size: 100 }).catch(() => ({ items: [] })),
        videosAPI.list({ drama_id: dramaId, status: 'processing', page_size: 100 }).catch(() => ({ items: [] })),
        taskAPI.listByResource(String(episodeId)).catch(() => []),
      ])

      const seenImg = new Set()
      for (const img of [...(pendingImg.items || []), ...(processingImg.items || [])]) {
        const dedupe = `${img.id}:${img.status}`
        if (seenImg.has(dedupe)) continue
        seenImg.add(dedupe)
        attachImage(img)
      }

      for (const vid of processingVid.items || []) {
        attachVideo(vid)
      }

      for (const t of episodeTasks || []) {
        if (!isActiveTaskStatus(t.status)) continue
        if (t.type === 'video_merge') {
          const meta = {
            dramaId,
            episodeId,
            dramaTitle,
            episodeNumber,
            resourceType: GEN_RESOURCE.EPISODE_MERGE,
            resourceId: Number(episodeId),
            label: i18nT('generationStore.episodeMerge', { episode: epLabel }),
            taskId: t.id,
          }
          _recoverAttachTask(t.id, meta, () => callbacks.onDramaRefresh?.(), pollOpts)
          continue
        }
        const extractTypeMap = {
          prop_extraction: { resourceType: GEN_RESOURCE.EXTRACT_PROPS, label: i18nT('generationStore.extractProps', { episode: epLabel }) },
          background_extraction: { resourceType: GEN_RESOURCE.EXTRACT_SCENES, label: i18nT('generationStore.extractScenes', { episode: epLabel }) },
          storyboard_generation: { resourceType: GEN_RESOURCE.GENERATE_STORYBOARD, label: i18nT('generationStore.generateStoryboard', { episode: epLabel }) },
        }
        const extractCfg = extractTypeMap[t.type]
        if (extractCfg) {
          const meta = {
            dramaId,
            episodeId,
            dramaTitle,
            episodeNumber,
            resourceType: extractCfg.resourceType,
            resourceId: Number(episodeId),
            label: extractCfg.label,
            taskId: t.id,
          }
          _recoverAttachTask(t.id, meta, () => callbacks.onDramaRefresh?.(), pollOpts)
        }
      }

      // 角色提取 task 挂在 dramaId 上，同一 taskId 只恢复一次（避免多集重复显示）
      const dramaTasks = await taskAPI.listByResource(String(dramaId)).catch(() => [])
      for (const t of dramaTasks || []) {
        if (!isActiveTaskStatus(t.status)) continue
        if (t.type !== 'character_generation') continue
        if (recoveredTaskIds.value.has(t.id)) continue
        if (pollPromises.value.has(t.id)) continue
        const meta = {
          dramaId,
          episodeId,
          dramaTitle,
          episodeNumber,
          resourceType: GEN_RESOURCE.EXTRACT_CHARACTERS,
          resourceId: Number(episodeId),
          label: i18nT('generationStore.extractCharacters', { episode: epLabel }),
          taskId: t.id,
        }
        _recoverAttachTask(t.id, meta, () => callbacks.onDramaRefresh?.(), pollOpts)
        break
      }

      for (const t of dramaTasks || []) {
        if (!isActiveTaskStatus(t.status)) continue
        if (t.type !== 'story_generation') continue
        if (recoveredTaskIds.value.has(t.id)) continue
        if (pollPromises.value.has(t.id)) continue
        const meta = {
          dramaId,
          episodeId,
          dramaTitle,
          episodeNumber,
          resourceType: GEN_RESOURCE.GENERATE_STORY,
          resourceId: Number(dramaId),
          label: i18nT('common.generateScriptFor', { name: dramaTitle || i18nT('common.project') }),
          taskId: t.id,
        }
        _recoverAttachTask(t.id, meta, () => callbacks.onDramaRefresh?.(), pollOpts)
        break
      }

      const attachResourceTask = (resourceId, resourceType, label) => {
        return taskAPI.listByResource(String(resourceId)).then((tasks) => {
          for (const t of tasks || []) {
            if (!isActiveTaskStatus(t.status)) continue
            const meta = {
              dramaId,
              episodeId,
              dramaTitle,
              episodeNumber,
              resourceType,
              resourceId: Number(resourceId),
              label,
              taskId: t.id,
            }
            _recoverAttachTask(t.id, meta, () => callbacks.onDramaRefresh?.(), pollOpts)
          }
        }).catch(() => {})
      }

      await Promise.all([
        ...[...charIdSet].map((id) => {
          const c = characters.find((x) => Number(x.id) === Number(id))
          return attachResourceTask(id, GEN_RESOURCE.CHAR_IMAGE, i18nT('generationStore.charImage', { episode: epLabel, name: c?.name || id }))
        }),
        ...[...propIdSet].map((id) => {
          const p = props.find((x) => Number(x.id) === Number(id))
          return attachResourceTask(id, GEN_RESOURCE.PROP_IMAGE, i18nT('generationStore.propImage', { episode: epLabel, name: p?.name || id }))
        }),
        ...[...sceneIdSet].map((id) => {
          const s = scenes.find((x) => Number(x.id) === Number(id))
          return attachResourceTask(id, GEN_RESOURCE.SCENE_IMAGE, i18nT('generationStore.sceneImage', { episode: epLabel, name: s?.location || id }))
        }),
      ])

      await reconcileRunningTasks(reconcileAssets)
    } catch (e) {
      console.warn('[generationTaskStore] recoverPendingForEpisode failed:', e?.message)
    }
  }

  return {
    GEN_RESOURCE,
    tasks,
    runningTasks,
    markRunning,
    markDone,
    markFailed,
    isRunning,
    getRunningForEpisode,
    getAllRunningTasks,
    pollTask,
    attachPollIfNeeded,
    recoverPendingForEpisode,
    reconcileRunningTasks,
    stopPollingTask,
    cancelTask,
    clearAllRunningTasks,
    taskKey,
  }
})

export function pollGenerationTask(taskId, meta = {}, onDone = null, options = {}) {
  try {
    const store = useGenerationTaskStore()
    return store.pollTask(taskId, meta, onDone, options)
  } catch (_) {
    return new Promise(async (resolve, reject) => {
      const maxAttempts = options.maxAttempts ?? 450
      const interval = options.interval ?? 2000
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, interval))
        if (options.isAborted?.()) {
          const msg = options.abortErrorMsg || i18nT('taskCancelled')
          const err = Object.assign(new Error(msg), { pipelineAborted: true })
          if (options.rejectOnAbort) return reject(err)
          return resolve({ status: 'cancelled', error: msg })
        }
        if (options.isPaused?.()) {
          return resolve({ paused: true })
        }
        if (options.onTick) {
          try { await options.onTick() } catch (_) {}
        }
        try {
          const t = await taskAPI.get(taskId)
          if (t.status === 'completed') {
            if (onDone) await onDone()
            return resolve({ status: 'completed', result: t.result })
          }
          if (t.status === 'failed') {
            return resolve({ status: 'failed', error: t.error || i18nT('messages.taskFailed') })
          }
        } catch (e) {
          if (i === maxAttempts - 1) return resolve({ status: 'failed', error: e.message })
        }
      }
      resolve({ status: 'timeout', error: options.timeoutMessage || i18nT('dramaCanvas.taskTimedOut') })
    })
  }
}
