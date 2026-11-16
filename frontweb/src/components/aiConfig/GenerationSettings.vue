<template>
  <div class="tab-content generation-settings">
    <div class="gs-section-title">{{ $t('aiConfig.genConcurrencyTitle') }}</div>
    <p class="gs-desc">{{ $t('aiConfig.genConcurrencyDesc') }}</p>

    <div class="gs-row">
      <span class="gs-label">{{ $t('aiConfig.imageConcurrency') }}</span>
      <el-select
        :model-value="genConcurrencyInput"
        filterable
        allow-create
        default-first-option
        :placeholder="$t('aiConfig.concurrencyPlaceholder')"
        class="concurrency-select"
        @update:model-value="$emit('update:genConcurrencyInput', $event)"
        @change="$emit('concurrency-change', $event)"
      >
        <el-option :label="$t('aiConfig.concurrencySerial')" :value="1" />
        <el-option label="2" :value="2" />
        <el-option :label="$t('aiConfig.concurrencyDefault')" :value="3" />
        <el-option label="5" :value="5" />
        <el-option label="8" :value="8" />
        <el-option label="10" :value="10" />
      </el-select>
      <span class="gs-unit">{{ $t('aiConfig.tasksAtSameTime') }}</span>
    </div>

    <div class="gs-row gs-video-row">
      <span class="gs-label">{{ $t('aiConfig.videoConcurrency') }}</span>
      <el-select
        :model-value="genVideoConcurrencyInput"
        filterable
        allow-create
        default-first-option
        :placeholder="$t('aiConfig.concurrencyPlaceholder')"
        class="concurrency-select"
        @update:model-value="$emit('update:genVideoConcurrencyInput', $event)"
        @change="$emit('video-concurrency-change', $event)"
      >
        <el-option :label="$t('aiConfig.concurrencySerial')" :value="1" />
        <el-option label="2" :value="2" />
        <el-option :label="$t('aiConfig.concurrencyDefault')" :value="3" />
        <el-option label="5" :value="5" />
        <el-option label="8" :value="8" />
        <el-option label="10" :value="10" />
      </el-select>
      <span class="gs-unit">{{ $t('aiConfig.tasksAtSameTime') }}</span>
    </div>

    <div class="gs-section-title content-language-title">{{ $t('aiConfig.contentLanguageTitle') }}</div>
    <p class="gs-desc">{{ $t('aiConfig.contentLanguageDesc') }}</p>
    <div class="gs-row">
      <span class="gs-label">{{ $t('aiConfig.contentLanguage') }}</span>
      <el-select
        :model-value="contentLanguage"
        class="content-language-select"
        @update:model-value="$emit('update:contentLanguage', $event)"
        @change="$emit('save-content-language', $event)"
      >
        <el-option :label="$t('aiConfig.contentLanguageChinese')" value="zh" />
        <el-option :label="$t('aiConfig.contentLanguageEnglish')" value="en" />
        <el-option :label="$t('aiConfig.contentLanguageIndonesian')" value="id" />
      </el-select>
      <el-tag v-if="contentLanguageSaved" type="success" effect="plain">{{ $t('aiConfig.saved') }}</el-tag>
    </div>

    <div class="gs-save-row">
      <el-button type="primary" size="small" :loading="genSettingSaving" @click="$emit('save-generation-settings')">
        {{ $t('common.save') }}
      </el-button>
    </div>
    <el-alert
      v-if="genSettingSaved"
      type="success"
      :title="$t('aiConfig.saved')"
      :closable="false"
      show-icon
      class="gs-saved-alert"
    />
    <div class="gs-tip-box">
      <div class="gs-tip-title">{{ $t('aiConfig.scopeTitle') }}</div>
      <ul class="gs-tip-list">
        <li>{{ $t('aiConfig.imageConcurrencyScope') }}</li>
        <li>{{ $t('aiConfig.videoConcurrencyScope') }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  genConcurrencyInput: { type: [Number, String], required: true },
  genVideoConcurrencyInput: { type: [Number, String], required: true },
  contentLanguage: { type: String, required: true },
  contentLanguageSaved: { type: Boolean, default: false },
  genSettingSaving: { type: Boolean, default: false },
  genSettingSaved: { type: Boolean, default: false },
})
defineEmits([
  'update:genConcurrencyInput',
  'update:genVideoConcurrencyInput',
  'update:contentLanguage',
  'concurrency-change',
  'video-concurrency-change',
  'save-content-language',
  'save-generation-settings',
])
</script>

<style scoped>
.gs-section-title { margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.gs-desc { margin-bottom: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.gs-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.gs-label { color: var(--text-primary); font-size: 13px; font-weight: 500; white-space: nowrap; }
.gs-unit { color: var(--text-secondary); font-size: 13px; white-space: nowrap; }
.concurrency-select { width: 180px; }
.content-language-title { margin-top: 24px; }
.content-language-select { width: 180px; }
.gs-video-row { margin-top: 10px; }
.gs-save-row { margin-top: 14px; }
.gs-saved-alert { margin-top: 12px; width: fit-content; }
.gs-tip-box { margin-top: 20px; padding: 14px 16px; border-radius: 8px; background: var(--bg-inner); font-size: 13px; }
.gs-tip-title { margin-bottom: 8px; color: var(--text-primary); font-weight: 600; }
.gs-tip-list { margin: 0 0 8px 16px; padding: 0; color: var(--text-secondary); line-height: 1.8; }
</style>
