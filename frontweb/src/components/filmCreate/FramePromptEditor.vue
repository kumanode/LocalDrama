<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('filmCreate.framePromptEditorTitle', { slot: slot === 'last' ? $t('filmCreate.lastFrame') : $t('filmCreate.firstFrame') })"
    width="720px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="frame-prompt-editor-body">
      <div class="frame-prompt-editor-hint">
        {{ $t('filmCreate.framePromptEditorHint') }}
      </div>

      <div v-if="storyboard?.layout_description" class="frame-layout-anchor">
        <div class="frame-layout-anchor-label">{{ $t('filmCreate.frameLayoutAnchorLabel') }}</div>
        <div class="frame-layout-anchor-text">{{ storyboard.layout_description }}</div>
        <div class="frame-layout-anchor-note">{{ $t('filmCreate.frameLayoutAnchorNote') }}</div>
      </div>

      <el-input
        :model-value="promptText"
        type="textarea"
        :rows="14"
        :placeholder="$t('filmCreate.framePromptEditorPlaceholder')"
        class="frame-prompt-editor-textarea"
        @update:model-value="$emit('update:promptText', $event)"
      />
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</el-button>
      <el-button :loading="regenerating" @click="$emit('regenerate')">{{ $t('filmCreate.regenNow') }}</el-button>
      <el-button type="primary" :loading="saving" @click="$emit('save')">{{ $t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  slot: {
    type: String,
    default: 'first',
  },
  storyboard: {
    type: Object,
    default: null,
  },
  promptText: {
    type: String,
    default: '',
  },
  saving: {
    type: Boolean,
    default: false,
  },
  regenerating: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue', 'update:promptText', 'regenerate', 'save'])
</script>

<style scoped>
.frame-prompt-editor-body {
  padding: 4px 0;
}
.frame-prompt-editor-hint {
  font-size: 12px;
  color: var(--text-subtle);
  margin-bottom: 10px;
  line-height: 1.5;
}
html.light .frame-prompt-editor-hint {
  color: var(--text-primary);
}
.frame-prompt-editor-textarea :deep(.el-textarea__inner) {
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  line-height: 1.65;
}

.frame-layout-anchor {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
}
html.light .frame-layout-anchor {
  background: var(--bg-inner);
  border-color: var(--border-color);
}
.frame-layout-anchor-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.frame-layout-anchor-text {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-card);
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  white-space: pre-wrap;
  word-break: break-word;
}
.frame-layout-anchor-note {
  font-size: 11px;
  color: var(--text-subtle);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
