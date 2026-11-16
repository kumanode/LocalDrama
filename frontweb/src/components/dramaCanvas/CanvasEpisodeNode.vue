<template>
  <div class="canvas-episode-node">
    <Handle type="target" :position="Position.Left" />
    <span class="badge">{{ t('dramaCanvas.episodeNum', { num: data.episode?.episode_number ?? '?' }) }}</span>
    <span class="title">{{ data.episode?.title || t('dramaCanvas.untitledEpisode') }}</span>
    <span class="count">{{ t('dramaCanvas.shotCount', { count: (data.episode?.storyboards || []).length }) }}</span>
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped>
.canvas-episode-node {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-muted);
  background: var(--bg-hover);
  color: var(--text-primary);
  font-size: 13px;
  white-space: nowrap;
}
.badge {
  font-weight: 700;
}
.title {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.count {
  font-size: 11px;
  opacity: 0.75;
}
</style>
