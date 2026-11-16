<template>
  <div id="anchor-props" class="resource-block card">
    <div
      class="collapse-header resource-block-header"
      role="button"
      tabindex="0"
      :aria-expanded="!propsBlockCollapsed"
      @click="propsBlockCollapsed = !propsBlockCollapsed"
      @keydown.enter.prevent="propsBlockCollapsed = !propsBlockCollapsed"
      @keydown.space.prevent="propsBlockCollapsed = !propsBlockCollapsed"
    >
      <h3 class="resource-block-title">{{ $t('filmCreate.propsBlock') }}</h3>
      <el-icon class="collapse-icon"><ArrowUp v-if="!propsBlockCollapsed" /><ArrowDown v-else /></el-icon>
    </div>
    <div v-show="!propsBlockCollapsed" class="resource-block-body">
      <div class="asset-actions">
        <el-button type="primary" size="small" :loading="propsExtracting" :disabled="!currentEpisodeId" @click="$emit('extract-props')">
          {{ $t('filmCreate.extractProps') }}
        </el-button>
        <el-button size="small" :disabled="!dramaId" @click="showAddProp = true">{{ $t('filmCreate.addProp') }}</el-button>
        <el-button size="small" @click="showPropLibrary = true">{{ $t('filmCreate.dramaPropLib') }}</el-button>
      </div>
      <div class="prop-gen-mode">
        <el-checkbox v-model="propUseQuadGrid">{{ $t('filmCreate.propQuadGridCheckbox') }}</el-checkbox>
      </div>
      <div class="asset-list asset-list-two">
        <div v-for="prop in propsList" :key="prop.id" class="asset-item asset-item-left-right">
          <div class="asset-info">
            <div class="asset-name">
              <span>{{ prop.name }}</span>
              <el-dropdown trigger="click" @command="(command) => command === 'delete' && onDeleteProp(prop)">
                <el-button text size="small" class="btn-delete-icon" :title="$t('common.actions')" :aria-label="$t('common.actions')"><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown><el-dropdown-menu><el-dropdown-item command="delete">{{ $t('common.delete') }}</el-dropdown-item></el-dropdown-menu></template>
              </el-dropdown>
            </div>
            <div class="asset-desc-full">{{ prop.description || prop.prompt || $t('common.noDescription') }}</div>
            <div class="asset-btns">
              <el-button size="small" @click="editProp(prop)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" :loading="addingPropToLibraryId === prop.id" :disabled="!mediaComposable.hasAssetImage(prop)" @click="onAddPropToLibrary(prop)">
                {{ $t('common.addToDramaLibShort') }}
              </el-button>
              <el-button size="small" :loading="addingPropToMaterialId === prop.id" :disabled="!mediaComposable.hasAssetImage(prop)" @click="onAddPropToMaterialLibrary(prop)">
                {{ $t('common.addToGlobalLibShort') }}
              </el-button>
            </div>
            <div v-if="getAffectedStoryboards(prop.id).length" class="asset-storyboard-link">
              <span class="asl-label">{{ $t('filmCreate.affectedStoryboards') }}</span>
              <span
                v-for="sb in getAffectedStoryboards(prop.id)"
                :key="sb.id"
                class="asl-chip"
                :title="$t('filmCreate.jumpToStoryboardTip')"
                @click="$emit('scroll-to-storyboard', sb.id)"
              >#{{ sb.storyboard_number }}</span>
              <span v-if="regenSbImagesForAsset.has('prop-' + prop.id) && regenSbImagesProgress['prop-' + prop.id]" class="asl-progress">
                {{ regenSbImagesProgress['prop-' + prop.id].current }}/{{ regenSbImagesProgress['prop-' + prop.id].total }}
              </span>
              <el-button
                size="small"
                class="asl-regen-btn"
                :loading="regenSbImagesForAsset.has('prop-' + prop.id)"
                @click="$emit('regen-affected-sb-images', 'prop-' + prop.id, getAffectedStoryboards(prop.id))"
              >
                <span v-if="!regenSbImagesForAsset.has('prop-' + prop.id)">{{ $t('filmCreate.regenStoryboardImages') }}</span>
              </el-button>
            </div>
          </div>
          <div class="asset-cover-wrap">
            <div
              class="asset-cover"
              :class="{ 'asset-cover--clickable': mediaComposable.hasAssetImage(prop), 'asset-cover--dragover': mediaComposable.dragOverResourceKey.value === 'prop-' + prop.id }"
              role="button"
              tabindex="0"
              @click="mediaComposable.hasAssetImage(prop) && mediaComposable.openImagePreview(mediaComposable.assetImageUrl(prop))"
              @dragover="mediaComposable.onResourceDragOver($event, 'prop', prop.id)"
              @dragleave="mediaComposable.onResourceDragLeave($event, 'prop-' + prop.id)"
              @drop="mediaComposable.onResourceDrop($event, 'prop', prop.id)"
            >
              <img v-if="mediaComposable.hasAssetImage(prop)" :src="mediaComposable.assetImageUrl(prop)" class="cover-img" alt="" />
              <div v-else-if="prop.error_msg || prop.errorMsg" class="cover-placeholder error" :title="prop.error_msg || prop.errorMsg">{{ prop.error_msg || prop.errorMsg }}</div>
              <div v-else class="cover-placeholder">{{ $t('filmCreate.noImage') }}</div>
              <div v-if="mediaComposable.dragOverResourceKey.value === 'prop-' + prop.id" class="asset-cover-drop-hint">{{ $t('filmCreate.releaseToUpload') }}</div>
            </div>
            <div v-if="mediaComposable.parseExtraImages(prop).length" class="extra-images-strip">
              <div v-for="ep in mediaComposable.parseExtraImages(prop)" :key="ep" class="extra-thumb" :title="$t('filmCreate.setAsMainImageTip')">
                <img :src="mediaComposable.localPathToUrl(ep)" alt="" @click="mediaComposable.onSetPrimaryImage('prop', prop, ep)" />
                <button class="thumb-preview-btn" :title="$t('filmCreate.zoomPreview')" :aria-label="$t('filmCreate.zoomPreview')" @click.stop="mediaComposable.openImagePreview(mediaComposable.localPathToUrl(ep))">
                  <el-icon :size="10"><ZoomIn /></el-icon>
                </button>
                <button class="extra-thumb-remove" :title="$t('common.remove')" @click.stop="mediaComposable.onRemoveExtraImage('prop', prop, ep)">×</button>
              </div>
            </div>
            <div class="asset-cover-actions">
              <el-tooltip :content="propUseQuadGrid ? $t('filmCreate.propQuadGridTooltip') : $t('filmCreate.propSingleTooltip')" placement="top">
                <el-button type="primary" size="small" :loading="generatingPropIds.has(prop.id)" @click="onGeneratePropImage(prop, propUseQuadGrid)">
                  <el-icon v-if="!generatingPropIds.has(prop.id)"><MagicStick /></el-icon>
                  {{ $t('filmCreate.aiGenerate') }}
                </el-button>
              </el-tooltip>
              <el-button plain size="small" :loading="mediaComposable.uploadingResourceId.value === 'prop-' + prop.id" @click="mediaComposable.onUploadResourceClick('prop', prop.id)">
                <el-icon v-if="mediaComposable.uploadingResourceId.value !== 'prop-' + prop.id"><Upload /></el-icon>
                {{ $t('common.upload') }}
              </el-button>
            </div>
          </div>
        </div>
        <EmptyState v-if="propsList.length === 0" :description="$t('filmCreate.noPropsEmptyTip')" :action-label="$t('filmCreate.extractProps')" @action="$emit('extract-props')" />
      </div>
    </div>

    <!-- 隐藏参考图上传输入框 -->
    <input ref="addPropRefFileInput" type="file" accept="image/*" class="hidden-file-input" @change="onRefImageFileChange" />
    <input ref="addPropAddRefFileInput" type="file" accept="image/*" class="hidden-file-input" @change="onRefImageFileChange2" />

    <!-- 添加道具弹窗 -->
    <el-dialog v-model="showAddProp" :title="$t('filmCreate.addProp')" width="600px" @close="() => { addPropForm = { name: '', type: '', description: '', prompt: '' }; addPropAddRefImage = null }">
      <el-form label-width="90px">
        <el-form-item :label="$t('filmCreate.refImage')">
          <div class="ref-image-zone">
            <div class="ref-image-box" @click="addPropAddRefFileInput?.click()" @drop.prevent="onRefImageDrop2" @dragover.prevent>
              <img v-if="addPropAddRefImage" :src="addPropAddRefImage.dataUrl" class="ref-preview-img" />
              <div v-else class="ref-upload-hint"><span class="ref-upload-icon">🖼</span><span>{{ $t('filmCreate.clickOrDragRefImage') }}</span></div>
            </div>
            <div v-if="addPropAddRefImage" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingPropAddDesc" @click="doExtractFromRef2('addProp')">{{ $t('filmCreate.extractFeatures') }}</el-button>
              <el-button size="small" @click="addPropAddRefImage = null">{{ $t('common.remove') }}</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="$t('common.name')" required>
          <el-input v-model="addPropForm.name" :placeholder="$t('filmCreate.propNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.propType')">
          <el-input v-model="addPropForm.type" :placeholder="$t('filmCreate.propTypePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="addPropForm.description" type="textarea" :rows="3" :placeholder="$t('common.description')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.imageToImagePrompt')">
          <el-input v-model="addPropForm.prompt" type="textarea" :rows="2" :placeholder="$t('filmCreate.propPromptPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddProp = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="addPropSaving" :disabled="!addPropForm.name.trim()" @click="submitAddProp">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑道具弹窗 -->
    <el-dialog v-model="showEditProp" :title="editPropForm?.id ? $t('filmCreate.editProp') : $t('filmCreate.addProp')" width="75%" @close="onClosePropDialog">
      <el-form v-if="editPropForm" label-width="90px">
        <el-form-item :label="$t('filmCreate.refImage')">
          <div class="ref-image-zone">
            <div class="ref-image-box" @click="addPropRefFileInput?.click()" @drop.prevent="onRefImageDrop" @dragover.prevent>
              <img v-if="addPropRefImage" :src="addPropRefImage.dataUrl" class="ref-preview-img" />
              <img v-else-if="editPropForm.ref_image"
                :src="editPropForm.ref_image.startsWith('http') ? editPropForm.ref_image : '/static/' + editPropForm.ref_image"
                class="ref-preview-img" />
              <img v-else-if="editPropForm.id && (editPropForm.image_url || editPropForm.local_path)"
                :src="mediaComposable.assetImageUrl(editPropForm)" class="ref-preview-img ref-preview-img--dim" />
              <div v-else class="ref-upload-hint"><span class="ref-upload-icon">🖼</span><span>{{ $t('filmCreate.clickOrDragRefImage') }}</span></div>
            </div>
            <div v-if="addPropRefImage" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingPropDesc" @click="doExtractFromRef">{{ $t('filmCreate.extractFeatures') }}</el-button>
              <el-button size="small" @click="addPropRefImage = null">{{ $t('common.remove') }}</el-button>
            </div>
            <div v-else-if="editPropForm.ref_image" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingPropDesc" @click="doExtractPropFromImage">{{ $t('filmCreate.extractDescFromRef') }}</el-button>
              <el-button size="small" @click="clearPropRefImage">{{ $t('filmCreate.removeRefImage') }}</el-button>
            </div>
            <div v-else-if="editPropForm.id && (editPropForm.image_url || editPropForm.local_path) && !editPropForm.description" class="ref-actions">
              <el-button size="small" :loading="extractingPropDesc" @click="doExtractPropFromImage">{{ $t('filmCreate.extractDescFromMain') }}</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="$t('common.name')" required>
          <el-input v-model="editPropForm.name" :placeholder="$t('filmCreate.propNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.propType')">
          <el-input v-model="editPropForm.type" :placeholder="$t('filmCreate.propTypePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="editPropForm.description" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :placeholder="$t('filmCreate.propDescPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.imageToImagePrompt')">
          <div class="prop-prompt-wrapper">
            <div class="prop-prompt-header">
              <span class="prop-prompt-tip">{{ $t('filmCreate.propPromptTip') }}</span>
              <el-button size="small" :loading="editPropPromptGenerating" @click="doGeneratePropPrompt">{{ $t('filmCreate.regenPrompt') }}</el-button>
            </div>
            <el-input
              v-model="editPropForm.prompt"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 16 }"
              :placeholder="editPropPromptGenerating ? $t('filmCreate.generatingPromptWait') : $t('filmCreate.regenPromptOrInputPlaceholder')"
              :disabled="editPropPromptGenerating"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditProp = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editPropSaving" :disabled="!editPropForm?.name?.trim()" @click="submitEditProp">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 道具资源库 -->
    <el-dialog v-model="showPropLibrary" :title="$t('filmCreate.propLibTitle')" width="720px" destroy-on-close class="library-dialog" @open="onPropLibraryDialogOpen">
      <el-tabs v-model="propLibraryTab" class="char-library-tabs" @tab-change="onPropLibraryTabChange">
        <el-tab-pane :label="$t('filmCreate.dramaPropLibTab')" name="library">
          <div class="library-toolbar">
            <el-input v-model="propLibraryKeyword" :placeholder="$t('filmCreate.searchNameOrDesc')" clearable class="library-search-input" @input="debouncedLoadPropLibrary()" />
          </div>
          <div v-loading="propLibraryLoading" class="library-list">
            <div v-for="item in propLibraryList" :key="'plib-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.name || $t('library.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isPropAddToEpisodeLoading('library', item.id)" :disabled="!currentEpisodeId" @click="onAddPropFromLibrary(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                  <el-button size="small" @click="openEditPropLibrary(item)">{{ $t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="onDeletePropLibrary(item)">{{ $t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!propLibraryLoading && propLibraryList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaPropLib') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="propLibraryPage" v-model:page-size="propLibraryPageSize" :total="propLibraryTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadPropLibraryList" @size-change="loadPropLibraryList" />
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('filmCreate.dramaAllPropTab')" name="drama">
          <div class="library-toolbar">
            <el-input v-model="dramaAllPropKeyword" :placeholder="$t('filmCreate.searchNameOrDesc')" clearable class="library-search-input" @input="debouncedLoadDramaAllPropList()" />
          </div>
          <div v-loading="dramaAllPropLoading" class="library-list">
            <div v-for="item in dramaAllPropList" :key="'pdr-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.name || $t('library.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isPropAddToEpisodeLoading('drama', item.id)" :disabled="!currentEpisodeId" @click="onAddDramaPropToEpisode(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!dramaAllPropLoading && dramaAllPropList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaAllProp') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="dramaAllPropPage" v-model:page-size="dramaAllPropPageSize" :total="dramaAllPropTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadDramaAllPropList" @size-change="loadDramaAllPropList" />
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showPropLibrary = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑公共道具 -->
    <el-dialog v-model="showEditPropLibrary" :title="$t('filmCreate.editPublicProp')" width="440px" @close="editPropLibraryForm = null">
      <el-form v-if="editPropLibraryForm" label-width="80px">
        <el-form-item :label="$t('common.name')">
          <el-input v-model="editPropLibraryForm.name" :placeholder="$t('filmCreate.propNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.categoryLabel')">
          <el-input v-model="editPropLibraryForm.category" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="editPropLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.tagsLabel')">
          <el-input v-model="editPropLibraryForm.tags" :placeholder="$t('filmCreate.tagsPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditPropLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editPropLibrarySaving" @click="submitEditPropLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown, Delete, MoreFilled, ZoomIn, MagicStick, Upload } from '@element-plus/icons-vue'
import EmptyState from './EmptyState.vue'
import { t } from '@/i18n'
import { uploadAPI } from '@/api/upload'

const props = defineProps({
  dramaId: { type: [Number, String], default: null },
  currentEpisodeId: { type: [Number, String], default: null },
  propsList: { type: Array, default: () => [] },
  propComposable: { type: Object, required: true },
  mediaComposable: { type: Object, required: true },
  getAffectedStoryboards: { type: Function, default: () => [] },
  regenSbImagesForAsset: { type: Object, default: () => new Set() },
  regenSbImagesProgress: { type: Object, default: () => ({}) },
})

defineEmits(['extract-props', 'regen-affected-sb-images', 'scroll-to-storyboard'])

const propsBlockCollapsed = ref(false)
const propUseQuadGrid = ref(false)

const {
  showAddProp, addPropSaving, addPropForm,
  showEditProp, editPropForm, editPropSaving, editPropPromptGenerating,
  extractingPropDesc, addPropRefImage,
  addPropAddRefImage, extractingPropAddDesc,
  propsExtracting, generatingPropIds,
  showPropLibrary, propLibraryList, propLibraryLoading, propLibraryPage, propLibraryPageSize,
  propLibraryTotal, propLibraryKeyword, propLibraryTab,
  dramaAllPropList, dramaAllPropLoading, dramaAllPropPage, dramaAllPropPageSize, dramaAllPropTotal, dramaAllPropKeyword,
  showEditPropLibrary, editPropLibraryForm,
  editPropLibrarySaving, addingPropToLibraryId, addingPropToMaterialId,
  editProp, doGeneratePropPrompt,
  clearPropRefImage, doExtractPropFromImage, submitEditProp, submitAddProp,
  onClosePropDialog, onDeleteProp, onGeneratePropImage,
  onPropLibraryDialogOpen, onPropLibraryTabChange, isPropAddToEpisodeLoading,
  openEditPropLibrary, submitEditPropLibrary,
  onDeletePropLibrary, onAddPropToLibrary, onAddPropToMaterialLibrary,
  onAddPropFromLibrary, onAddDramaPropToEpisode,
  loadPropLibraryList, debouncedLoadPropLibrary, loadDramaAllPropList, debouncedLoadDramaAllPropList,
  doExtractFromRef2,
} = props.propComposable

const addPropRefFileInput = ref(null)
const addPropAddRefFileInput = ref(null)

async function onRefImageFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  addPropRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
  event.target.value = ''
}

async function onRefImageDrop(event) {
  const file = props.mediaComposable.getFirstImageFile(event.dataTransfer)
  if (!file) return
  addPropRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
}

async function onRefImageFileChange2(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  addPropAddRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
  event.target.value = ''
}

async function onRefImageDrop2(event) {
  const file = props.mediaComposable.getFirstImageFile(event.dataTransfer)
  if (!file) return
  addPropAddRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
}

async function doExtractFromRef() {
  const refImage = addPropRefImage.value
  if (!refImage) return
  extractingPropDesc.value = true
  try {
    const name = editPropForm.value?.name || ''
    const res = await uploadAPI.extractDescriptionFromImage('prop', refImage.dataUrl, name)
    if (res?.description && editPropForm.value) {
      editPropForm.value.description = res.description
      ElMessage.success(t('filmCreate.msgFeatureDescExtracted'))
    }
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.msgVisionModelMissing'))
  } finally {
    extractingPropDesc.value = false
  }
}
</script>

<style scoped>
.prop-gen-mode {
  margin: 8px 0;
  font-size: 13px;
}
.prop-prompt-wrapper {
  width: 100%;
}
.prop-prompt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.prop-prompt-tip {
  font-size: 12px;
  color: var(--text-muted);
}
</style>

