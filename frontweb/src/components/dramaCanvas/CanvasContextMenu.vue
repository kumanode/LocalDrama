<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="canvas-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <div class="ctx-title">{{ t('dramaCanvas.addHere') }}</div>
      <button type="button" class="ctx-item" @click="pick('storyboard')">{{ t('dramaCanvas.storyboard') }}</button>
      <button type="button" class="ctx-item" @click="pick('character')">{{ t('dramaCanvas.character') }}</button>
      <button type="button" class="ctx-item" @click="pick('scene')">{{ t('dramaCanvas.scene') }}</button>
      <button type="button" class="ctx-item" @click="pick('prop')">{{ t('dramaCanvas.prop') }}</button>
      <div class="ctx-divider" />
      <button type="button" class="ctx-item" @click="pick('episode')">{{ t('dramaCanvas.newEpisodeShort') }}</button>
    </div>
    <div v-if="visible" class="canvas-context-backdrop" @mousedown="close" @contextmenu.prevent="close" />
  </Teleport>
</template>

<script setup>
import { useI18n } from '@/i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
})

const { t } = useI18n()

const emit = defineEmits(['select', 'close'])

function pick(type) {
  emit('select', type)
  emit('close')
}

function close() {
  emit('close')
}
</script>

<style scoped>
.canvas-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2999;
}
.canvas-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 140px;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid var(--border-muted);
  background: var(--bg-inner);
  box-shadow: none; border: 1px solid var(--border-muted);
}
.ctx-title {
  padding: 4px 12px 6px;
  font-size: 10px;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ctx-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.ctx-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.ctx-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--bg-hover);
}
</style>
