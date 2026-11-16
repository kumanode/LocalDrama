<template>
  <div class="canvas-node-stack">
    <div class="canvas-sb-node" :class="{ selected: selected, highlighted: data.highlighted, dimmed: data.dimmed, processing: isProcessing || isNodeBusy, focused: showPanel }">
    <Handle id="chain-in" type="target" :position="Position.Top" />
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Right" />
    <Handle id="chain-out" type="source" :position="Position.Bottom" />
      <CanvasNodeStatusOverlay :node-id="id" />
      <div class="head">
        <span class="num">#{{ data.storyboard?.storyboard_number ?? data.index }}</span>
        <span v-if="data.workflowGroup?.title" class="wf-badge">{{ data.workflowGroup.title }}</span>
        <span v-if="data.storyboard?.segment_title" class="seg">{{ data.storyboard.segment_title }}</span>
      <span v-if="data.storyboard?.creation_mode === 'universal'" class="mode-badge">{{ t('dramaCanvas.omniBadge') }}</span>
      </div>
      <div class="title">{{ data.storyboard?.title || t('dramaCanvas.shot') }}</div>
      <div class="chips">
        <span v-if="data.storyboard?.shot_type">{{ data.storyboard.shot_type }}</span>
        <span v-if="data.storyboard?.duration">{{ data.storyboard.duration }}s</span>
        <span :class="'st-' + (data.storyboard?.status || 'pending')">{{ statusLabel }}</span>
      </div>
      <div class="hint">{{ showPanel ? t('dramaCanvas.editGenBelow') : t('dramaCanvas.expandClickHint') }}</div>
    </div>
    <CanvasStoryboardPanel
      v-if="showPanel"
      :storyboard="data.storyboard"
      :episode-id="data.episodeId"
      :node-id="id"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useCanvasContext } from '@/composables/useCanvasContext'
import { useI18n } from '@/i18n'
import CanvasStoryboardPanel from './CanvasStoryboardPanel.vue'
import CanvasNodeStatusOverlay from './CanvasNodeStatusOverlay.vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const ctx = useCanvasContext()
const { locale, t } = useI18n()
const showPanel = computed(() => ctx?.focusedNodeId?.value === props.id)

const statusLabel = computed(() => {
  const isEn = locale.value === 'en'
  const s = props.data.storyboard?.status || 'pending'
  const map = {
    pending: isEn ? 'Pending' : t('dramaCanvas.pending2'),
    processing: isEn ? 'Generating' : t('dramaCanvas.generating'),
    completed: isEn ? 'Completed' : t('dramaCanvas.statusCompleted'),
    failed: isEn ? 'Failed' : t('dramaCanvas.statusFailed'),
  }
  return map[s] || s
})

const isProcessing = computed(() => props.data.storyboard?.status === 'processing')

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
.canvas-sb-node {
  position: relative;
  width: 200px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-muted);
  background: var(--bg-card, #18181b);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.canvas-sb-node:hover,
.canvas-sb-node.selected,
.canvas-sb-node.focused {
  border-color: var(--border-muted);
  box-shadow: none;
}
.head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.num {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
.wf-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  color: var(--el-color-warning);
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seg {
  font-size: 10px;
  color: var(--text-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mode-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--border-muted);
  color: var(--text-primary);
}
.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright, #fafafa);
  margin-bottom: 6px;
  line-height: 1.35;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.chips span {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
.st-completed { color: var(--text-primary) !important; background: var(--bg-hover) !important; }
.st-processing { color: var(--text-primary) !important; }
.st-failed { color: var(--danger-text) !important; }
.processing {
  animation: sb-pulse 1.4s ease-in-out infinite;
  border-color: var(--border-muted);
}
.highlighted {
  border-color: var(--text-bright); box-shadow: none;
}
.dimmed {
  opacity: 0.28;
}
@keyframes sb-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--border-muted); }
  50% { box-shadow: 0 0 0 6px var(--border-muted); }
}
.hint {
  font-size: 10px;
  color: var(--text-subtle);
}
</style>
