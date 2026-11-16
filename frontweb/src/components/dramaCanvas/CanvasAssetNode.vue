<template>
  <div class="canvas-node-stack">
    <div
      class="canvas-asset-node"
      :class="[
        'kind-' + data.kind,
        {
          highlighted: data.highlighted,
          dimmed: data.dimmed,
          focused: showPanel,
          processing: isNodeBusy || entityStatus === 'processing',
        },
      ]"
    >
      <Handle type="source" :position="Position.Right" />
      <div class="cover">
        <img v-if="thumbUrl && !isNodeBusy" :src="thumbUrl" alt="" />
        <div v-else-if="!isNodeBusy" class="cover-placeholder">{{ kindIcon }}</div>
        <CanvasNodeStatusOverlay :node-id="id" />
      </div>
      <div class="info">
        <div class="name-row">
          <span class="name">{{ displayName }}</span>
          <span v-if="statusChip" class="status-chip" :class="'st-' + statusChip.key">{{ statusChip.label }}</span>
        </div>
        <div class="kind">{{ kindLabel }}</div>
      </div>
    </div>
    <CanvasAssetPanel
      v-if="showPanel"
      :kind="data.kind"
      :entity="data.entity"
      :node-id="id"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { assetImageUrl } from '@/utils/mediaUrl'
import { useCanvasContext } from '@/composables/useCanvasContext'
import { useI18n } from '@/i18n'
import CanvasAssetPanel from './CanvasAssetPanel.vue'
import CanvasNodeStatusOverlay from './CanvasNodeStatusOverlay.vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const ctx = useCanvasContext()
const { locale, t } = useI18n()
const showPanel = computed(() => ctx?.focusedNodeId?.value === props.id)

const kindLabel = computed(() => {
  const map = { character: t('dramaDetail.characters'), scene: t('dramaDetail.scenes'), prop: t('dramaDetail.props') }
  return map[props.data.kind] || t('dramaCanvas.asset')
})

const kindIcon = computed(() => {
  const map = { character: '👤', scene: '🏞', prop: '🎭' }
  return map[props.data.kind] || '📦'
})

const displayName = computed(() => {
  const e = props.data.entity || {}
  return e.name || e.location || t('library.unnamed')
})

const thumbUrl = computed(() => assetImageUrl(props.data.entity))
const entityStatus = computed(() => props.data.entity?.status || '')

const isNodeBusy = computed(() => {
  const map = ctx?.nodeStatus?.map
  return map ? !!map[props.id] : false
})

const statusChip = computed(() => {
  const map = ctx?.nodeStatus?.map
  const busy = map?.[props.id]
  if (busy) return { key: 'busy', label: busy.message?.slice(0, 8) || t('dramaCanvas.processing') }
  const s = entityStatus.value
  if (s === 'processing') return { key: 'processing', label: t('freeCreate.generatingStatus') }
  if (s === 'failed') return { key: 'failed', label: t('common.failed') }
  if (thumbUrl.value) return { key: 'ready', label: t('dramaCanvas.hasImage') }
  return null
})
</script>

<style scoped>
.canvas-node-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.canvas-asset-node {
  position: relative;
  width: 176px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-muted, #3f3f46);
  background: var(--bg-card, #18181b);
  box-shadow: none;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.canvas-asset-node.focused {
  border-color: var(--border-muted);
  box-shadow: 0 0 0 1px var(--border-muted);
}
.canvas-asset-node.processing {
  border-color: var(--border-muted);
  animation: asset-pulse 1.4s ease-in-out infinite;
}
.cover {
  position: relative;
  height: 108px;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  font-size: 28px;
  opacity: 0.7;
}
.info {
  padding: 8px 10px 10px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright, #fafafa);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-chip {
  flex-shrink: 0;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
.status-chip.st-busy,
.status-chip.st-processing { color: var(--text-primary); background: var(--bg-hover); }
.status-chip.st-ready { color: var(--text-primary); background: var(--bg-hover); }
.status-chip.st-failed { color: var(--danger-text); background: var(--danger-soft); }
.kind {
  font-size: 11px;
  color: var(--text-subtle, #71717a);
  margin-top: 2px;
}
.kind-character { border-color: var(--border-muted); }
.kind-scene { border-color: var(--border-muted); }
.kind-prop { border-color: var(--el-color-warning); }
.highlighted {
  box-shadow: 0 0 0 2px var(--border-muted);
}
.dimmed {
  opacity: 0.28;
  filter: grayscale(0.35);
}
@keyframes asset-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--border-muted); }
  50% { box-shadow: 0 0 0 5px var(--border-muted); }
}
</style>
