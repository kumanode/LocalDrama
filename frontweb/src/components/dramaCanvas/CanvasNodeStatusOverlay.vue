<template>
  <div v-if="status" class="node-status-overlay" :class="'step-' + status.step">
    <span class="spinner" />
    <span class="msg">{{ status.message }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCanvasContext } from '@/composables/useCanvasContext'

const props = defineProps({
  nodeId: { type: String, required: true },
})

const ctx = useCanvasContext()

const status = computed(() => {
  const map = ctx?.nodeStatus?.map
  if (!map || !props.nodeId) return null
  return map[props.nodeId] || null
})
</script>

<style scoped>
.node-status-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--bg-hover);
  border-radius: inherit;
  pointer-events: none;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-muted);
  border-top-color: var(--text-bright);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
.step-ref_image .spinner { border-top-color: var(--border-muted); }
.step-extract_chars .spinner,
.step-extract_scenes .spinner,
.step-extract_props .spinner,
.step-extract_all .spinner,
.step-save_script .spinner { border-top-color: var(--el-color-warning); }
.step-video .spinner { border-top-color: var(--border-muted); }
.step-audio .spinner { border-top-color: var(--el-color-warning); }
.msg {
  font-size: 10px;
  color: var(--text-primary);
  text-align: center;
  padding: 0 8px;
  line-height: 1.3;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
