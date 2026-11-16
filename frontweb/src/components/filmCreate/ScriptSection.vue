<template>
  <section class="section card script-workbench-unified">
    <el-tabs
      :model-value="scriptWorkbenchMode"
      class="script-workbench-tabs"
      @update:model-value="$emit('update:scriptWorkbenchMode', $event)"
    >
      <el-tab-pane :label="$t('filmCreate.createScriptTab')" name="create">
        <div class="script-pane-inner">
          <div class="script-sub-block">
            <h2 class="section-title">{{ $t('filmCreate.storyGenTitle') }}</h2>
            <p class="section-desc">{{ $t('filmCreate.storyGenDesc') }}</p>
            <el-input
              :model-value="storyInput"
              type="textarea"
              :rows="4"
              :placeholder="$t('filmCreate.storyGenPlaceholder')"
              class="story-textarea"
              @update:model-value="$emit('update:storyInput', $event)"
            />
            <div class="row gap mt-10 fw">
              <el-select
                :model-value="storyStyle"
                :placeholder="$t('filmCreate.storyStyle')"
                clearable
                class="sel-120"
                @update:model-value="$emit('update:storyStyle', $event)"
                @change="$emit('saveProjectSettings', false)"
              >
                <el-option :label="$t('filmCreate.styleModern')" value="modern" />
                <el-option :label="$t('filmCreate.styleAncient')" value="ancient" />
                <el-option :label="$t('filmCreate.styleFantasy')" value="fantasy" />
                <el-option :label="$t('filmCreate.styleDaily')" value="daily" />
              </el-select>
              <el-select
                :model-value="storyType"
                :placeholder="$t('filmCreate.storyType')"
                clearable
                class="sel-120"
                @update:model-value="$emit('update:storyType', $event)"
                @change="$emit('saveProjectSettings', false)"
              >
                <el-option :label="$t('filmCreate.typeDrama')" value="drama" />
                <el-option :label="$t('filmCreate.typeComedy')" value="comedy" />
                <el-option :label="$t('filmCreate.typeAdventure')" value="adventure" />
              </el-select>
              <div class="inline-row-sm">
                <span>{{ $t('filmCreate.episodes') }}</span>
                <el-input-number
                  :model-value="storyEpisodeCount"
                  :min="1"
                  :step="1"
                  :precision="0"
                  controls-position="right"
                  class="inp-num-100"
                  @update:model-value="$emit('update:storyEpisodeCount', $event)"
                />
              </div>
              <el-button type="primary" :loading="isStoryGenRunning" @click="$emit('generateStory')">
                {{ $t('filmCreate.generateScript') }}
              </el-button>
              <el-button plain @click="$emit('openNovelImport')">
                <el-icon><DocumentAdd /></el-icon>
                {{ $t('filmCreate.importNovel') }}
              </el-button>
            </div>
          </div>
          <div class="script-sub-divider" />
          <div id="anchor-script" class="script-sub-block">
            <h2 class="section-title">{{ $t('filmCreate.scriptSection') }}</h2>
            <div class="row gap mb-10 fw">
              <el-select
                :model-value="selectedEpisodeId"
                :placeholder="$t('filmCreate.selectEpisode')"
                clearable
                class="sel-130"
                :disabled="!dramaId"
                @update:model-value="$emit('update:selectedEpisodeId', $event)"
                @change="$emit('episodeSelect', $event)"
              >
                <el-option
                  v-for="ep in (episodes || [])"
                  :key="ep.id"
                  :label="ep.title || $t('filmCreate.episodeNum', { num: ep.episode_number || 0 })"
                  :value="ep.id"
                />
              </el-select>
              <el-input
                :model-value="scriptTitle"
                :placeholder="$t('filmCreate.episodeTitlePlaceholder')"
                class="sel-150"
                @update:model-value="$emit('update:scriptTitle', $event)"
              />
              <el-button v-if="dramaId" class="btn-add-episode" @click="$emit('addEpisode')">
                <el-icon><Plus /></el-icon>{{ $t('filmCreate.addEpisode') }}
              </el-button>
            </div>
            <el-input
              :model-value="scriptContent"
              type="textarea"
              :rows="8"
              :placeholder="$t('filmCreate.scriptContentPlaceholder')"
              class="story-textarea"
              @update:model-value="$emit('update:scriptContent', $event)"
            />
            <div class="row gap mt-8 fw">
              <el-button
                :loading="scriptGenerating"
                :disabled="!!dramaId && (episodes?.length > 0) && !currentEpisodeId"
                @click="$emit('generateScript')"
              >
                {{ $t('filmCreate.saveCurrentEpisode') }}
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('filmCreate.selectScriptTab')" name="select">
        <p class="section-desc script-mode-hint">
          {{ $t('filmCreate.selectScriptHint') }}
        </p>
        <el-button type="primary" @click="$emit('openSelectScript')">
          <el-icon><Document /></el-icon>
          {{ $t('filmCreate.selectExistingScript') }}
        </el-button>
        <div v-if="dramaId && (episodes?.length || storyInput)" class="script-preview-wrap">
          <h3 class="preview-block-title">{{ $t('filmCreate.storyPremise') }}</h3>
          <el-input
            :model-value="storyInput"
            type="textarea"
            :rows="3"
            readonly
            class="story-textarea"
          />
          <template v-if="(episodes || []).length > 1">
            <h3 class="preview-block-title">{{ $t('filmCreate.episodeScripts') }}</h3>
            <el-tabs
              :model-value="selectPreviewEpisodeId"
              class="preview-ep-tabs"
              @update:model-value="$emit('update:selectPreviewEpisodeId', $event)"
            >
              <el-tab-pane
                v-for="ep in (episodes || [])"
                :key="ep.id"
                :label="ep.title || $t('filmCreate.episodeNum', { num: ep.episode_number || 0 })"
                :name="String(ep.id)"
              >
                <el-input
                  :model-value="ep.script_content || ''"
                  type="textarea"
                  :rows="12"
                  readonly
                  class="story-textarea"
                />
              </el-tab-pane>
            </el-tabs>
          </template>
          <template v-else>
            <h3 class="preview-block-title">{{ $t('filmCreate.scriptBody') }}</h3>
            <el-input
              :model-value="scriptContent"
              type="textarea"
              :rows="12"
              readonly
              class="story-textarea"
            />
          </template>
          <div class="preview-actions">
            <el-button type="primary" plain @click="$emit('update:scriptWorkbenchMode', 'create')">
              {{ $t('filmCreate.switchToCreateToEdit') }}
            </el-button>
          </div>
        </div>
        <p v-else class="script-select-empty">{{ $t('filmCreate.noScriptSelected') }}</p>
      </el-tab-pane>
    </el-tabs>
  </section>

  <el-dialog
    :model-value="showSelectScriptDialog"
    :title="$t('filmCreate.importFromScriptLib')"
    width="640px"
    destroy-on-close
    @update:model-value="$emit('update:showSelectScriptDialog', $event)"
    @open="$emit('loadSelectScriptList')"
  >
    <div v-loading="selectScriptLoading || selectScriptImporting" class="select-script-list">
      <div
        v-for="d in selectableScriptDramas"
        :key="d.id"
        class="select-script-item"
        :class="{ disabled: selectScriptImporting }"
        @click="!selectScriptImporting && $emit('pickScript', d.id)"
      >
        <div class="select-script-title">{{ d.title || $t('filmCreate.unnamed') }}</div>
        <div class="select-script-desc">{{ (d.description || $t('filmCreate.noIntro')).slice(0, 200) }}{{ (d.description && d.description.length > 200) ? '…' : '' }}</div>
      </div>
      <div v-if="!selectScriptLoading && selectScriptDramas.length === 0" class="select-script-empty">{{ $t('filmCreate.scriptLibEmpty') }}</div>
      <div v-else-if="!selectScriptLoading && selectableScriptDramas.length === 0" class="select-script-empty">{{ $t('filmCreate.noOtherScripts') }}</div>
    </div>
  </el-dialog>
</template>

<script setup>
import { DocumentAdd, Plus, Document } from '@element-plus/icons-vue'

defineProps({
  dramaId: { type: [Number, String], default: null },
  episodes: { type: Array, default: () => [] },
  currentEpisodeId: { type: [Number, String], default: null },
  selectedEpisodeId: { type: [Number, String], default: null },
  scriptWorkbenchMode: { type: String, default: 'create' },
  storyInput: { type: String, default: '' },
  storyStyle: { type: String, default: '' },
  storyType: { type: String, default: '' },
  storyEpisodeCount: { type: Number, default: 1 },
  scriptTitle: { type: String, default: '' },
  scriptContent: { type: String, default: '' },
  isStoryGenRunning: { type: Boolean, default: false },
  scriptGenerating: { type: Boolean, default: false },
  selectPreviewEpisodeId: { type: String, default: '' },
  selectableScriptDramas: { type: Array, default: () => [] },
  selectScriptDramas: { type: Array, default: () => [] },
  selectScriptLoading: { type: Boolean, default: false },
  selectScriptImporting: { type: Boolean, default: false },
  showSelectScriptDialog: { type: Boolean, default: false },
})

defineEmits([
  'update:scriptWorkbenchMode',
  'update:storyInput',
  'update:storyStyle',
  'update:storyType',
  'update:storyEpisodeCount',
  'update:scriptTitle',
  'update:scriptContent',
  'update:selectedEpisodeId',
  'update:selectPreviewEpisodeId',
  'update:showSelectScriptDialog',
  'saveProjectSettings',
  'generateStory',
  'openNovelImport',
  'episodeSelect',
  'addEpisode',
  'generateScript',
  'openSelectScript',
  'loadSelectScriptList',
  'pickScript',
])
</script>

<style scoped>
.script-workbench-unified {
  margin-bottom: 0;
}
.mt-10 { margin-top: 10px; }
.mb-10 { margin-bottom: 10px; }
.mt-8 { margin-top: 8px; }
.fw { flex-wrap: wrap; }
.sel-120 { min-width: 120px; width: auto; }
.sel-130 { min-width: 130px; width: auto; }
.sel-150 { min-width: 150px; width: auto; }
.inp-num-100 { min-width: 100px; width: auto; }
.inline-row-sm { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.btn-add-episode { margin-left: auto; }
.script-workbench-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.script-workbench-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}
.script-workbench-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 600;
}
.script-pane-inner {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.script-sub-block {
  padding-top: 4px;
}
.script-sub-divider {
  margin: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
:global(html.light) .script-sub-divider {
  border-top-color: rgba(0, 0, 0, 0.08);
}
.script-mode-hint {
  margin-top: 0;
  margin-bottom: 12px;
}
.script-preview-wrap {
  margin-top: 20px;
}
.preview-block-title {
  margin: 16px 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #a1a1aa;
}
:global(html.light) .preview-block-title {
  color: #64748b;
}
.preview-block-title:first-of-type {
  margin-top: 0;
}
.preview-actions {
  margin-top: 16px;
}
.script-select-empty {
  margin-top: 16px;
  color: #71717a;
  font-size: 14px;
}
.select-script-list {
  min-height: 120px;
  max-height: 420px;
  overflow-y: auto;
}
.select-script-item {
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.select-script-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--text-bright);
}
.select-script-item.disabled,
.select-script-item.disabled:hover {
  cursor: not-allowed;
  opacity: 0.55;
  border-color: rgba(255, 255, 255, 0.06);
  background: transparent;
}
:global(html.light) .select-script-item {
  border-color: var(--border-muted);
}
:global(html.light) .select-script-item:hover {
  background: var(--bg-inner);
}
.select-script-title {
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 6px;
}
:global(html.light) .select-script-title {
  color: #1e1b4b;
}
.select-script-desc {
  font-size: 13px;
  color: #9ca0b2;
  line-height: 1.45;
}
.select-script-empty {
  text-align: center;
  color: #71717a;
  padding: 24px;
}
.preview-ep-tabs {
  margin-top: 4px;
}
</style>
