<template>
  <div class="canvas-floating-toolbar nodrag nopan">
    <span class="toolbar-label">{{ t('dramaCanvas.quickCreate') }}</span>
    <el-button size="small" @click="create('storyboard')">{{ t('dramaCanvas.shot') }}</el-button>
    <el-button size="small" @click="create('character')">{{ t('dramaDetail.characters') }}</el-button>
    <el-button size="small" @click="create('scene')">{{ t('dramaDetail.scenes') }}</el-button>
    <el-button size="small" @click="create('prop')">{{ t('dramaDetail.props') }}</el-button>
    <el-button size="small" @click="create('episode')">{{ t('filmCreate.episodeCountUnit') }}</el-button>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'
import { useCanvasContext } from '@/composables/useCanvasContext'

const { t } = useI18n()

const ctx = useCanvasContext()

function create(type) {
  ctx?.openCreateDialog?.(type)
}
</script>

<style scoped>
.canvas-floating-toolbar {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-muted);
  background: var(--bg-hover);
  box-shadow: none; border: 1px solid var(--border-muted);
  flex-wrap: wrap;
  max-width: calc(100% - 24px);
}
.toolbar-label {
  font-size: 11px;
  color: var(--text-subtle);
  margin-right: 4px;
  white-space: nowrap;
}
</style>
