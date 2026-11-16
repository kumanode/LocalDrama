<template>
  <div id="anchor-scenes" class="resource-block card">
    <div class="collapse-header resource-block-header" @click="scenesBlockCollapsed = !scenesBlockCollapsed">
      <h3 class="resource-block-title">{{ $t('filmCreate.scenesBlock') }}</h3>
      <el-icon class="collapse-icon"><ArrowUp v-if="!scenesBlockCollapsed" /><ArrowDown v-else /></el-icon>
    </div>
    <div v-show="!scenesBlockCollapsed" class="resource-block-body">
      <div class="asset-actions">
        <el-button type="primary" size="small" :loading="scenesExtracting" :disabled="!currentEpisodeId" @click="$emit('extract-scenes')">
          {{ $t('filmCreate.extractScenes') }}
        </el-button>
        <el-button size="small" :disabled="!dramaId" @click="openAddScene">{{ $t('filmCreate.addScene') }}</el-button>
        <el-button size="small" @click="showSceneLibrary = true">{{ $t('filmCreate.dramaSceneLib') }}</el-button>
      </div>
      <div class="scene-gen-mode" style="margin: 8px 0; font-size: 13px;">
        <el-checkbox v-model="sceneUseQuadGrid">{{ $t('filmCreate.sceneQuadGridCheckbox') }}</el-checkbox>
      </div>
      <div class="asset-list asset-list-two">
        <div v-for="scene in scenes" :key="scene.id" class="asset-item asset-item-left-right">
          <div class="asset-info">
            <div class="asset-name">
              <span>{{ scene.location }}</span>
              <el-button type="danger" text size="small" class="btn-delete-icon" :title="$t('common.delete')" @click="onDeleteScene(scene)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="asset-desc-full">{{ scene.description || scene.prompt || scene.time || $t('common.noDescription') }}</div>
            <div class="asset-btns">
              <el-button size="small" @click="editScene(scene)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" :loading="addingSceneToLibraryId === scene.id" :disabled="!mediaComposable.hasAssetImage(scene)" @click="onAddSceneToLibrary(scene)">
                {{ $t('common.addToDramaLibShort') }}
              </el-button>
              <el-button size="small" :loading="addingSceneToMaterialId === scene.id" :disabled="!mediaComposable.hasAssetImage(scene)" @click="onAddSceneToMaterialLibrary(scene)">
                {{ $t('common.addToGlobalLibShort') }}
              </el-button>
            </div>
            <div v-if="getAffectedStoryboards(scene.id).length" class="asset-storyboard-link">
              <span class="asl-label">{{ $t('filmCreate.affectedStoryboards') }}</span>
              <span
                v-for="sb in getAffectedStoryboards(scene.id)"
                :key="sb.id"
                class="asl-chip"
                :title="$t('filmCreate.jumpToStoryboardTip')"
                @click="$emit('scroll-to-storyboard', sb.id)"
              >#{{ sb.storyboard_number }}</span>
              <span v-if="regenSbImagesForAsset.has('scene-' + scene.id) && regenSbImagesProgress['scene-' + scene.id]" class="asl-progress">
                {{ regenSbImagesProgress['scene-' + scene.id].current }}/{{ regenSbImagesProgress['scene-' + scene.id].total }}
              </span>
              <el-button
                size="small"
                class="asl-regen-btn"
                :loading="regenSbImagesForAsset.has('scene-' + scene.id)"
                @click="$emit('regen-affected-sb-images', 'scene-' + scene.id, getAffectedStoryboards(scene.id))"
              >
                <span v-if="!regenSbImagesForAsset.has('scene-' + scene.id)">{{ $t('filmCreate.regenStoryboardImages') }}</span>
              </el-button>
            </div>
          </div>
          <div class="asset-cover-wrap">
            <div
              class="asset-cover"
              :class="{ 'asset-cover--clickable': mediaComposable.hasAssetImage(scene), 'asset-cover--dragover': mediaComposable.dragOverResourceKey.value === 'scene-' + scene.id }"
              role="button"
              tabindex="0"
              @click="mediaComposable.hasAssetImage(scene) && mediaComposable.openImagePreview(mediaComposable.assetImageUrl(scene))"
              @dragover="mediaComposable.onResourceDragOver($event, 'scene', scene.id)"
              @dragleave="mediaComposable.onResourceDragLeave($event, 'scene-' + scene.id)"
              @drop="mediaComposable.onResourceDrop($event, 'scene', scene.id)"
            >
              <img v-if="mediaComposable.hasAssetImage(scene)" :src="mediaComposable.assetImageUrl(scene)" class="cover-img" alt="" />
              <div v-else-if="scene.error_msg || scene.errorMsg" class="cover-placeholder error" :title="scene.error_msg || scene.errorMsg">{{ scene.error_msg || scene.errorMsg }}</div>
              <div v-else class="cover-placeholder">{{ $t('filmCreate.noImage') }}</div>
              <div v-if="mediaComposable.dragOverResourceKey.value === 'scene-' + scene.id" class="asset-cover-drop-hint">{{ $t('filmCreate.releaseToUpload') }}</div>
            </div>
            <div v-if="mediaComposable.parseExtraImages(scene).length" class="extra-images-strip">
              <div v-for="ep in mediaComposable.parseExtraImages(scene)" :key="ep" class="extra-thumb" :title="$t('filmCreate.setAsMainImageTip')">
                <img :src="mediaComposable.localPathToUrl(ep)" alt="" @click="mediaComposable.onSetPrimaryImage('scene', scene, ep)" />
                <button class="thumb-preview-btn" :title="$t('filmCreate.zoomPreview')" @click.stop="mediaComposable.openImagePreview(mediaComposable.localPathToUrl(ep))">
                  <el-icon :size="10"><ZoomIn /></el-icon>
                </button>
                <button class="extra-thumb-remove" :title="$t('common.remove')" @click.stop="mediaComposable.onRemoveExtraImage('scene', scene, ep)">×</button>
              </div>
            </div>
            <div class="asset-cover-actions">
              <el-tooltip :content="sceneUseQuadGrid ? $t('filmCreate.sceneQuadGridTooltip') : $t('filmCreate.sceneSingleTooltip')" placement="top">
                <el-button type="primary" size="small" :loading="generatingSceneIds.has(scene.id)" @click="onGenerateSceneImage(scene, sceneUseQuadGrid)">
                  <el-icon v-if="!generatingSceneIds.has(scene.id)"><MagicStick /></el-icon>
                  {{ $t('filmCreate.aiGenerate') }}
                </el-button>
              </el-tooltip>
              <el-button type="success" size="small" :loading="mediaComposable.uploadingResourceId.value === 'scene-' + scene.id" @click="mediaComposable.onUploadResourceClick('scene', scene.id)">
                <el-icon v-if="mediaComposable.uploadingResourceId.value !== 'scene-' + scene.id"><Upload /></el-icon>
                {{ $t('common.upload') }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="scenes.length === 0" class="empty-tip">{{ $t('filmCreate.noScenesEmptyTip') }}</div>
      </div>
    </div>

    <!-- 隐藏参考图上传输入框 -->
    <input ref="addSceneRefFileInput" type="file" accept="image/*" style="display:none" @change="onRefImageFileChange" />

    <!-- 添加/编辑场景弹窗 -->
    <el-dialog v-model="showEditScene" :title="editSceneForm?.id ? $t('filmCreate.editScene') : $t('filmCreate.addScene')" width="75%" @close="onCloseSceneDialog">
      <el-form v-if="editSceneForm" label-width="90px">
        <el-form-item :label="$t('filmCreate.refImage')">
          <div class="ref-image-zone">
            <div class="ref-image-box" @click="addSceneRefFileInput?.click()" @drop.prevent="onRefImageDrop" @dragover.prevent>
              <img v-if="addSceneRefImage" :src="addSceneRefImage.dataUrl" class="ref-preview-img" />
              <img v-else-if="editSceneForm.ref_image"
                :src="editSceneForm.ref_image.startsWith('http') ? editSceneForm.ref_image : '/static/' + editSceneForm.ref_image"
                class="ref-preview-img" />
              <img v-else-if="editSceneForm.id && (editSceneForm.image_url || editSceneForm.local_path)"
                :src="mediaComposable.assetImageUrl(editSceneForm)" class="ref-preview-img" style="opacity:0.5" />
              <div v-else class="ref-upload-hint"><span class="ref-upload-icon">🖼</span><span>{{ $t('filmCreate.clickOrDragRefImage') }}</span></div>
            </div>
            <div v-if="addSceneRefImage" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingSceneDesc" @click="doExtractFromRef">{{ $t('filmCreate.extractFeatures') }}</el-button>
              <el-button size="small" @click="addSceneRefImage = null">{{ $t('common.remove') }}</el-button>
            </div>
            <div v-else-if="editSceneForm.ref_image" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingSceneDesc" @click="doExtractSceneFromImage">{{ $t('filmCreate.extractDescFromRef') }}</el-button>
              <el-button size="small" @click="clearSceneRefImage">{{ $t('filmCreate.removeRefImage') }}</el-button>
            </div>
            <div v-else-if="editSceneForm.id && (editSceneForm.image_url || editSceneForm.local_path) && !editSceneForm.prompt" class="ref-actions">
              <el-button size="small" :loading="extractingSceneDesc" @click="doExtractSceneFromImage">{{ $t('filmCreate.extractDescFromMain') }}</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="$t('filmCreate.locationLabel')" required>
          <el-input v-model="editSceneForm.location" :placeholder="$t('filmCreate.locationPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.timeLabel')">
          <el-input v-model="editSceneForm.time" :placeholder="$t('filmCreate.timePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.sceneDescLabel')">
          <el-input v-model="editSceneForm.prompt" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :placeholder="$t('filmCreate.sceneDescPlaceholder')" />
        </el-form-item>
        <el-form-item v-if="editSceneForm.id">
          <template #label>
            <span style="font-size:12px;line-height:1.4;white-space:normal;word-break:break-all;display:inline-block;width:90px">{{ $t('filmCreate.singleImagePrompt') }}</span>
          </template>
          <div style="width:100%">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:12px;color:#909399">{{ $t('filmCreate.singleImagePromptTip') }}</span>
              <el-button size="small" :loading="editScenePromptGenerating" @click="doGenerateSceneSinglePrompt">{{ $t('filmCreate.regenPrompt') }}</el-button>
            </div>
            <el-input
              v-model="editSceneForm.polished_prompt_single"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 16 }"
              :placeholder="$t('filmCreate.singleScenePromptPlaceholder')"
              style="font-size:12px"
            />
          </div>
        </el-form-item>
        <el-form-item v-if="editSceneForm.id">
          <template #label>
            <span style="font-size:12px;line-height:1.4;white-space:normal;word-break:break-all;display:inline-block;width:90px">{{ $t('filmCreate.quadViewPrompt') }}</span>
          </template>
          <div style="width:100%">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:12px;color:#909399">{{ $t('filmCreate.quadViewPromptTip') }}</span>
              <el-button size="small" :loading="editScenePromptGenerating" @click="doGenerateScenePrompt">{{ $t('filmCreate.regenPrompt') }}</el-button>
            </div>
            <el-input
              v-model="editSceneForm.polished_prompt"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 16 }"
              :placeholder="editScenePromptGenerating ? $t('filmCreate.generatingQuadPromptWait') : $t('filmCreate.regenPromptOrInputPlaceholder')"
              :disabled="editScenePromptGenerating"
              style="font-size:12px"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditScene = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editSceneSaving" :disabled="!editSceneForm?.location?.trim()" @click="submitEditScene">{{ editSceneForm?.id ? $t('common.save') : $t('common.add') }}</el-button>
      </template>
    </el-dialog>

    <!-- 场景资源库 -->
    <el-dialog v-model="showSceneLibrary" :title="$t('filmCreate.sceneLibTitle')" width="720px" destroy-on-close class="library-dialog" @open="onSceneLibraryDialogOpen">
      <el-tabs v-model="sceneLibraryTab" class="char-library-tabs" @tab-change="onSceneLibraryTabChange">
        <el-tab-pane :label="$t('filmCreate.dramaSceneLibTab')" name="library">
          <div class="library-toolbar">
            <el-input v-model="sceneLibraryKeyword" :placeholder="$t('filmCreate.searchLocationOrDesc')" clearable style="width: 200px" @input="debouncedLoadSceneLibrary()" />
          </div>
          <div v-loading="sceneLibraryLoading" class="library-list">
            <div v-for="item in sceneLibraryList" :key="'slib-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.location || item.time || $t('library.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isSceneAddToEpisodeLoading('library', item.id)" :disabled="!currentEpisodeId" @click="onAddSceneFromLibrary(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                  <el-button size="small" @click="openEditSceneLibrary(item)">{{ $t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="onDeleteSceneLibrary(item)">{{ $t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!sceneLibraryLoading && sceneLibraryList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaSceneLib') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="sceneLibraryPage" v-model:page-size="sceneLibraryPageSize" :total="sceneLibraryTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadSceneLibraryList" @size-change="loadSceneLibraryList" />
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('filmCreate.dramaAllSceneTab')" name="drama">
          <div class="library-toolbar">
            <el-input v-model="dramaAllSceneKeyword" :placeholder="$t('filmCreate.searchLocationOrDesc')" clearable style="width: 200px" @input="debouncedLoadDramaAllSceneList()" />
          </div>
          <div v-loading="dramaAllSceneLoading" class="library-list">
            <div v-for="item in dramaAllSceneList" :key="'sdr-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.location || $t('library.unnamed') }}<span v-if="item.time" class="library-item-sub"> · {{ item.time }}</span></div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isSceneAddToEpisodeLoading('drama', item.id)" :disabled="!currentEpisodeId" @click="onAddDramaSceneToEpisode(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!dramaAllSceneLoading && dramaAllSceneList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaAllScene') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="dramaAllScenePage" v-model:page-size="dramaAllScenePageSize" :total="dramaAllSceneTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadDramaAllSceneList" @size-change="loadDramaAllSceneList" />
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showSceneLibrary = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑公共场景 -->
    <el-dialog v-model="showEditSceneLibrary" :title="$t('filmCreate.editPublicScene')" width="440px" @close="editSceneLibraryForm = null">
      <el-form v-if="editSceneLibraryForm" label-width="80px">
        <el-form-item :label="$t('filmCreate.locationLabel')">
          <el-input v-model="editSceneLibraryForm.location" :placeholder="$t('filmCreate.sceneLocationPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.timeLabel')">
          <el-input v-model="editSceneLibraryForm.time" :placeholder="$t('filmCreate.timeSubPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.categoryLabel')">
          <el-input v-model="editSceneLibraryForm.category" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="editSceneLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.tagsLabel')">
          <el-input v-model="editSceneLibraryForm.tags" :placeholder="$t('filmCreate.tagsPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditSceneLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editSceneLibrarySaving" @click="submitEditSceneLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown, Delete, ZoomIn, MagicStick, Upload } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { uploadAPI } from '@/api/upload'

const props = defineProps({
  dramaId: { type: [Number, String], default: null },
  currentEpisodeId: { type: [Number, String], default: null },
  scenes: { type: Array, default: () => [] },
  sceneComposable: { type: Object, required: true },
  mediaComposable: { type: Object, required: true },
  getAffectedStoryboards: { type: Function, default: () => [] },
  regenSbImagesForAsset: { type: Object, default: () => new Set() },
  regenSbImagesProgress: { type: Object, default: () => ({}) },
})

defineEmits(['extract-scenes', 'regen-affected-sb-images', 'scroll-to-storyboard'])

const scenesBlockCollapsed = ref(false)
const sceneUseQuadGrid = ref(false)

const {
  showEditScene, editSceneForm, editSceneSaving, editScenePromptGenerating,
  extractingSceneDesc, addSceneRefImage,
  scenesExtracting, generatingSceneIds,
  showSceneLibrary, sceneLibraryList, sceneLibraryLoading, sceneLibraryPage, sceneLibraryPageSize,
  sceneLibraryTotal, sceneLibraryKeyword, sceneLibraryTab,
  dramaAllSceneList, dramaAllSceneLoading, dramaAllScenePage, dramaAllScenePageSize, dramaAllSceneTotal, dramaAllSceneKeyword,
  showEditSceneLibrary, editSceneLibraryForm,
  editSceneLibrarySaving, addingSceneToLibraryId, addingSceneToMaterialId,
  openAddScene, editScene, doGenerateScenePrompt, doGenerateSceneSinglePrompt,
  clearSceneRefImage, doExtractSceneFromImage, submitEditScene,
  onCloseSceneDialog, onDeleteScene, onGenerateSceneImage,
  onSceneLibraryDialogOpen, onSceneLibraryTabChange, isSceneAddToEpisodeLoading,
  openEditSceneLibrary, submitEditSceneLibrary,
  onDeleteSceneLibrary, onAddSceneToLibrary, onAddSceneToMaterialLibrary,
  onAddSceneFromLibrary, onAddDramaSceneToEpisode,
  loadSceneLibraryList, debouncedLoadSceneLibrary, loadDramaAllSceneList, debouncedLoadDramaAllSceneList,
} = props.sceneComposable

const addSceneRefFileInput = ref(null)

async function onRefImageFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  addSceneRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
  event.target.value = ''
}

async function onRefImageDrop(event) {
  const file = props.mediaComposable.getFirstImageFile(event.dataTransfer)
  if (!file) return
  addSceneRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
}

async function doExtractFromRef() {
  const refImage = addSceneRefImage.value
  if (!refImage) return
  extractingSceneDesc.value = true
  try {
    const name = editSceneForm.value?.name || ''
    const res = await uploadAPI.extractDescriptionFromImage('scene', refImage.dataUrl, name)
    if (res?.description && editSceneForm.value) {
      editSceneForm.value.prompt = res.description
      ElMessage.success(t('filmCreate.msgFeatureDescExtracted'))
    }
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.msgVisionModelMissing'))
  } finally {
    extractingSceneDesc.value = false
  }
}
</script>
