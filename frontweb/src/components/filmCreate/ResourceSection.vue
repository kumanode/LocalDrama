<template>
  <section class="section card resource-panel">
    <div class="collapse-header" @click="resourcePanelCollapsed = !resourcePanelCollapsed">
      <h2 class="section-title">{{ $t('filmCreate.resourceManagement') }}</h2>
      <el-icon class="collapse-icon"><ArrowUp v-if="!resourcePanelCollapsed" /><ArrowDown v-else /></el-icon>
    </div>
    <div v-show="!resourcePanelCollapsed" class="resource-panel-body">
      <CharacterBlock
        :drama-id="dramaId"
        :current-episode-id="currentEpisodeId"
        :characters="characters"
        :char-composable="charComposable"
        :media-composable="mediaComposable"
        :get-affected-storyboards="getCharAffectedStoryboards"
        :regen-sb-images-for-asset="regenSbImagesForAsset"
        :regen-sb-images-progress="regenSbImagesProgress"
        @generate-characters="$emit('generate-characters')"
        @regen-affected-sb-images="(k, b) => $emit('regen-affected-sb-images', k, b)"
        @scroll-to-storyboard="(id) => $emit('scroll-to-storyboard', id)"
      />

      <PropBlock
        :drama-id="dramaId"
        :current-episode-id="currentEpisodeId"
        :props-list="propsList"
        :prop-composable="propComposable"
        :media-composable="mediaComposable"
        :get-affected-storyboards="getPropAffectedStoryboards"
        :regen-sb-images-for-asset="regenSbImagesForAsset"
        :regen-sb-images-progress="regenSbImagesProgress"
        @extract-props="$emit('extract-props')"
        @regen-affected-sb-images="(k, b) => $emit('regen-affected-sb-images', k, b)"
        @scroll-to-storyboard="(id) => $emit('scroll-to-storyboard', id)"
      />

      <SceneBlock
        :drama-id="dramaId"
        :current-episode-id="currentEpisodeId"
        :scenes="scenes"
        :scene-composable="sceneComposable"
        :media-composable="mediaComposable"
        :get-affected-storyboards="getSceneAffectedStoryboards"
        :regen-sb-images-for-asset="regenSbImagesForAsset"
        :regen-sb-images-progress="regenSbImagesProgress"
        @extract-scenes="$emit('extract-scenes')"
        @regen-affected-sb-images="(k, b) => $emit('regen-affected-sb-images', k, b)"
        @scroll-to-storyboard="(id) => $emit('scroll-to-storyboard', id)"
      />
    </div>

    <!-- 资源上传图片用单例 -->
    <input
      :ref="(el) => { if (mediaComposable) mediaComposable.resourceImageFileInput.value = el }"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden-file-input"
      @change="mediaComposable.onResourceImageFileChange"
    />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import CharacterBlock from './CharacterBlock.vue'
import PropBlock from './PropBlock.vue'
import SceneBlock from './SceneBlock.vue'

defineProps({
  dramaId: { type: [Number, String], default: null },
  currentEpisodeId: { type: [Number, String], default: null },
  characters: { type: Array, default: () => [] },
  propsList: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] },
  charComposable: { type: Object, required: true },
  propComposable: { type: Object, required: true },
  sceneComposable: { type: Object, required: true },
  mediaComposable: { type: Object, required: true },
  getCharAffectedStoryboards: { type: Function, default: () => [] },
  getPropAffectedStoryboards: { type: Function, default: () => [] },
  getSceneAffectedStoryboards: { type: Function, default: () => [] },
  regenSbImagesForAsset: { type: Object, default: () => new Set() },
  regenSbImagesProgress: { type: Object, default: () => ({}) },
})

defineEmits(['generate-characters', 'extract-props', 'extract-scenes', 'regen-affected-sb-images', 'scroll-to-storyboard'])

const resourcePanelCollapsed = ref(false)
</script>

<style scoped>
/* 资源管理大面板 + 可折叠标题 */
.resource-panel {
  padding: 0;
  overflow: hidden;
}
.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.collapse-header:hover {
  background: rgba(255, 255, 255, 0.04);
}
.resource-panel .collapse-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.resource-panel .collapse-header .section-title {
  margin: 0;
}
.collapse-icon {
  font-size: 1.1rem;
  color: #a1a1aa;
  flex-shrink: 0;
  margin-left: 8px;
}
.resource-panel-body {
  padding: 16px 20px 20px;
}
:deep(.resource-block) {
  margin-bottom: 20px;
  padding: 0;
  overflow: hidden;
}
:deep(.resource-block:last-child) {
  margin-bottom: 0;
}
:deep(.resource-block-header) {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
:deep(.resource-block-header .collapse-icon) {
  font-size: 1rem;
}
:deep(.resource-block-title) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #e4e4e7;
}
:deep(html.light .resource-block-title) {
  color: #18181b;
}
:deep(.resource-block-body) {
  padding: 12px 14px 14px;
}
:deep(.resource-block-body .asset-actions) {
  margin-bottom: 12px;
}
:deep(.resource-block-body .asset-list-two) {
  gap: 16px;
}
:deep(.asset-actions) { margin-bottom: 12px; }
:deep(.asset-list) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
:deep(.asset-list-two) {
  grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
  gap: 20px;
}
:deep(.asset-item) {
  background: #22232d;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
:deep(.asset-item-left-right) {
  flex-direction: row;
  align-items: stretch;
}
:deep(.asset-item-left-right .asset-info) {
  flex: 1;
  min-width: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
:deep(.asset-item-left-right .asset-name) {
  font-size: 1.05rem;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
:deep(.asset-item-left-right .asset-name span) { flex: 1; min-width: 0; }
:deep(.asset-item-left-right .asset-desc-full) {
  flex: 1;
  font-size: 0.875rem;
  color: #a1a1aa;
  line-height: 1.5;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
:deep(.asset-item-left-right .asset-cover-wrap) {
  flex-shrink: 0;
  align-self: flex-start;
}
:deep(.asset-item-left-right .asset-cover) {
  width: 200px;
  height: 200px;
}
:deep(.asset-item-left-right .asset-cover.asset-cover--clickable) {
  cursor: pointer;
}
:deep(.asset-cover) {
  width: 100%;
  aspect-ratio: 1;
  background: #2a2b36;
  position: relative;
  overflow: hidden;
}
:deep(.asset-item-left-right .asset-cover .cover-img),
:deep(.cover-img) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
:deep(.cover-placeholder) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a5a66;
  font-size: 0.85rem;
}
:deep(.cover-placeholder.error) {
  background: #450a0a;
  color: #f87171;
  font-size: 0.8rem;
  padding: 8px;
  line-height: 1.4;
  word-break: break-all;
  text-align: center;
}
:deep(.asset-cover--dragover) {
  outline: 2px dashed var(--el-color-primary);
  outline-offset: -2px;
  background: rgba(64, 158, 255, 0.08);
}
:deep(.asset-cover-drop-hint) {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.9rem;
  pointer-events: none;
}
:deep(.asset-info) { padding: 10px; }
:deep(.asset-name) { font-weight: 600; margin-bottom: 4px; color: #e4e4e7; }
:deep(.asset-desc-full) {
  font-size: 0.875rem;
  color: #a1a1aa;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
:deep(.asset-btns) { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
:deep(.btn-delete-icon) { flex-shrink: 0; padding: 2px 4px !important; opacity: 0.45; transition: opacity 0.15s; }
:deep(.btn-delete-icon:hover) { opacity: 1; }
:deep(.asset-cover-wrap) {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 200px;
}
:deep(.asset-cover-actions) {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
:deep(.asset-cover-actions .el-button) { flex: 1; justify-content: center; }
:deep(html.light .asset-cover-actions) { border-top-color: rgba(139,92,246,0.1); }
:deep(.extra-images-strip) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 5px 8px;
  background: rgba(0,0,0,0.15);
}
:deep(.extra-thumb) {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: border-color 0.15s;
}
:deep(.extra-thumb:hover) { border-color: #a78bfa; }
:deep(.extra-thumb img) { width: 100%; height: 100%; object-fit: cover; display: block; }
:deep(.extra-thumb-remove) {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  background: rgba(239,68,68,0.85);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
:deep(.thumb-preview-btn) {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 16px;
  height: 16px;
  background: rgba(59,130,246,0.85);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 9px;
  line-height: 1;
  text-align: center;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.thumb-preview-btn .el-icon),
:deep(.thumb-preview-btn svg) {
  width: 10px;
  height: 10px;
}
:deep(.extra-thumb:hover .extra-thumb-remove),
:deep(.extra-thumb:hover .thumb-preview-btn) { opacity: 1; }
:deep(html.light .extra-images-strip) { background: rgba(139,92,246,0.05); }
:deep(.empty-tip) {
  color: #5a5a66;
  font-size: 0.9rem;
  padding: 16px 0;
}
:deep(html.light .asset-item) {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: none;
}
:deep(html.light .asset-item:hover) {
  border-color: var(--border-muted);
  box-shadow: none;
  transition: border-color var(--dur-fast) var(--ease-mech);
}
:deep(html.light .asset-cover) { background: #f3f4f6; }
:deep(html.light .asset-name) { color: #18181b; }
:deep(html.light .asset-desc-full) { color: #6b7280; }
:deep(html.light .cover-placeholder) { color: #9ca3af; background: #f3f4f6; }
:deep(html.light .cover-placeholder.error) { background: #fef2f2; color: #dc2626; }
:deep(html.light .empty-tip) { color: #9ca3af; }

/* 关联分镜 chip */
:deep(.asset-storyboard-link) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 6px;
  min-height: 28px;
}
:deep(.asl-label) {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}
:deep(.asl-chip) {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
:deep(.asl-chip:hover) {
  background: rgba(99, 102, 241, 0.28);
  box-shadow: 0 0 6px rgba(99, 102, 241, 0.4);
  color: #c7d2fe;
}
:deep(.asl-regen-btn) {
  margin-left: auto !important;
  flex-shrink: 0;
  height: 22px !important;
  padding: 0 10px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  background: rgba(251, 146, 60, 0.15) !important;
  border: 1px solid rgba(251, 146, 60, 0.5) !important;
  color: #fb923c !important;
  border-radius: 11px !important;
  transition: background 0.15s, box-shadow 0.15s !important;
}
:deep(.asl-regen-btn:not(.is-loading):hover) {
  background: rgba(251, 146, 60, 0.28) !important;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.35) !important;
  color: #fdba74 !important;
}
:deep(.asl-progress) {
  font-size: 11px;
  color: #fb923c;
  margin-left: 4px;
  flex-shrink: 0;
}

/* 参考图上传区 */
:deep(.ref-image-zone) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
:deep(.ref-image-box) {
  width: 120px;
  height: 120px;
  border: 2px dashed #c0c4cc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #fafafa;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
:deep(.ref-image-box:hover) {
  border-color: var(--el-color-primary);
}
:deep(.ref-preview-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
:deep(.ref-upload-hint) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  padding: 8px;
}
:deep(.ref-upload-icon) {
  font-size: 28px;
  line-height: 1;
}
:deep(.ref-actions) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 资源库弹窗通用样式 */
:deep(.library-dialog .el-dialog__body) { padding-top: 8px; }
:deep(.sd2-cert-dialog .el-dialog__body) { padding-top: 10px; }
:deep(.sd2-cert-desc .el-descriptions__cell) {
  font-size: 12px;
  word-break: break-all;
}
:deep(.sd2-cert-value) {
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}
:deep(.library-toolbar) { margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
:deep(.library-item-sub) { font-size: 12px; color: var(--el-text-color-secondary); font-weight: normal; }
:deep(.library-list) {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
:deep(.library-item) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}
:deep(.library-item-cover) {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
:deep(.library-item-cover img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
:deep(.library-item-placeholder) {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
:deep(.library-item-info) { flex: 1; min-width: 0; }
:deep(.library-item-name) { font-weight: 500; margin-bottom: 4px; }
:deep(.library-item-desc) { font-size: 0.85rem; color: #7a7a88; margin-bottom: 8px; }
:deep(.library-item-actions) { display: flex; gap: 8px; }
:deep(.library-empty) {
  text-align: center;
  padding: 32px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
:deep(.library-pagination) {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
