<template>
  <section id="anchor-storyboard" class="section card">
    <h2 class="section-title">
      <span>{{ $t('filmCreate.storyboardStepTitle') }}</span>
      <span class="step-desc">{{ $t('filmCreate.storyboardStepDesc') }}</span>
    </h2>
    <div class="sb-config-row">
      <label class="sb-config-item">
        <span class="sb-config-label">{{ $t('filmCreate.storyboardCount') }}</span>
        <el-input-number
          :model-value="storyboardCount"
          :min="1"
          :max="200"
          :step="5"
          :placeholder="$t('filmCreate.autoPlaceholder')"
          class="sb-config-input"
          @update:model-value="(v) => $emit('update:storyboardCount', v)"
        />
        <span class="sb-config-hint sb-config-hint--estimate" :title="scriptEstimateStoryboardTitle">
          {{ $t('filmCreate.leaveEmptyAiDecide') }}{{ scriptEstimateStoryboardHint }}
        </span>
      </label>
      <span class="sb-config-divider">｜</span>
      <label class="sb-config-item">
        <span class="sb-config-label">{{ $t('filmCreate.videoTotalDuration') }}</span>
        <el-input-number
          :model-value="videoDuration"
          :min="10"
          :max="600"
          :step="5"
          :placeholder="$t('filmCreate.autoPlaceholder')"
          class="sb-config-input"
          @update:model-value="(v) => $emit('update:videoDuration', v)"
        />
        <span class="sb-config-hint sb-config-hint--estimate" :title="scriptEstimateVideoDurationTitle">
          {{ $t('filmCreate.leaveEmptyAiDecide') }}{{ scriptEstimateVideoDurationHint }}
        </span>
      </label>
      <span class="sb-config-divider">｜</span>
      <label class="sb-config-item">
        <span class="sb-config-label">{{ $t('filmCreate.stripMode') }}</span>
        <el-select
          :model-value="gridMode"
          size="small"
          class="sb-grid-mode-select"
          :disabled="storyboardUseFirstLastFrame"
          @update:model-value="(v) => $emit('update:gridMode', v)"
        >
          <el-option :label="$t('filmCreate.modeSingle')" value="single" />
          <el-option :label="$t('filmCreate.modeQuadGrid')" value="quad_grid" />
          <el-option :label="$t('filmCreate.modeNineGrid')" value="nine_grid" />
        </el-select>
        <span class="sb-config-hint">{{ $t('filmCreate.gridSplitHint') }}</span>
      </label>
    </div>
    <div v-if="storyboards.length" class="sb-view-tools">
      <el-checkbox :model-value="selectedIds.size === storyboards.length" @change="toggleAll">
        {{ $t('filmCreate.selectAllShots') }}
      </el-checkbox>
      <span v-if="selectedIds.size" class="sb-selection-count">
        {{ $t('filmCreate.shotsSelected', { count: selectedIds.size }) }}
      </span>
      <el-button size="small" :aria-pressed="compactMode" @click="compactMode = !compactMode">
        {{ compactMode ? $t('filmCreate.expandShots') : $t('filmCreate.compactShots') }}
      </el-button>
      <el-button v-if="selectedIds.size" size="small" :loading="selectedAction === 'image'" @click="runSelected('image')">
        {{ $t('filmCreate.generateSelectedImages') }}
      </el-button>
      <el-button v-if="selectedIds.size" size="small" :loading="selectedAction === 'video'" @click="runSelected('video')">
        {{ $t('filmCreate.generateSelectedVideos') }}
      </el-button>
      <el-select
        v-if="selectedIds.size"
        v-model="selectedAspectRatio"
        size="small"
        class="sb-bulk-ratio"
        :aria-label="$t('filmCreate.bulkAspectRatio')"
      >
        <el-option v-for="ratio in aspectRatios" :key="ratio" :label="ratio" :value="ratio" />
      </el-select>
      <el-button v-if="selectedIds.size" size="small" :loading="selectedAction === 'ratio'" @click="runSelected('ratio')">
        {{ $t('filmCreate.applyAspectRatio') }}
      </el-button>
      <el-button v-if="selectedIds.size" size="small" type="danger" plain @click="runSelected('delete')">
        {{ $t('filmCreate.deleteSelectedShots') }}
      </el-button>
    </div>
    <div id="anchor-export" class="sb-config-row sb-narration-export-row">
      <el-checkbox
        :model-value="storyboardUseFirstLastFrame"
        @update:model-value="(v) => $emit('update:storyboardUseFirstLastFrame', v)"
        @change="$emit('change-first-last-frame', $event)"
      >
        {{ $t('filmCreate.firstLastFrameModeHint') }}
      </el-checkbox>
      <el-checkbox
        :model-value="storyboardUniversalOmni"
        @update:model-value="(v) => $emit('update:storyboardUniversalOmni', v)"
        @change="$emit('save-project-settings')"
      >
        {{ $t('filmCreate.universalOmniModeHint') }}
      </el-checkbox>
      <el-checkbox
        :model-value="storyboardIncludeNarration"
        @update:model-value="(v) => $emit('update:storyboardIncludeNarration', v)"
        @change="$emit('save-project-settings')"
      >
        {{ $t('filmCreate.genNarrationHint') }}
      </el-checkbox>
      <el-button
        v-if="storyboards.length > 0"
        class="sb-export-srt-btn"
        size="small"
        plain
        type="primary"
        :disabled="!currentEpisodeId"
        :loading="exportingStoryboardSheet"
        @click="$emit('export-storyboard-sheet')"
      >
        {{ $t('filmCreate.exportStoryboardExcel') }}
      </el-button>
      <el-button
        v-if="storyboards.length > 0"
        class="sb-export-srt-btn"
        size="small"
        plain
        type="primary"
        :disabled="!currentEpisodeId"
        @click="$emit('export-narration-srt')"
      >
        {{ $t('filmCreate.exportNarrationSrt') }}
      </el-button>
    </div>

    <div class="asset-actions sb-batch-actions">
      <div class="flex">
        <el-button
          type="primary"
          size="large"
          :loading="storyboardGenerating || universalOmniPolishRunning"
          :disabled="!currentEpisodeId || storyboardGenerating || universalOmniPolishRunning"
          @click="$emit('generate-storyboard')"
        >
          {{ storyboards.length > 0 ? $t('filmCreate.reGenerateStoryboards') : $t('filmCreate.aiGenerateStoryboards') }}
        </el-button>
        <el-button type="info" plain size="large" @click="$emit('add-single-storyboard')">
          {{ $t('filmCreate.addOneStoryboard') }}
        </el-button>
      </div>
      <template v-if="storyboards.length > 0">
        <div class="sb-batch-right">
          <el-button
            type="success"
            plain
            size="large"
            :loading="batchImageRunning"
            :disabled="!currentEpisodeId || batchImageRunning || batchVideoRunning || pipelineRunning || storyboardGenerating || universalOmniPolishRunning"
            @click="$emit('start-batch-image')"
          >
            {{ $t('filmCreate.batchGenStoryboardImages') }}
          </el-button>
          <el-button
            type="warning"
            plain
            size="large"
            :loading="batchVideoRunning"
            :disabled="!currentEpisodeId || batchImageRunning || batchVideoRunning || pipelineRunning || storyboardGenerating || universalOmniPolishRunning"
            @click="$emit('start-batch-video')"
          >
            {{ $t('filmCreate.batchGenStoryboardVideos') }}
          </el-button>
          <el-button v-if="batchImageRunning" size="large" type="danger" plain @click="$emit('stop-batch-image')">{{ $t('filmCreate.stopImages') }}</el-button>
          <el-button v-if="batchVideoRunning" size="large" type="danger" plain @click="$emit('stop-batch-video')">{{ $t('filmCreate.stopVideos') }}</el-button>
        </div>
      </template>
    </div>

    <!-- 批量生成进度 -->
    <div v-if="batchImageRunning || batchVideoRunning || batchImageErrors.length || batchVideoErrors.length" class="batch-status">
      <div v-if="batchImageRunning" class="batch-progress">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ $t('filmCreate.batchGenImageProgress', { current: batchImageProgress.current, total: batchImageProgress.total }) }}</span>
        <span v-if="batchImageProgress.failed > 0" class="batch-failed">{{ $t('filmCreate.batchFailedCount', { count: batchImageProgress.failed }) }}</span>
        <span v-if="batchImageStopping" class="batch-stopping">{{ $t('filmCreate.batchStopping') }}</span>
      </div>
      <div v-if="batchVideoRunning" class="batch-progress">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ $t('filmCreate.batchGenVideoProgress', { current: batchVideoProgress.current, total: batchVideoProgress.total }) }}</span>
        <span v-if="batchVideoProgress.failed > 0" class="batch-failed">{{ $t('filmCreate.batchFailedCount', { count: batchVideoProgress.failed }) }}</span>
        <span v-if="batchVideoStopping" class="batch-stopping">{{ $t('filmCreate.batchStopping') }}</span>
      </div>
      <div v-if="batchImageErrors.length > 0" class="batch-error-log">
        <div class="batch-error-title">{{ $t('filmCreate.batchImageFailedRecord') }}</div>
        <div v-for="(e, i) in batchImageErrors" :key="i" class="batch-error-line">{{ e }}</div>
      </div>
      <div v-if="batchVideoErrors.length > 0" class="batch-error-log">
        <div class="batch-error-title">{{ $t('filmCreate.batchVideoFailedRecord') }}</div>
        <div v-for="(e, i) in batchVideoErrors" :key="i" class="batch-error-line">{{ e }}</div>
      </div>
    </div>

    <div v-if="storyboardGenerating || universalOmniPolishRunning" class="storyboard-generating-tip">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span v-if="universalOmniPolishRunning">
        {{ $t('filmCreate.polishingUniversalPrompt', { current: universalOmniPolishProgress.current, total: universalOmniPolishProgress.total }) }}
        <template v-if="universalOmniPolishProgress.label">（{{ universalOmniPolishProgress.label }}）</template>
        …
      </span>
      <span v-else>{{ $t('filmCreate.analyzingScriptBreakdown') }}</span>
    </div>

    <div v-if="sbTruncatedWarning && !sbTruncatedDismissed && storyboards.length > 0" class="sb-truncated-warning">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ $t('filmCreate.storyboardTruncatedWarning') }}</span>
      <el-button size="small" text @click="$emit('update:sbTruncatedDismissed', true)">{{ $t('common.close') }}</el-button>
    </div>

    <template v-if="storyboards.length > 0">
      <template v-for="(sb, i) in storyboards" :key="sb.id">
        <!-- 段落分隔标头：segment_title 存在且是新段落的第一个镜头时显示 -->
        <div
          v-if="sb.segment_title && (i === 0 || sb.segment_index !== storyboards[i - 1].segment_index)"
          class="segment-header"
        >
          <div class="segment-header-inner">
            <span class="segment-index-badge">{{ $t('filmCreate.segmentIndexBadge', { num: (sb.segment_index ?? 0) + 1 }) }}</span>
            <span class="segment-title-text">{{ sb.segment_title }}</span>
            <span class="segment-shot-range">
              {{ $t('filmCreate.shotRangePrefix') }} {{ i + 1 }}–{{ (() => {
                let end = i
                while (end + 1 < storyboards.length && storyboards[end + 1].segment_index === sb.segment_index) end++
                return end + 1
              })() }}
            </span>
          </div>
        </div>

        <StoryboardCard
          :sb="sb"
          :index="i"
          :characters="characters"
          :scenes="scenes"
          :props-list="propsList"
          :storyboard-use-first-last-frame="storyboardUseFirstLastFrame"
          :storyboard-include-narration="storyboardIncludeNarration"
          :last-frame-use-first-layout-lock="lastFrameUseFirstLayoutLock"
          :state="cardState"
          :actions="cardActions"
          :compact="compactMode"
          :selected="selectedIds.has(sb.id)"
          @toggle-selected="toggleSelected(sb.id)"
        />
      </template>
    </template>

    <!-- 分镜生成中提示条 -->
    <div v-if="storyboardGenerating || universalOmniPolishRunning" class="sb-generating-tip">
      <span class="sb-gen-dot" /><span class="sb-gen-dot" /><span class="sb-gen-dot" />
      <span v-if="universalOmniPolishRunning" class="sb-gen-text">
        {{ $t('filmCreate.universalPolishingProgress', { current: universalOmniPolishProgress.current, total: universalOmniPolishProgress.total }) }}
        <template v-if="universalOmniPolishProgress.label"> · {{ universalOmniPolishProgress.label }}</template>
      </span>
      <span v-else class="sb-gen-text">{{ $t('filmCreate.storyboardGeneratingWait') }}</span>
    </div>
    <EmptyState
      v-else-if="storyboards.length === 0"
      :description="$t('filmCreate.pleaseGenStoryboardsFirst')"
      :action-label="$t('filmCreate.aiGenerateStoryboards')"
      @action="$emit('generate-storyboard')"
    />
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Loading, WarningFilled } from '@element-plus/icons-vue'
import StoryboardCard from './StoryboardCard.vue'
import EmptyState from './EmptyState.vue'
import { storyboardsAPI } from '@/api/storyboards'
import {
  getSelectedStoryboards,
  selectAllStoryboards,
  toggleStoryboardSelection,
} from '@/utils/storyboardSelection'

const props = defineProps({
  storyboardCount: { type: Number, default: undefined },
  videoDuration: { type: Number, default: undefined },
  gridMode: { type: String, default: 'single' },
  storyboardUseFirstLastFrame: { type: Boolean, default: false },
  storyboardUniversalOmni: { type: Boolean, default: false },
  storyboardIncludeNarration: { type: Boolean, default: false },
  lastFrameUseFirstLayoutLock: { type: Boolean, default: false },
  scriptEstimateStoryboardTitle: { type: String, default: '' },
  scriptEstimateStoryboardHint: { type: String, default: '' },
  scriptEstimateVideoDurationTitle: { type: String, default: '' },
  scriptEstimateVideoDurationHint: { type: String, default: '' },
  exportingStoryboardSheet: { type: Boolean, default: false },
  currentEpisodeId: { type: [Number, String], default: null },
  storyboardGenerating: { type: Boolean, default: false },
  universalOmniPolishRunning: { type: Boolean, default: false },
  universalOmniPolishProgress: { type: Object, default: () => ({ current: 0, total: 0, label: '' }) },
  batchImageRunning: { type: Boolean, default: false },
  batchImageStopping: { type: Boolean, default: false },
  batchImageProgress: { type: Object, default: () => ({ current: 0, total: 0, failed: 0 }) },
  batchImageErrors: { type: Array, default: () => [] },
  batchVideoRunning: { type: Boolean, default: false },
  batchVideoStopping: { type: Boolean, default: false },
  batchVideoProgress: { type: Object, default: () => ({ current: 0, total: 0, failed: 0 }) },
  batchVideoErrors: { type: Array, default: () => [] },
  sbTruncatedWarning: { type: Boolean, default: false },
  sbTruncatedDismissed: { type: Boolean, default: false },
  pipelineRunning: { type: Boolean, default: false },
  storyboards: { type: Array, default: () => [] },
  characters: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] },
  propsList: { type: Array, default: () => [] },
  cardState: { type: Object, required: true },
  cardActions: { type: Object, required: true },
})

defineEmits([
  'update:storyboardCount',
  'update:videoDuration',
  'update:gridMode',
  'update:storyboardUseFirstLastFrame',
  'update:storyboardUniversalOmni',
  'update:storyboardIncludeNarration',
  'update:sbTruncatedDismissed',
  'change-first-last-frame',
  'save-project-settings',
  'export-storyboard-sheet',
  'export-narration-srt',
  'generate-storyboard',
  'add-single-storyboard',
  'start-batch-image',
  'start-batch-video',
  'stop-batch-image',
  'stop-batch-video',
])
const selectedIds = ref(new Set())
const compactMode = ref(false)
const selectedAction = ref('')
const selectedAspectRatio = ref('16:9')
const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4']
const selectedStoryboards = computed(() => getSelectedStoryboards(props.storyboards, selectedIds.value))

watch(() => props.storyboards.map(({ id }) => id), (ids) => {
  selectedIds.value = new Set([...selectedIds.value].filter((id) => ids.includes(id)))
})

function toggleSelected(id) {
  selectedIds.value = toggleStoryboardSelection(selectedIds.value, id)
}

function toggleAll(selected) {
  selectedIds.value = selectAllStoryboards(props.storyboards, selected)
}

async function runSelected(action) {
  selectedAction.value = action
  try {
    for (const storyboard of selectedStoryboards.value) {
      if (action === 'image') await props.cardActions.onGenerateSbImage(storyboard)
      else if (action === 'video') await props.cardActions.onGenerateSbVideo(storyboard)
      else if (action === 'ratio') {
        await storyboardsAPI.update(storyboard.id, { aspect_ratio: selectedAspectRatio.value })
        storyboard.aspect_ratio = selectedAspectRatio.value
      }
      else await props.cardActions.onDeleteSingleStoryboard(storyboard.id)
    }
    if (action === 'delete') selectedIds.value = new Set()
  } finally {
    selectedAction.value = ''
  }
}
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.step-desc {
  font-size: var(--font-xs);
  font-weight: 400;
  color: var(--text-muted);
}
.sb-bulk-ratio { min-width: 96px; width: auto; }
.sb-grid-mode-select { min-width:110px; width:auto; }
.sb-narration-export-row { margin-top:10px; flex-wrap:wrap; align-items:center; gap:12px; }
.sb-config-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
}
.sb-view-tools { display:flex; align-items:center; flex-wrap:wrap; gap:var(--space-2); margin:var(--space-3) 0; }
.sb-selection-count { color:var(--text-muted); font-size:var(--font-sm); }
.sb-config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sb-config-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.sb-config-input {
  width: 120px;
}
.sb-config-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.sb-config-hint--estimate {
  cursor: help;
  color: var(--el-color-primary);
}
.sb-config-divider {
  color: var(--el-border-color);
  font-size: 12px;
}
.sb-batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  margin-bottom: 12px;
}
.sb-batch-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.batch-status {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.batch-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}
.batch-failed {
  color: var(--danger-text);
  font-size: 12px;
}
.batch-stopping {
  color: var(--el-color-warning);
  font-size: 12px;
}
.batch-error-log {
  padding: 10px 12px;
  background: var(--danger-soft);
  border: 1px solid var(--el-color-danger);
  border-radius: 6px;
  font-size: 13px;
  color: var(--danger-text);
  max-height: 160px;
  overflow-y: auto;
}
.batch-error-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--danger-text);
}
.batch-error-line {
  margin-bottom: 3px;
  word-break: break-all;
}
.storyboard-generating-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 8px;
  margin: 12px 0;
  font-size: 13px;
}
.sb-truncated-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--el-color-warning);
  border-radius: 8px;
  color: var(--el-color-warning);
  font-size: 13px;
  margin: 12px 0;
}
.segment-header {
  margin: 24px 0 14px;
  position: relative;
}
.segment-header:first-child { margin-top: 0; }
.segment-header-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--bg-inner);
  border-left: 3px solid var(--text-bright);
  border-radius: 0 10px 10px 0;
}
.segment-index-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-bright);
  background: var(--bg-inner);
  border: 1px solid var(--border-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}
.segment-title-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  letter-spacing: -0.01em;
}
.segment-shot-range {
  font-size: 11px;
  color: var(--text-subtle);
  white-space: nowrap;
}
html.light .segment-header-inner {
  background: var(--bg-inner);
  border-left-color: var(--border-muted);
}
html.light .segment-title-text { color: var(--text-bright); }
html.light .segment-index-badge { color: var(--text-primary); background: var(--bg-inner); border: 1px solid var(--border-muted); }
html.light .segment-shot-range { color: var(--text-muted); }

.sb-generating-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px;
  color: var(--el-color-primary);
  font-size: 13px;
  justify-content: center;
}
.sb-gen-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  animation: sb-bounce 1s infinite alternate;
}
@keyframes sb-bounce {
  from { opacity: 0.3; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1.2); }
}
.empty-tip {
  text-align: center;
  color: var(--text-subtle);
  padding: 32px 0;
  font-size: 14px;
}
</style>
