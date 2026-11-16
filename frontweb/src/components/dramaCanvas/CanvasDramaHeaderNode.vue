<template>
  <div class="canvas-drama-header">
    <div class="title">{{ data.drama?.title || t('filmList.unnamedProject') }}</div>
    <div class="meta">
      <span v-if="data.drama?.style">{{ t('dramaCanvas.styleTag', { style: data.drama.style }) }}</span>
      <span>{{ t('dramaCanvas.episodesCount', { count: (data.drama?.episodes || []).length }) }}</span>
      <span>{{ t('dramaCanvas.assetsCount', { count: assetCount }) }}</span>
      <span>{{ t('dramaCanvas.storyboardsCount', { count: storyboardCount }) }}</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'
import { computed } from 'vue'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
})

const assetCount = computed(() => {
  const d = props.data.drama || {}
  return (d.characters?.length || 0) + (d.scenes?.length || 0) + (d.props?.length || 0)
})

const storyboardCount = computed(() =>
  (props.data.drama?.episodes || []).reduce((n, ep) => n + (ep.storyboards?.length || 0), 0)
)
</script>

<style scoped>
.canvas-drama-header {
  min-width: 280px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: none; border: 1px solid var(--border-muted);
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: #f4f4f5;
  margin-bottom: 6px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #a1a1aa;
}
</style>
