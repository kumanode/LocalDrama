<template>
  <div
    class="canvas-add-node"
    :class="'kind-' + data.assetType"
    @click.stop="onClick"
  >
    <span class="add-icon">+</span>
    <span class="add-label">{{ data.label || defaultLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCanvasContext } from '@/composables/useCanvasContext'
import { useI18n } from '@/i18n'

const props = defineProps({
  data: { type: Object, required: true },
})

const ctx = useCanvasContext()
const { locale, t } = useI18n()

const defaultLabel = computed(() => {
  const isEn = locale.value === 'en'
  const map = {
    character: isEn ? 'New Character' : t('dramaCanvas.newCharacter'),
    scene: isEn ? 'New Scene' : t('dramaCanvas.newScene'),
    prop: isEn ? 'New Prop' : t('dramaCanvas.newProp'),
    storyboard: isEn ? 'New Shot' : t('dramaCanvas.newShot'),
  }
  return map[props.data.assetType] || (isEn ? 'New' : t('common.create'))
})

function onClick() {
  ctx?.openCreateDialog?.(props.data.assetType)
}
</script>

<style scoped>
.canvas-add-node {
  width: 176px;
  padding: 14px 12px;
  border-radius: 10px;
  border: 1px dashed var(--border-muted);
  background: var(--bg-hover);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s, background 0.15s;
}
.canvas-add-node:hover {
  border-color: var(--border-muted);
  background: var(--bg-hover);
}
.add-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--bg-hover);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.add-label {
  font-size: 12px;
  color: var(--text-muted);
}
.kind-character { border-color: var(--border-muted); }
.kind-character .add-icon { background: var(--bg-hover); color: var(--text-primary); }
.kind-scene { border-color: var(--border-muted); }
.kind-scene .add-icon { background: var(--bg-hover); color: var(--text-primary); }
.kind-prop { border-color: var(--el-color-warning); }
.kind-prop .add-icon { background: var(--bg-hover); color: var(--el-color-warning); }
.kind-storyboard { border-color: var(--border-muted); width: 200px; }
</style>
