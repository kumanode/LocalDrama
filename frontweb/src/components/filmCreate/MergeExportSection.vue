<template>
  <section id="anchor-video" class="section card">
    <h2 class="section-title">{{ $t('filmCreate.composeVideoTitle') }}</h2>
    <el-button
      type="primary"
      size="large"
      :loading="videoStatus === 'generating'"
      :disabled="!currentEpisodeId || storyboardsLength === 0 || videoStatus === 'generating'"
      @click="$emit('generate-video')"
    >
      {{ $t('filmCreate.composeVideoBtn') }}
    </el-button>
    <div v-if="videoStatus === 'generating'" class="video-progress">
      <SegmentedProgress :value="videoProgress" :segments="20" />
      <p>{{ $t('filmCreate.videoGenerating') }}</p>
    </div>
    <div v-if="videoStatus === 'done'" class="video-done">
      <el-alert type="success" :title="$t('filmCreate.videoGenComplete')" show-icon />
    </div>
    <div v-else-if="videoStatus === 'error'" class="video-error">
      <el-alert type="error" :title="videoErrorMsg" show-icon />
    </div>
    <div v-if="currentEpisodeVideoUrl" class="video-preview-wrap">
      <p class="video-preview-label">{{ $t('filmCreate.mergedVideoPreview') }}</p>
      <video
        :src="currentEpisodeVideoUrl"
        controls
        class="video-preview-player"
        preload="metadata"
      />
    </div>
  </section>
</template>

<script setup>
import SegmentedProgress from '../SegmentedProgress.vue'

defineProps({
  currentEpisodeId: { type: [Number, String], default: null },
  storyboardsLength: { type: Number, default: 0 },
  videoStatus: { type: String, default: 'pending' },
  videoProgress: { type: Number, default: 0 },
  videoErrorMsg: { type: String, default: '' },
  currentEpisodeVideoUrl: { type: String, default: '' },
})

defineEmits(['generate-video'])
</script>

<style scoped>
.section {
  margin-bottom: 24px;
}
.section-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-primary);
}
html.light .section-title {
  color: var(--text-primary);
}
.video-progress, .video-done, .video-error {
  margin-top: 16px;
}
.video-preview-wrap {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}
.video-preview-label {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: var(--text-muted);
}
.video-preview-player {
  display: block;
  max-width: 100%;
  max-height: 360px;
  border-radius: 8px;
  background: var(--bg-inner);
}
</style>
