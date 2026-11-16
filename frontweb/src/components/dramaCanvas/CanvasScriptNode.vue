<template>
  <div class="canvas-node-stack">
    <div
      class="canvas-script-node"
      :class="{
        focused: showPanel,
        empty: !hasScript,
        processing: isNodeBusy,
      }"
    >
      <Handle type="source" :position="Position.Right" />
      <CanvasNodeStatusOverlay :node-id="id" />
      <div class="head">
        <span class="badge">📜 {{ $t('filmCreate.stepScript') }}</span>
        <span class="ep">{{ t('dramaCanvas.episodeNum', { num: data.episode?.episode_number ?? '?' }) }}</span>
      </div>
      <div class="preview">{{ previewText }}</div>
      <div class="meta">
        <span>{{ charCount }} {{ t('dramaDetail.characters') }}</span>
        <span>{{ sceneCount }} {{ t('dramaDetail.scenes') }}</span>
        <span>{{ propCount }} {{ t('dramaDetail.props') }}</span>
      </div>
      <div class="hint">{{ showPanel ? t('dramaCanvas.editExtractBelow') : t('dramaCanvas.clickExpandStart') }}</div>
    </div>
    <CanvasScriptPanel
      v-if="showPanel"
      :episode="data.episode"
      :node-id="id"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useCanvasContext } from '@/composables/useCanvasContext'
import { useI18n } from '@/i18n'
import CanvasScriptPanel from './CanvasScriptPanel.vue'
import CanvasNodeStatusOverlay from './CanvasNodeStatusOverlay.vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const ctx = useCanvasContext()
const { t, locale } = useI18n()
const showPanel = computed(() => ctx?.focusedNodeId?.value === props.id)

const hasScript = computed(() => !!(props.data.episode?.script_content || '').trim())
const previewText = computed(() => {
  if (props.data.summary) return props.data.summary
  const isEn = locale.value === 'en'
  return hasScript.value ? (isEn ? '(Script written)' : t('dramaCanvas.scriptWritten')) : (isEn ? 'No script yet, click to edit' : t('dramaCanvas.noScriptYetClickToEdit'))
})

const charCount = computed(() => (ctx?.drama?.value?.characters || []).length)
const sceneCount = computed(() => (ctx?.drama?.value?.scenes || []).length)
const propCount = computed(() => (ctx?.drama?.value?.props || []).length)

const isNodeBusy = computed(() => {
  const map = ctx?.nodeStatus?.map
  return map ? !!map[props.id] : false
})
</script>

<style scoped>
.canvas-node-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.canvas-script-node {
  position: relative;
  width: 220px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--el-color-warning);
  background: var(--bg-hover);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.canvas-script-node.focused {
  border-color: var(--el-color-warning);
  box-shadow: 0 0 0 1px var(--el-color-warning);
}
.canvas-script-node.empty {
  border-style: dashed;
  opacity: 0.92;
}
.canvas-script-node.processing {
  border-color: var(--border-muted);
  animation: script-pulse 1.4s ease-in-out infinite;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-warning);
}
.ep {
  font-size: 11px;
  color: var(--text-primary);
}
.preview {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-primary);
  max-height: 56px;
  overflow: hidden;
  margin-bottom: 8px;
}
.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.meta span {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
.hint {
  font-size: 10px;
  color: var(--text-subtle);
}
@keyframes script-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--border-muted); }
  50% { box-shadow: 0 0 0 5px var(--border-muted); }
}
</style>
