import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export function useActiveTasks({
  dramaId,
  genStore,
  pipelineRunning,
  pipelinePaused,
  pipelineAbortRequested,
  pipelineCurrentStep,
  storyGenerating,
  scriptGenerating,
  universalOmniPolishRunning,
  universalOmniPolishProgress,
  universalOmniPolishAbort,
  batchImageRunning,
  batchImageStopping,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
}) {
  const isStoryGenRunning = computed(() => {
    if (storyGenerating?.value || scriptGenerating?.value) return true
    return genStore.getAllRunningTasks().some(
      (tTask) => Number(tTask.dramaId) === Number(dramaId.value) && tTask.resourceType === GEN_RESOURCE.GENERATE_STORY
    )
  })

  const allActiveTaskItems = computed(() => {
    const items = []
    const seen = new Set()
    function addItem(item) {
      const id = item.id || item.label
      if (!id || seen.has(id)) return
      seen.add(id)
      items.push(item)
    }
    for (const tTask of genStore.getAllRunningTasks()) {
      addItem({
        id: `gen:${tTask.key || tTask.taskId || tTask.label}`,
        label: tTask.label || t('filmCreate.taskRunning'),
        kind: 'genStore',
        task: tTask,
      })
    }
    if (pipelineRunning?.value) {
      const step = pipelineCurrentStep?.value
      addItem({
        id: 'pipeline',
        label: step ? step.replace(/^\[步骤 \d+\/\d+\] /, '') : t('filmCreate.pipelineRunningEllipsis'), // i18n-scan-ignore: regex
        kind: 'pipeline',
      })
    }
    if (isStoryGenRunning.value && !genStore.getAllRunningTasks().some((tTask) => tTask.resourceType === GEN_RESOURCE.GENERATE_STORY)) {
      addItem({ id: 'story-gen-local', label: t('filmCreate.storyGenEllipsis'), kind: 'storyGenLocal' })
    }
    if (universalOmniPolishRunning?.value) {
      const p = universalOmniPolishProgress?.value
      addItem({
        id: 'universal-omni-polish',
        label: t('filmCreate.polishOmniProgress', { current: p?.current, total: p?.total, label: p?.label ? ' ' + p.label : '' }),
        kind: 'universalOmniPolish',
      })
    }
    if (batchImageRunning?.value) {
      addItem({ id: 'batch-image', label: t('filmCreate.batchImageEllipsis'), kind: 'batchImage' })
    }
    if (batchVideoRunning?.value) {
      const p = batchVideoProgress?.value
      const suffix = p?.total ? ` ${p.current}/${p.total}` : ''
      addItem({ id: 'batch-video', label: t('filmCreate.batchVideoEllipsis', { suffix }), kind: 'batchVideo' })
    }
    return items
  })

  const allActiveTaskLabels = computed(() => allActiveTaskItems.value.map((tTask) => tTask.label))

  async function cancelActiveTask(item) {
    if (!item) return
    try {
      if (item.kind === 'genStore' && item.task) {
        await genStore.cancelTask(item.task)
        ElMessage.success(t('filmCreate.taskCancelled'))
        return
      }
      if (item.kind === 'pipeline') {
        if (pipelineAbortRequested) pipelineAbortRequested.value = true
        if (pipelineRunning) pipelineRunning.value = false
        if (pipelinePaused) pipelinePaused.value = false
        for (const tTask of genStore.getAllRunningTasks()) {
          if (tTask.taskId) await genStore.cancelTask(tTask)
        }
        ElMessage.success(t('filmCreate.pipelineStopped'))
        return
      }
      if (item.kind === 'storyGenLocal') {
        if (storyGenerating) storyGenerating.value = false
        if (scriptGenerating) scriptGenerating.value = false
        const storyTask = genStore.getAllRunningTasks().find((tTask) => tTask.resourceType === GEN_RESOURCE.GENERATE_STORY)
        if (storyTask) await genStore.cancelTask(storyTask)
        ElMessage.success(t('filmCreate.storyGenCancelled'))
        return
      }
      if (item.kind === 'universalOmniPolish') {
        if (universalOmniPolishAbort) universalOmniPolishAbort.value = true
        ElMessage.success(t('filmCreate.stoppingPolish'))
        return
      }
      if (item.kind === 'batchImage') {
        if (batchImageStopping) batchImageStopping.value = true
        ElMessage.info(t('filmCreate.stoppingBatchImage'))
        return
      }
      if (item.kind === 'batchVideo') {
        if (batchVideoStopping) batchVideoStopping.value = true
        ElMessage.info(t('filmCreate.stoppingBatchVideo'))
        return
      }
    } catch (e) {
      ElMessage.error(e?.message || t('filmCreate.cancelFailed'))
    }
  }

  return {
    isStoryGenRunning,
    allActiveTaskItems,
    allActiveTaskLabels,
    cancelActiveTask,
  }
}
