<template>
  <section class="section card">
    <h2 class="section-title">{{ $t('filmCreate.videoConfigTitle') }}</h2>
    <div class="config-grid">
      <el-form-item :label="$t('filmCreate.resolution')">
        <el-select
          :model-value="videoResolution"
          class="video-select-resolution"
          @update:model-value="$emit('update:videoResolution', $event)"
        >
          <el-option label="480p" value="480p" />
          <el-option label="720p" value="720p" />
          <el-option label="1080p" value="1080p" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('filmCreate.subtitle')">
        <div class="video-option-row">
          <el-switch
            :model-value="videoSubtitle"
            @update:model-value="$emit('update:videoSubtitle', $event)"
          />
          <span v-if="videoSubtitle" class="video-option-hint">{{ $t('filmCreate.subtitleHint') }}</span>
        </div>
      </el-form-item>
      <el-form-item :label="$t('filmCreate.burnDialogue')">
        <div class="video-option-row">
          <el-switch
            :model-value="videoBurnDialogue"
            @update:model-value="$emit('update:videoBurnDialogue', $event)"
          />
          <span v-if="videoBurnDialogue" class="video-option-hint">{{ $t('filmCreate.burnDialogueHint') }}</span>
        </div>
      </el-form-item>
      <el-form-item :label="$t('filmCreate.watermark')">
        <div class="video-option-row">
          <el-switch
            :model-value="videoWatermark"
            @update:model-value="$emit('update:videoWatermark', $event)"
          />
          <el-input
            v-if="videoWatermark"
            :model-value="videoWatermarkText"
            :placeholder="$t('filmCreate.watermarkPlaceholder')"
            maxlength="200"
            show-word-limit
            clearable
            class="video-watermark-input"
            @update:model-value="$emit('update:videoWatermarkText', $event)"
          />
        </div>
      </el-form-item>
    </div>
    <p class="config-tip">
      {{ $t('filmCreate.aiConfigTipPrefix') }}<el-link type="primary" underline="never" @click="$emit('open-ai-config')">{{ $t('routes.aiConfig') }}</el-link>{{ $t('filmCreate.aiConfigTipSuffix') }}
    </p>
  </section>
</template>

<script setup>
defineProps({
  videoResolution: {
    type: String,
    default: '1080p',
  },
  videoSubtitle: {
    type: Boolean,
    default: false,
  },
  videoBurnDialogue: {
    type: Boolean,
    default: false,
  },
  videoWatermark: {
    type: Boolean,
    default: false,
  },
  videoWatermarkText: {
    type: String,
    default: '',
  },
})

defineEmits([
  'update:videoResolution',
  'update:videoSubtitle',
  'update:videoBurnDialogue',
  'update:videoWatermark',
  'update:videoWatermarkText',
  'open-ai-config',
])
</script>

<style scoped>
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px 24px;
  margin-bottom: 16px;
}
.video-option-hint {
  flex: 1;
  min-width: 200px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}
.video-option-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px 12px;
}
.video-watermark-input {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}
.video-select-resolution {
  width: 100%;
  max-width: 160px;
  min-width: 120px;
}
.config-tip {
  margin: 12px 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.config-tip .el-link {
  font-size: inherit;
}
</style>
