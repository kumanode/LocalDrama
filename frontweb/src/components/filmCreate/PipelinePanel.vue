<template>
  <section class="section card pipeline-section">
    <div class="one-click-actions">
      <span class="one-click-label">🚀 {{ $t('filmCreate.oneClickFull') }}</span>
      <el-select
        :model-value="projectAspectRatio"
        style="width: 130px"
        @update:model-value="$emit('update:projectAspectRatio', $event)"
        @change="$emit('saveProjectSettings', false)"
      >
        <el-option :label="$t('filmCreate.aspectRatio16_9')" value="16:9" />
        <el-option :label="$t('filmCreate.aspectRatio9_16')" value="9:16" />
        <el-option :label="$t('filmCreate.aspectRatio3_4')" value="3:4" />
        <el-option :label="$t('filmCreate.aspectRatio1_1')" value="1:1" />
        <el-option :label="$t('filmCreate.aspectRatio4_3')" value="4:3" />
        <el-option :label="$t('filmCreate.aspectRatio21_9')" value="21:9" />
      </el-select>
      <el-select
        :model-value="videoClipDuration"
        style="width: 105px"
        @update:model-value="$emit('update:videoClipDuration', $event)"
        @change="$emit('saveProjectSettings', false)"
      >
        <el-option :label="$t('filmCreate.duration4s')" :value="4" />
        <el-option :label="$t('filmCreate.duration5s')" :value="5" />
        <el-option :label="$t('filmCreate.duration8s')" :value="8" />
        <el-option :label="$t('filmCreate.duration10s')" :value="10" />
        <el-option :label="$t('filmCreate.duration12s')" :value="12" />
        <el-option :label="$t('filmCreate.duration15s')" :value="15" />
      </el-select>
      <el-select
        :model-value="scriptLanguage"
        :placeholder="$t('filmCreate.storyboardLanguage')"
        clearable
        style="width: 105px"
        @update:model-value="$emit('update:scriptLanguage', $event)"
      >
        <el-option :label="$t('filmCreate.langZh')" value="zh" />
        <el-option :label="$t('filmCreate.langEn')" value="en" />
      </el-select>
      <StylePickerButton
        :model-value="generationStyle"
        :custom-prompt="customStylePrompt"
        :options="generationStyleOptions"
        @update:model-value="$emit('update:generationStyle', $event)"
        @update:custom-prompt="$emit('update:customStylePrompt', $event)"
        @change="$emit('saveProjectSettings', true)"
      />
      <el-button
        type="primary"
        :loading="pipelineRunning && !pipelinePaused"
        :disabled="!currentEpisodeId || pipelineRunning"
        @click="$emit('startOneClick')"
      >
        {{ $t('filmCreate.oneClickWithMedia') }}
      </el-button>
      <el-button
        :loading="pipelineRunning && !pipelinePaused"
        :disabled="!currentEpisodeId || pipelineRunning"
        :title="$t('filmCreate.generateTextFrameworkTip')"
        @click="$emit('startTextFramework')"
      >
        {{ $t('filmCreate.generateTextFramework') }}
      </el-button>
      <template v-if="pipelineRunning">
        <el-button v-if="!pipelinePaused" type="warning" @click="$emit('pause')">
          ⏸ {{ $t('filmCreate.pause') }}
        </el-button>
        <el-button v-else type="success" @click="$emit('resume')">
          ▶ {{ $t('filmCreate.resume') }}
        </el-button>
      </template>
    </div>
    <div v-if="pipelineRunning || (pipelineErrorLog && pipelineErrorLog.length > 0)" class="pipeline-status">
      <div v-if="pipelineCurrentStep" class="pipeline-current-step">
        <span v-if="pipelineStepIndex > 0" class="pipeline-step-badge">{{ pipelineStepIndex }}/{{ pipelineStepTotal }}</span>
        {{ pipelineCurrentStep.replace(/^\[.*?\]\s*/, '') }}
      </div>
      <!-- 阶段间倒计时 -->
      <div v-if="pipelineCountdown > 0" class="pipeline-countdown">
        <div class="pipeline-countdown-ring">
          <span class="pipeline-countdown-num">{{ pipelineCountdown }}</span>
          <span class="pipeline-countdown-unit">{{ $t('filmCreate.secondsUnit') }}</span>
        </div>
        <div class="pipeline-countdown-body">
          <p class="pipeline-countdown-msg">{{ pipelineCountdownMsg }}</p>
          <div class="pipeline-countdown-actions">
            <el-button size="small" type="success" @click="$emit('skipCountdown')">
              {{ $t('filmCreate.skipCountdown') }}
            </el-button>
            <el-button v-if="!pipelinePaused" size="small" type="warning" @click="$emit('pause')">
              {{ $t('filmCreate.pauseCountdown') }}
            </el-button>
            <span v-else class="pipeline-countdown-paused">{{ $t('filmCreate.pausedMsg') }}</span>
          </div>
        </div>
      </div>
      <div v-if="pipelineActiveTasks && pipelineActiveTasks.size > 0" class="pipeline-active-tasks">
        <span
          v-for="label in Array.from(pipelineActiveTasks)"
          :key="label"
          class="pipeline-task-chip"
        >
          <span class="pipeline-task-dot" />{{ label }}
        </span>
      </div>
      <div v-if="pipelineErrorLog && pipelineErrorLog.length > 0" class="pipeline-error-log">
        <div class="pipeline-error-title">{{ $t('filmCreate.pipelineErrors') }}</div>
        <div v-for="(entry, idx) in pipelineErrorLog" :key="idx" class="pipeline-error-line">
          [{{ entry.step }}] {{ entry.message }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import StylePickerButton from '@/components/StylePickerButton.vue'

defineProps({
  projectAspectRatio: { type: String, default: '16:9' },
  videoClipDuration: { type: Number, default: 5 },
  scriptLanguage: { type: String, default: '' },
  generationStyle: { type: String, default: '' },
  customStylePrompt: { type: String, default: '' },
  generationStyleOptions: { type: Array, default: () => [] },
  currentEpisodeId: { type: [Number, String], default: null },
  pipelineRunning: { type: Boolean, default: false },
  pipelinePaused: { type: Boolean, default: false },
  pipelineErrorLog: { type: Array, default: () => [] },
  pipelineCurrentStep: { type: String, default: '' },
  pipelineStepIndex: { type: Number, default: 0 },
  pipelineStepTotal: { type: Number, default: 0 },
  pipelineCountdown: { type: Number, default: 0 },
  pipelineCountdownMsg: { type: String, default: '' },
  pipelineActiveTasks: { type: [Object, Array], default: () => new Set() },
})

defineEmits([
  'update:projectAspectRatio',
  'update:videoClipDuration',
  'update:scriptLanguage',
  'update:generationStyle',
  'update:customStylePrompt',
  'saveProjectSettings',
  'startOneClick',
  'startTextFramework',
  'pause',
  'resume',
  'skipCountdown',
])
</script>

<style scoped>
.pipeline-section {
  padding: 12px 16px !important;
}
.one-click-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.one-click-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  font-weight: 600;
}
.pipeline-status {
  margin-top: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
}
.pipeline-current-step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  font-size: 13px;
}
.pipeline-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.pipeline-active-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.pipeline-task-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px 2px 6px;
  border-radius: 12px;
  background: rgba(64, 158, 255, 0.12);
  border: 1px solid rgba(64, 158, 255, 0.3);
  color: var(--el-color-primary);
  font-size: 12px;
  white-space: nowrap;
}
.pipeline-task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  flex-shrink: 0;
  animation: pipeline-dot-pulse 1.2s ease-in-out infinite;
}
@keyframes pipeline-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}
.pipeline-error-log {
  margin-top: 0;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: #fca5a5;
  max-height: 200px;
  overflow-y: auto;
}
.pipeline-status .pipeline-error-log {
  margin-top: 8px;
}
.pipeline-error-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.pipeline-error-line {
  margin-bottom: 4px;
  word-break: break-all;
}
/* 阶段间倒计时 */
.pipeline-countdown {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 10px 0 8px;
  padding: 12px 14px;
  background: rgba(103, 194, 58, 0.08);
  border: 1px solid rgba(103, 194, 58, 0.35);
  border-radius: 10px;
}
.pipeline-countdown-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(103, 194, 58, 0.15);
  border: 2px solid rgba(103, 194, 58, 0.6);
  flex-shrink: 0;
}
.pipeline-countdown-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-success);
  line-height: 1;
}
.pipeline-countdown-unit {
  font-size: 11px;
  color: var(--el-color-success);
  opacity: 0.8;
}
.pipeline-countdown-body {
  flex: 1;
  min-width: 0;
}
.pipeline-countdown-msg {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
}
.pipeline-countdown-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.pipeline-countdown-paused {
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
