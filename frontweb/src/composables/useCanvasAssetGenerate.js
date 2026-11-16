import { t as i18nT } from '../i18n/index.js'
import { characterAPI } from '@/api/characters'
import { sceneAPI } from '@/api/scenes'
import { propAPI } from '@/api/props'
import { assetImageUrl } from '@/utils/mediaUrl'
import { pollGenerationTask, GEN_RESOURCE } from '@/stores/generationTaskStore'
import { CANVAS_NODE_STATUS_LABELS } from '@/composables/useCanvasNodeStatus'

async function pollUntilHasImage(findEntity, maxAttempts = 120, interval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const entity = findEntity()
    if (entity && assetImageUrl(entity)) return true
    await new Promise((r) => setTimeout(r, interval))
  }
  return false
}

/**
 * 素材参考图生成（含轮询），并同步节点 busy 状态到卡片预览
 */
export async function generateAssetReferenceImage(ctx, { kind, entity, nodeId }) {
  const nodeStatus = ctx?.nodeStatus
  const drama = ctx?.drama?.value
  nodeStatus?.set(nodeId, { step: 'ref_image', message: CANVAS_NODE_STATUS_LABELS.ref_image })

  try {
    let res
    if (kind === 'character') {
      res = await characterAPI.generateImage(entity.id)
    } else if (kind === 'scene') {
      res = await sceneAPI.generateImage({ scene_id: entity.id, drama_id: drama?.id })
    } else {
      res = await propAPI.generateImage(entity.id)
    }

    const taskId = res?.image_generation?.task_id ?? res?.task_id
    if (taskId) {
      const resourceType = kind === 'character'
        ? GEN_RESOURCE.CHAR_IMAGE
        : kind === 'scene'
          ? GEN_RESOURCE.SCENE_IMAGE
          : GEN_RESOURCE.PROP_IMAGE
      const polled = await pollGenerationTask(
        taskId,
        {
          dramaId: drama?.id,
          resourceType,
          resourceId: entity.id,
        },
        null,
        { onTick: () => ctx?.refreshDrama?.(true) }
      )
      if (polled.status !== 'completed') throw new Error(polled.error || i18nT('dramaCanvas.generationFailed'))
    } else {
      await ctx?.refreshDrama?.(true)
      const ok = await pollUntilHasImage(() => {
        const list = kind === 'character'
          ? ctx?.drama?.value?.characters
          : kind === 'scene'
            ? ctx?.drama?.value?.scenes
            : ctx?.drama?.value?.props
        return (list || []).find((x) => Number(x.id) === Number(entity.id))
      })
      if (!ok) throw new Error(i18nT('dramaCanvas.generationTimedOutRefreshLaterToCheck'))
    }
    await ctx?.refresh?.(true)
    return { ok: true }
  } finally {
    nodeStatus?.clear(nodeId)
  }
}
