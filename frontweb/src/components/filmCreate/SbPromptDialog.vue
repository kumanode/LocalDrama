<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('filmCreate.editPromptDialogTitle', { num: target?.storyboard_number ?? '' })"
    width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <el-form v-if="target" label-width="0" class="sb-prompt-dialog-form">
      <div class="sb-prompt-section-title">{{ $t('filmCreate.imagePromptSectionTitle') }}</div>
      <el-form-item label="">
        <div style="width:100%">
          <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">{{ $t('filmCreate.originalPromptHint') }}</div>
          <el-input
            :model-value="imageText"
            type="textarea"
            :rows="4"
            :placeholder="$t('filmCreate.originalPromptPlaceholder')"
            @update:model-value="$emit('update:imageText', $event)"
          />
        </div>
      </el-form-item>
      <el-form-item label="">
        <div style="width:100%">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="font-size:12px; color:#6b7280;">{{ $t('filmCreate.polishedPromptHint') }}</span>
            <el-button
              size="small"
              type="warning"
              plain
              :loading="polishing"
              @click="$emit('polish')"
            >{{ polishedText ? $t('filmCreate.regenNow') : $t('filmCreate.genNow') }}</el-button>
          </div>
          <el-input
            :model-value="polishedText"
            type="textarea"
            :rows="5"
            :placeholder="$t('filmCreate.polishedPromptPlaceholder')"
            @update:model-value="$emit('update:polishedText', $event)"
          />
        </div>
      </el-form-item>
      <div class="sb-prompt-section-title" style="margin-top:12px;">{{ $t('filmCreate.videoPromptSectionTitle') }}</div>
      <el-form-item label="">
        <el-input
          :model-value="videoText"
          type="textarea"
          :rows="12"
          :placeholder="$t('filmCreate.videoPromptPlaceholder')"
          @update:model-value="$emit('update:videoText', $event)"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
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
  target: {
    type: Object,
    default: null,
  },
  imageText: {
    type: String,
    default: '',
  },
  polishedText: {
    type: String,
    default: '',
  },
  videoText: {
    type: String,
    default: '',
  },
  saving: {
    type: Boolean,
    default: false,
  },
  polishing: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue', 'update:imageText', 'update:polishedText', 'update:videoText', 'polish', 'save', 'close'])
</script>

<style scoped>
.sb-prompt-dialog-form .el-form-item {
  margin-bottom: 10px;
}
.sb-prompt-section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 8px;
}
html.light .sb-prompt-section-title {
  color: #18181b;
}
</style>
