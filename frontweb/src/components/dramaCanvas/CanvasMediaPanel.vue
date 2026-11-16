<template>
  <div
    class="canvas-node-panel media-panel nodrag nopan nowheel"
    :class="'kind-' + kind"
    @pointerdown.stop
    @mousedown.stop
    @click.stop
    @mouseup.stop
    @wheel.stop
  >
    <div class="panel-head">
      <span>{{ kindTitle }}</span>
      <div class="head-right">
        <span v-if="busyLabel" class="busy-tag">{{ busyLabel }}</span>
        <el-button link size="small" @click.stop="closePanel">{{ t('dramaCanvas.collapse') }}</el-button>
      </div>
    </div>

    <div class="panel-body">
      <template v-if="kind === 'text'">
        <p class="summary">{{ summary || t('dramaCanvas.noScriptContent') }}</p>
        <el-button size="small" type="primary" plain @click.stop="focusStoryboard">{{ t('dramaCanvas.editScript') }}</el-button>
      </template>

      <template v-else-if="kind === 'universal'">
        <p class="summary">{{ summary || t('dramaCanvas.noUniversalPrompt') }}</p>
        <div class="panel-actions">
          <el-button size="small" plain @click.stop="focusStoryboard">{{ t('dramaCanvas.edit') }}</el-button>
          <el-button size="small" type="primary" :loading="busy" @click.stop="runStep('video')">{{ t('dramaCanvas.regenVideo') }}</el-button>
        </div>
      </template>

      <template v-else-if="kind === 'image'">
        <div class="preview-wrap">
          <img v-if="url && !busy" :src="url" alt="" class="preview-img" />
          <div v-else-if="!busy" class="preview-empty">{{ t('dramaCanvas.noImage') }}</div>
          <div v-if="busy" class="preview-loading"><span class="spinner" />{{ t('dramaCanvas.generatingImage') }}</div>
        </div>
        <el-button size="small" type="primary" :loading="busy" @click.stop="runStep('image')">{{ t('dramaCanvas.regenImage') }}</el-button>
      </template>

      <template v-else-if="kind === 'video'">
        <div class="preview-wrap">
          <video v-if="url && !busy" :src="url" class="preview-vid" controls playsinline />
          <div v-else-if="!busy" class="preview-empty">{{ t('dramaCanvas.noVideo') }}</div>
          <div v-if="busy" class="preview-loading"><span class="spinner" />{{ t('dramaCanvas.generatingVideo') }}</div>
        </div>
        <el-button size="small" type="primary" :loading="busy" @click.stop="runStep('video')">{{ t('dramaCanvas.regenVideo') }}</el-button>
      </template>

      <template v-else-if="kind === 'audio'">
        <div class="audio-label">{{ audioType === 'narration' ? t('dramaCanvas.narrationAudio') : t('dramaCanvas.dialogueAudio') }}</div>
        <audio v-if="url" :src="url" controls class="preview-aud" />
        <el-button size="small" type="warning" :loading="busy" @click.stop="runStep('audio')">{{ t('dramaCanvas.regenAudio') }}</el-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import { useCanvasContext } from '@/composables/useCanvasContext'
import { CANVAS_NODE_STATUS_LABELS } from '@/composables/useCanvasNodeStatus'
import { runImageStep, runVideoStep, runAudioStep } from '@/composables/useCanvasWorkflowRunner'
import { findStoryboardInDrama, getDramaGenerationOptions } from '@/utils/canvasWorkflow'

const props = defineProps({
  nodeId: { type: String, default: '' },
  kind: { type: String, required: true },
  storyboard: { type: Object, default: null },
  summary: { type: String, default: '' },
  url: { type: String, default: '' },
  audioType: { type: String, default: 'dialogue' },
})

const { t } = useI18n()
const ctx = useCanvasContext()
const busy = ref(false)

const sbNodeId = computed(() => (props.storyboard?.id ? `sb:${props.storyboard.id}` : ''))

const kindTitle = computed(() => {
  const map = {
    text: t('dramaCanvas.scriptSummary'),
    universal: t('dramaCanvas.universalShotPrompt'),
    image: t('dramaCanvas.storyboardImage'),
    video: t('dramaCanvas.video'),
    audio: t('dramaCanvas.audio'),
  }
  return map[props.kind] || t('dramaCanvas.media')
})

const busyLabel = computed(() => {
  const map = ctx?.nodeStatus?.map
  const id = props.nodeId || sbNodeId.value
  return id && map ? map[id]?.message : ''
})

function focusStoryboard() {
  if (sbNodeId.value) ctx?.setFocusedNode?.(sbNodeId.value)
}

function closePanel() {
  ctx?.clearFocusedNode?.()
}

async function runStep(step) {
  const drama = ctx?.drama?.value
  const sbId = props.storyboard?.id
  if (!drama || !sbId) return
  busy.value = true
  const statusMsg = CANVAS_NODE_STATUS_LABELS[step] || (step === 'image' ? t('dramaCanvas.stepImage') : step === 'video' ? t('dramaCanvas.stepVideo') : t('dramaCanvas.stepAudio'))
  ctx?.nodeStatus?.set(props.nodeId, { step, message: statusMsg })
  ctx?.nodeStatus?.set(sbNodeId.value, { step, message: statusMsg })
  try {
    const found = findStoryboardInDrama(drama, sbId)
    const sb = found?.storyboard || props.storyboard
    const genOpts = ctx?.getGenerationOptions?.() || getDramaGenerationOptions(drama)
    if (step === 'image') await runImageStep(drama, sb, genOpts)
    else if (step === 'video') await runVideoStep(drama, sb, genOpts)
    else if (step === 'audio') {
      const res = await runAudioStep(sb)
      if (res?.skipped) {
        ElMessage.info(res.reason || 'skipped')
        return
      }
    }
    ElMessage.success(t('dramaCanvas.genCompleted'))
    await ctx?.refresh?.()
  } catch (e) {
    ElMessage.error(e?.message || t('filmCreate.msgGenFailed'))
  } finally {
    busy.value = false
    ctx?.nodeStatus?.clear(props.nodeId)
    ctx?.nodeStatus?.clear(sbNodeId.value)
  }
}
</script>

<style scoped>
.media-panel {
  margin-top: 10px;
  width: min(360px, 90vw);
  padding: 10px 12px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-muted);
  background: var(--bg-hover);
  box-shadow: none; border: 1px solid var(--border-muted);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.head-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.busy-tag {
  font-size: 10px;
  color: var(--text-primary);
}
.panel-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}
.summary {
  flex: 1;
  min-width: 180px;
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-primary);
  max-height: 72px;
  overflow-y: auto;
}
.preview-wrap {
  position: relative;
  width: 120px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
}
.preview-img,
.preview-vid {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-subtle);
}
.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--bg-hover);
  font-size: 10px;
  color: var(--text-primary);
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-top-color: var(--text-bright);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
.preview-aud {
  flex: 1;
  min-width: 160px;
}
.audio-label {
  font-size: 11px;
  color: var(--el-color-warning);
  width: 100%;
}
.panel-actions {
  display: flex;
  gap: 8px;
}
.kind-video { border-color: var(--border-muted); }
.kind-universal { border-color: var(--border-muted); }
.kind-audio { border-color: var(--el-color-warning); }
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
