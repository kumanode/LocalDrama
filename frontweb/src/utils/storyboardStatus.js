export function getStoryboardStatus({ error = '', hasVideo = false, isRunning = false }) {
  if (error) return { status: 'failed', error }
  if (isRunning) return { status: 'running', error: '' }
  if (hasVideo) return { status: 'done', error: '' }
  return { status: 'queued', error: '' }
}

const STORYBOARD_GENERATION_TYPES = new Set([
  'sb_image',
  'sb_first_image',
  'sb_last_image',
  'sb_video',
])

export function getStoryboardTaskProgress(tasks, storyboardId) {
  const task = [...(tasks?.values?.() || tasks || [])].find((item) =>
    Number(item.resourceId ?? item.resource_id) === Number(storyboardId)
    && STORYBOARD_GENERATION_TYPES.has(item.resourceType ?? item.resource_type)
    && ['running', 'processing'].includes(item.status)
  )
  if (!task || task.progress == null || task.progress === '') return null
  const progress = Number(task.progress)
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : null
}
