<template>
  <template v-if="visible">
    <div class="sb-prompt-label">
      <span class="sb-dot"></span>
      <span>{{ $t('filmCreate.narrationLabel') }}</span>
    </div>
    <el-input
      :model-value="draft"
      type="textarea"
      :rows="2"
      :placeholder="$t('filmCreate.narrationPlaceholder')"
      class="sb-narration-input"
      @update:model-value="$emit('update:draft', $event)"
      @blur="$emit('save')"
    />
    <div v-if="hasText" class="sb-narration-actions">
      <el-tooltip :content="$t('filmCreate.narrationTtsTooltip')" placement="top">
        <el-button size="small" :loading="ttsRunning" @click="$emit('generate')">
          {{ $t('filmCreate.narrationDubbing') }}
        </el-button>
      </el-tooltip>
      <el-tooltip v-if="audioPath" :content="$t('filmCreate.playNarrationDubbing')" placement="top">
        <el-button size="small" :aria-label="$t('filmCreate.playNarrationDubbing')" @click="$emit('play')">
          <el-icon aria-hidden="true"><VideoPlay /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import { shouldShowNarration } from '@/utils/narrationSection'

const props = defineProps({
  storyboardIncludeNarration: { type: Boolean, default: false },
  draft: { type: String, default: '' },
  saved: { type: String, default: '' },
  ttsRunning: { type: Boolean, default: false },
  audioPath: { type: String, default: '' },
})

defineEmits(['update:draft', 'save', 'generate', 'play'])

const visible = computed(() => shouldShowNarration({
  enabled: props.storyboardIncludeNarration,
  draft: props.draft,
  saved: props.saved,
}))
const hasText = computed(() => Boolean(String(props.draft || props.saved || '').trim()))
</script>
