<template>
  <div class="canvas-node-stack">
    <div class="canvas-media-node" :class="['kind-' + data.kind, { highlighted: data.highlighted, dimmed: data.dimmed, focused: showPanel, processing: isNodeBusy }]">
      <Handle type="target" :position="Position.Left" />
      <Handle v-if="data.kind !== 'video' && data.kind !== 'audio'" type="source" :position="Position.Right" />
      <CanvasNodeStatusOverlay :node-id="id" />
      <div class="tag">{{ kindLabel }}</div>
      <template v-if="data.kind === 'text'">
        <p class="text-body">{{ data.summary || t('dramaCanvas.noScriptYet') }}</p>
      </template>
      <template v-else-if="data.kind === 'universal'">
        <p class="text-body universal-body">{{ data.summary || t('dramaCanvas.noUniversalPrompt') }}</p>
      </template>
      <template v-else-if="data.kind === 'image'">
        <img v-if="data.url" :src="data.url" alt="" class="media-img" />
        <div v-else class="empty">{{ t('dramaCanvas.noImage') }}</div>
      </template>
      <template v-else-if="data.kind === 'video'">
        <video v-if="data.url" :src="data.url" class="media-vid" muted playsinline />
        <div v-else class="empty">{{ t('dramaCanvas.noVideo') }}</div>
      </template>
      <template v-else-if="data.kind === 'audio'">
        <div class="audio-wrap">
          <span>🎵</span>
          <span>{{ data.audioType === 'narration' ? t('dramaCanvas.narration') : t('dramaCanvas.dialogue') }}</span>
        </div>
      </template>
    </div>
    <CanvasMediaPanel
      v-if="showPanel"
      :node-id="id"
      :kind="data.kind"
      :storyboard="data.storyboard"
      :summary="data.summary"
      :url="data.url"
      :audio-type="data.audioType"
    />
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useCanvasContext } from '@/composables/useCanvasContext'
import CanvasMediaPanel from './CanvasMediaPanel.vue'
import CanvasNodeStatusOverlay from './CanvasNodeStatusOverlay.vue'

const { t } = useI18n()

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const ctx = useCanvasContext()
const showPanel = computed(() => ctx?.focusedNodeId?.value === props.id)

const isNodeBusy = computed(() => {
  const map = ctx?.nodeStatus?.map
  return map ? !!map[props.id] : false
})

const kindLabel = computed(() => {
  if (props.data.frameLabel) return props.data.frameLabel
  const map = { text: t('dramaCanvas.scriptSummary'), universal: t('dramaCanvas.universalShotPrompt'), image: t('dramaCanvas.storyboardImage'), video: t('mediaLibrary.typeVideo'), audio: t('dramaCanvas.audio') }
  return map[props.data.kind] || props.data.kind
})
</script>

<style scoped>
.canvas-node-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.canvas-media-node {
  position: relative;
  width: 168px;
  min-height: 100px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--border-muted, #3f3f46);
  background: rgba(24, 24, 27, 0.95);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.canvas-media-node.focused {
  border-color: var(--border-muted);
  box-shadow: none;
}
.tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-bright);
  margin-bottom: 6px;
}
.text-body {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: #d4d4d8;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.media-img {
  width: 100%;
  height: 92px;
  object-fit: cover;
  border-radius: 6px;
  background: #09090b;
}
.media-vid {
  width: 100%;
  height: 92px;
  object-fit: cover;
  border-radius: 6px;
  background: #000;
}
.audio-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px 8px;
  font-size: 12px;
  color: #fbbf24;
}
.empty {
  font-size: 11px;
  color: #71717a;
  padding: 20px 0;
  text-align: center;
}
.universal-body {
  -webkit-line-clamp: 8;
}
.kind-universal { border-color: var(--border-muted); }
.kind-universal .tag { color: var(--text-primary); }
.kind-image { border-color: rgba(129, 140, 248, 0.4); }
.kind-video { border-color: rgba(244, 114, 182, 0.4); }
.kind-audio { border-color: rgba(251, 191, 36, 0.4); }
.canvas-media-node.processing { border-color: #60a5fa; }
.highlighted { border-color: var(--text-bright); }
.dimmed { opacity: 0.28; }
</style>
