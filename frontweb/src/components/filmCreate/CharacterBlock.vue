<template>
  <div id="anchor-characters" class="resource-block card">
    <div
      class="collapse-header resource-block-header"
      role="button"
      tabindex="0"
      :aria-expanded="!charactersBlockCollapsed"
      @click="charactersBlockCollapsed = !charactersBlockCollapsed"
      @keydown.enter.prevent="charactersBlockCollapsed = !charactersBlockCollapsed"
      @keydown.space.prevent="charactersBlockCollapsed = !charactersBlockCollapsed"
    >
      <h3 class="resource-block-title">{{ $t('filmCreate.charactersBlock') }}</h3>
      <el-icon class="collapse-icon"><ArrowUp v-if="!charactersBlockCollapsed" /><ArrowDown v-else /></el-icon>
    </div>
    <div v-show="!charactersBlockCollapsed" class="resource-block-body">
      <div class="asset-actions">
        <el-button type="primary" size="small" :loading="charactersGenerating" :disabled="!dramaId" @click="$emit('generate-characters')">
          {{ $t('filmCreate.autoExtractCharacters') }}
        </el-button>
        <el-button size="small" :disabled="!dramaId" @click="openAddCharacter">{{ $t('filmCreate.addCharacter') }}</el-button>
        <el-button size="small" @click="showCharLibrary = true">{{ $t('filmCreate.dramaCharLib') }}</el-button>
      </div>
      <div class="asset-list asset-list-two">
        <div v-for="char in characters" :key="char.id" class="asset-item asset-item-left-right">
          <div class="asset-info">
            <div class="asset-name">
              <span class="asset-name-inner">
                <span class="asset-name-text">{{ char.name }}</span>
                <el-tag v-if="char.role" size="small" effect="plain" :type="char.role === 'main' ? 'danger' : char.role === 'supporting' ? 'warning' : 'info'" class="char-role-tag">{{ charRoleLabel(char.role) }}</el-tag>
              </span>
              <el-dropdown trigger="click" @command="(command) => command === 'delete' && onDeleteCharacter(char)">
                <el-button text size="small" class="btn-delete-icon" :title="$t('common.actions')" :aria-label="$t('common.actions')">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown><el-dropdown-menu><el-dropdown-item command="delete" class="text-danger">{{ $t('common.delete') }}</el-dropdown-item></el-dropdown-menu></template>
              </el-dropdown>
            </div>
            <div class="asset-desc-full">{{ char.appearance || char.description || $t('common.noDescription') }}</div>
            <div class="asset-btns">
              <el-button size="small" @click="editCharacter(char)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" :loading="addingCharToLibraryId === char.id" :disabled="!mediaComposable.hasAssetImage(char)" @click="onAddCharacterToLibrary(char)">
                {{ $t('common.addToDramaLibShort') }}
              </el-button>
              <el-button size="small" :loading="addingCharToMaterialId === char.id" :disabled="!mediaComposable.hasAssetImage(char)" @click="onAddCharacterToMaterialLibrary(char)">
                {{ $t('common.addToGlobalLibShort') }}
              </el-button>
              <el-button
                size="small"
                :type="char.seedance2_asset?.status === 'active' ? 'success' : 'warning'"
                plain
                :loading="sd2CertifyingId === char.id"
                :disabled="!mediaComposable.hasAssetImage(char)"
                @click="onSd2PrimaryAction(char)"
              >
                {{ sd2ActionLabel(char) }}
              </el-button>
            </div>

            <!-- Seedance 2.0 音色参考 -->
            <div class="sd2-voice-row">
              <template v-if="char.seedance2_voice_asset?.status === 'active'">
                <el-button size="small" type="success" plain @click="playSd2Voice(char)">
                  <el-icon><VideoPlay /></el-icon>
                  <span class="sd2-voice-btn-text">{{ $t('filmCreate.voiceSample') }}</span>
                </el-button>
                <el-button size="small" type="primary" plain :loading="sd2VoiceUploadingId === char.id" @click="onSd2VoiceReplace(char)">
                  {{ $t('filmCreate.replaceVoice') }}
                </el-button>
                <span class="sd2-voice-status--active">{{ $t('filmCreate.voiceConfigured') }}</span>
              </template>
              <template v-else>
                <el-button
                  size="small"
                  :type="char.seedance2_voice_asset?.status === 'stale' ? 'warning' : 'info'"
                  plain
                  :loading="sd2VoiceUploadingId === char.id"
                  @click="onSd2VoicePrimaryAction(char)"
                >
                  {{ sd2VoiceActionLabel(char) }}
                </el-button>
                <span v-if="char.seedance2_voice_asset?.status === 'stale'" class="sd2-voice-status--stale">{{ $t('filmCreate.needRefresh') }}</span>
              </template>
              <span class="sd2-voice-note">{{ $t('filmCreate.seedance2Only') }}</span>
            </div>
            <div v-if="getAffectedStoryboards(char.id).length" class="asset-storyboard-link">
              <span class="asl-label">{{ $t('filmCreate.affectedStoryboards') }}</span>
              <span
                v-for="sb in getAffectedStoryboards(char.id)"
                :key="sb.id"
                class="asl-chip"
                :title="$t('filmCreate.jumpToStoryboardTip')"
                @click="$emit('scroll-to-storyboard', sb.id)"
              >#{{ sb.storyboard_number }}</span>
              <span v-if="regenSbImagesForAsset.has('char-' + char.id) && regenSbImagesProgress['char-' + char.id]" class="asl-progress">
                {{ regenSbImagesProgress['char-' + char.id].current }}/{{ regenSbImagesProgress['char-' + char.id].total }}
              </span>
              <el-button
                size="small"
                class="asl-regen-btn"
                :loading="regenSbImagesForAsset.has('char-' + char.id)"
                @click="$emit('regen-affected-sb-images', 'char-' + char.id, getAffectedStoryboards(char.id))"
              >
                <span v-if="!regenSbImagesForAsset.has('char-' + char.id)">{{ $t('filmCreate.regenStoryboardImages') }}</span>
              </el-button>
            </div>
          </div>
          <div class="asset-cover-wrap">
            <div
              class="asset-cover"
              :class="{ 'asset-cover--clickable': mediaComposable.hasAssetImage(char), 'asset-cover--dragover': mediaComposable.dragOverResourceKey.value === 'char-' + char.id }"
              role="button"
              tabindex="0"
              @click="mediaComposable.hasAssetImage(char) && mediaComposable.openImagePreview(mediaComposable.assetImageUrl(char))"
              @dragover="mediaComposable.onResourceDragOver($event, 'character', char.id)"
              @dragleave="mediaComposable.onResourceDragLeave($event, 'char-' + char.id)"
              @drop="mediaComposable.onResourceDrop($event, 'character', char.id)"
            >
              <img v-if="mediaComposable.hasAssetImage(char)" :src="mediaComposable.assetImageUrl(char)" class="cover-img" alt="" />
              <div v-else-if="char.error_msg || char.errorMsg" class="cover-placeholder error" :title="char.error_msg || char.errorMsg">{{ char.error_msg || char.errorMsg }}</div>
              <div v-else class="cover-placeholder">{{ $t('filmCreate.noImage') }}</div>
              <div v-if="mediaComposable.dragOverResourceKey.value === 'char-' + char.id" class="asset-cover-drop-hint">{{ $t('filmCreate.releaseToUpload') }}</div>
            </div>
            <!-- 额外参考图条 -->
            <div v-if="mediaComposable.parseExtraImages(char).length" class="extra-images-strip">
              <div v-for="ep in mediaComposable.parseExtraImages(char)" :key="ep" class="extra-thumb" :title="$t('filmCreate.setAsMainImageTip')">
                <img :src="mediaComposable.localPathToUrl(ep)" alt="" @click="mediaComposable.onSetPrimaryImage('character', char, ep)" />
                <button class="thumb-preview-btn" :title="$t('filmCreate.zoomPreview')" :aria-label="$t('filmCreate.zoomPreview')" @click.stop="mediaComposable.openImagePreview(mediaComposable.localPathToUrl(ep))">
                  <el-icon :size="10"><ZoomIn /></el-icon>
                </button>
                <button class="extra-thumb-remove" :title="$t('common.remove')" @click.stop="mediaComposable.onRemoveExtraImage('character', char, ep)">×</button>
              </div>
            </div>
            <div class="asset-cover-actions">
              <el-button type="primary" size="small" :loading="generatingCharIds.has(char.id)" @click="onGenerateCharacterImage(char)">
                <el-icon v-if="!generatingCharIds.has(char.id)"><MagicStick /></el-icon>
                {{ $t('filmCreate.aiGenerate') }}
              </el-button>
              <el-button plain size="small" :loading="mediaComposable.uploadingResourceId.value === 'char-' + char.id" @click="mediaComposable.onUploadResourceClick('character', char.id)">
                <el-icon v-if="mediaComposable.uploadingResourceId.value !== 'char-' + char.id"><Upload /></el-icon>
                {{ $t('common.upload') }}
              </el-button>
            </div>
          </div>
        </div>
        <EmptyState v-if="characters.length === 0" :description="$t('filmCreate.noCharsEmptyTip')" :action-label="$t('filmCreate.autoExtractCharacters')" @action="$emit('generate-characters')" />
      </div>
    </div>

    <!-- 隐藏参考图上传输入框 -->
    <input ref="addCharRefFileInput" type="file" accept="image/*" class="hidden-file-input" @change="onRefImageFileChange" />

    <!-- 添加/编辑角色弹窗 -->
    <el-dialog v-model="showEditCharacter" :title="editCharacterForm?.id ? $t('filmCreate.editCharacter') : $t('filmCreate.addCharacter')" width="75%" @close="onCloseCharDialog">
      <el-form v-if="editCharacterForm" label-width="90px">
        <el-form-item :label="$t('filmCreate.refImage')">
          <div class="ref-image-zone">
            <div class="ref-image-box" @click="addCharRefFileInput?.click()" @drop.prevent="onRefImageDrop" @dragover.prevent>
              <img v-if="addCharRefImage" :src="addCharRefImage.dataUrl" class="ref-preview-img" />
              <img v-else-if="editCharacterForm.ref_image"
                :src="editCharacterForm.ref_image.startsWith('http') ? editCharacterForm.ref_image : '/static/' + editCharacterForm.ref_image"
                class="ref-preview-img" />
              <img v-else-if="editCharacterForm.id && (editCharacterForm.image_url || editCharacterForm.local_path)"
                :src="mediaComposable.assetImageUrl(editCharacterForm)"
                class="ref-preview-img ref-preview-img--dim" />
              <div v-else class="ref-upload-hint"><span class="ref-upload-icon">🖼</span><span>{{ $t('filmCreate.clickOrDragRefImage') }}</span></div>
            </div>
            <div v-if="addCharRefImage" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingCharAppearance" @click="doExtractFromRef">{{ $t('filmCreate.extractFeatures') }}</el-button>
              <el-button size="small" @click="addCharRefImage = null">{{ $t('common.remove') }}</el-button>
            </div>
            <div v-else-if="editCharacterForm.ref_image" class="ref-actions">
              <el-button type="primary" size="small" :loading="extractingCharAppearance" @click="doExtractCharFromImage">{{ $t('filmCreate.extractDescFromRef') }}</el-button>
              <el-button size="small" @click="clearCharRefImage">{{ $t('filmCreate.removeRefImage') }}</el-button>
            </div>
            <div v-else-if="editCharacterForm.id && (editCharacterForm.image_url || editCharacterForm.local_path) && !editCharacterForm.appearance" class="ref-actions">
              <el-button size="small" :loading="extractingCharAppearance" @click="doExtractCharFromImage">{{ $t('filmCreate.extractDescFromMain') }}</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="$t('common.name')" required>
          <el-input v-model="editCharacterForm.name" :placeholder="$t('filmCreate.charNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.charRoleLabel')">
          <el-select v-model="editCharacterForm.role" :placeholder="$t('filmCreate.selectCharRolePlaceholder')" class="char-role-select">
            <el-option value="main" :label="$t('filmCreate.roleMainOption')" />
            <el-option value="supporting" :label="$t('filmCreate.roleSupportingOption')" />
            <el-option value="minor" :label="$t('filmCreate.roleMinorOption')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('filmCreate.appearanceDesc')">
          <el-input v-model="editCharacterForm.appearance" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" :placeholder="$t('filmCreate.charAppearanceDetailPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.intro')">
          <el-input v-model="editCharacterForm.description" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :placeholder="$t('filmCreate.charIntroPlaceholder')" />
        </el-form-item>
        <el-form-item v-if="editCharacterForm.id">
          <template #label>
            <span class="char-form-item-label">{{ $t('filmCreate.imageToImagePrompt') }}</span>
          </template>
          <div class="char-prompt-wrapper">
            <div class="char-prompt-header">
              <span class="char-prompt-tip">{{ $t('filmCreate.charPromptTip') }}</span>
              <el-button
                size="small"
                :loading="editCharacterPromptGenerating"
                @click="doGenerateCharacterPrompt"
              >{{ $t('filmCreate.regenPrompt') }}</el-button>
            </div>
            <el-input
              v-model="editCharacterForm.polished_prompt"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 16 }"
              :placeholder="editCharacterPromptGenerating ? $t('filmCreate.generatingPromptWait') : $t('filmCreate.regenPromptOrInputPlaceholder')"
              :disabled="editCharacterPromptGenerating"
              class="char-prompt-input"
            />
          </div>
        </el-form-item>
        <el-form-item v-if="editCharacterForm.id" :label="$t('filmCreate.visualAnchors')">
          <div class="char-prompt-wrapper">
            <div class="char-prompt-header">
              <span class="char-prompt-tip">{{ $t('filmCreate.visualAnchorsTip') }}</span>
              <el-button
                size="small"
                :loading="extractingAnchors"
                :disabled="!editCharacterForm.appearance"
                @click="extractIdentityAnchors"
              >{{ $t('filmCreate.extractVisualAnchors') }}</el-button>
            </div>
            <el-input
              v-if="editCharacterForm.identity_anchors"
              :value="typeof editCharacterForm.identity_anchors === 'string'
                ? editCharacterForm.identity_anchors
                : JSON.stringify(editCharacterForm.identity_anchors, null, 2)"
              type="textarea"
              :rows="4"
              readonly
              class="char-code-textarea"
              :placeholder="$t('filmCreate.extractVisualAnchorsPlaceholder')"
            />
            <div v-else class="char-no-anchors-tip">{{ $t('filmCreate.noAnchorsTip') }}</div>
          </div>
        </el-form-item>
        <el-form-item v-if="editCharacterForm.id" :label="$t('filmCreate.multiStageLooks')">
          <div class="char-prompt-wrapper">
            <div class="char-stage-tip">
              {{ $t('filmCreate.multiStageLooksTip') }}
            </div>
            <el-input
              v-model="editCharacterForm.stages"
              type="textarea"
              :rows="4"
              :placeholder="$t('filmCreate.multiStageLooksPlaceholder')"
              class="char-code-textarea"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditCharacter = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editCharacterSaving" :disabled="!editCharacterForm?.name?.trim()" @click="submitEditCharacter">{{ editCharacterForm?.id ? $t('common.save') : $t('common.add') }}</el-button>
      </template>
    </el-dialog>

    <!-- SD2 认证详情 -->
    <el-dialog
      v-model="showCharSd2Cert"
      :title="$t('filmCreate.sd2CertDetails')"
      width="min(720px, 92vw)"
      destroy-on-close
      class="sd2-cert-dialog"
    >
      <template v-if="charSd2CertPayload">
        <el-descriptions :column="1" border size="small" class="sd2-cert-desc">
          <el-descriptions-item :label="$t('filmCreate.assetId')">
            <span class="sd2-cert-value">{{ charSd2CertPayload.hub_asset_id || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="asset_url">
            <code class="sd2-cert-value">{{ charSd2CertPayload.asset_url || '—' }}</code>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.status')">
            <span class="sd2-cert-value">{{ charSd2CertPayload.status || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('filmCreate.registeredImageUrl')">
            <span class="sd2-cert-value">{{ charSd2CertPayload.source_image_url || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="charSd2CertPayload.sd2_provider" :label="$t('filmCreate.certProvider')">
            <span class="sd2-cert-value">{{ charSd2CertPayload.sd2_provider }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="showCharSd2Cert = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 角色资源库 -->
    <el-dialog v-model="showCharLibrary" :title="$t('filmCreate.charLibTitle')" width="720px" destroy-on-close class="library-dialog" @open="onCharLibraryDialogOpen">
      <el-tabs v-model="charLibraryTab" class="char-library-tabs" @tab-change="onCharLibraryTabChange">
        <el-tab-pane :label="$t('filmCreate.dramaCharLibTab')" name="library">
          <div class="library-toolbar">
            <el-input v-model="charLibraryKeyword" :placeholder="$t('filmCreate.searchNameOrDesc')" clearable class="library-search-input" @input="debouncedLoadCharLibrary()" />
          </div>
          <div v-loading="charLibraryLoading" class="library-list">
            <div v-for="item in charLibraryList" :key="'lib-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.name || $t('library.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || '').slice(0, 60) }}{{ (item.description || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isCharAddToEpisodeLoading('library', item.id)" :disabled="!currentEpisodeId" @click="onAddCharFromLibrary(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                  <el-button size="small" @click="openEditCharLibrary(item)">{{ $t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="onDeleteCharLibrary(item)">{{ $t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!charLibraryLoading && charLibraryList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaCharLib') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination
              v-model:current-page="charLibraryPage"
              v-model:page-size="charLibraryPageSize"
              :total="charLibraryTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @current-change="loadCharLibraryList"
              @size-change="loadCharLibraryList"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane :label="$t('filmCreate.dramaAllCharTab')" name="drama">
          <div class="library-toolbar">
            <el-input v-model="dramaAllCharKeyword" :placeholder="$t('filmCreate.searchNameOrDesc')" clearable class="library-search-input" @input="debouncedLoadDramaAllCharList()" />
          </div>
          <div v-loading="dramaAllCharLoading" class="library-list">
            <div v-for="item in dramaAllCharList" :key="'drama-' + item.id" class="library-item">
              <div class="library-item-cover" @click="mediaComposable.openImagePreview(mediaComposable.assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="mediaComposable.assetImageUrl(item)" alt="" />
                <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">
                  {{ item.name || $t('library.unnamed') }}
                  <el-tag v-if="item.role" size="small" type="info" class="library-role-tag">{{ charRoleLabel(item.role) }}</el-tag>
                </div>
                <div class="library-item-desc">{{ (item.description || item.appearance || '').slice(0, 60) }}{{ (item.description || item.appearance || '').length > 60 ? '…' : '' }}</div>
                <div class="library-item-actions">
                  <el-button size="small" type="primary" :loading="isCharAddToEpisodeLoading('drama', item.id)" :disabled="!currentEpisodeId" @click="onAddDramaCharToEpisode(item)">{{ $t('filmCreate.addToEpisode') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!dramaAllCharLoading && dramaAllCharList.length === 0" class="library-empty">{{ $t('filmCreate.emptyDramaAllChar') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination
              v-model:current-page="dramaAllCharPage"
              v-model:page-size="dramaAllCharPageSize"
              :total="dramaAllCharTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @current-change="loadDramaAllCharList"
              @size-change="loadDramaAllCharList"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showCharLibrary = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑公共角色 -->
    <el-dialog v-model="showEditCharLibrary" :title="$t('filmCreate.editPublicChar')" width="440px" @close="editCharLibraryForm = null">
      <el-form v-if="editCharLibraryForm" label-width="80px">
        <el-form-item :label="$t('common.name')">
          <el-input v-model="editCharLibraryForm.name" :placeholder="$t('filmCreate.charNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.categoryLabel')">
          <el-input v-model="editCharLibraryForm.category" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input v-model="editCharLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('filmCreate.optionalPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmCreate.tagsLabel')">
          <el-input v-model="editCharLibraryForm.tags" :placeholder="$t('filmCreate.tagsPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditCharLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editCharLibrarySaving" @click="submitEditCharLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown, Delete, MoreFilled, VideoPlay, ZoomIn, MagicStick, Upload } from '@element-plus/icons-vue'
import EmptyState from './EmptyState.vue'
import { t } from '@/i18n'
import { uploadAPI } from '@/api/upload'

const props = defineProps({
  dramaId: { type: [Number, String], default: null },
  currentEpisodeId: { type: [Number, String], default: null },
  characters: { type: Array, default: () => [] },
  charComposable: { type: Object, required: true },
  mediaComposable: { type: Object, required: true },
  getAffectedStoryboards: { type: Function, default: () => [] },
  regenSbImagesForAsset: { type: Object, default: () => new Set() },
  regenSbImagesProgress: { type: Object, default: () => ({}) },
})

defineEmits(['generate-characters', 'regen-affected-sb-images', 'scroll-to-storyboard'])

const charactersBlockCollapsed = ref(false)

const {
  showEditCharacter, editCharacterForm, editCharacterSaving, editCharacterPromptGenerating,
  extractingCharAppearance, extractingAnchors, addCharRefImage,
  charactersGenerating, generatingCharIds, sd2CertifyingId, showCharSd2Cert, charSd2CertPayload,
  sd2VoiceUploadingId,
  showCharLibrary, charLibraryList, charLibraryLoading, charLibraryPage, charLibraryPageSize,
  charLibraryTotal, charLibraryKeyword, charLibraryTab,
  dramaAllCharList, dramaAllCharLoading, dramaAllCharPage, dramaAllCharPageSize, dramaAllCharTotal, dramaAllCharKeyword,
  showEditCharLibrary, editCharLibraryForm,
  editCharLibrarySaving, addingCharToLibraryId, addingCharToMaterialId,
  charRoleLabel, openAddCharacter, editCharacter,
  extractIdentityAnchors, clearCharRefImage, onCloseCharDialog, onDeleteCharacter, onGenerateCharacterImage,
  sd2ActionLabel, onSd2PrimaryAction,
  sd2VoiceActionLabel, onSd2VoicePrimaryAction, onSd2VoiceReplace, playSd2Voice,
  doGenerateCharacterPrompt, doExtractCharFromImage, submitEditCharacter,
  onCharLibraryDialogOpen, onCharLibraryTabChange, isCharAddToEpisodeLoading,
  openEditCharLibrary, submitEditCharLibrary,
  onDeleteCharLibrary, onAddCharacterToLibrary, onAddCharacterToMaterialLibrary,
  onAddCharFromLibrary, onAddDramaCharToEpisode,
  loadCharLibraryList, debouncedLoadCharLibrary, loadDramaAllCharList, debouncedLoadDramaAllCharList,
} = props.charComposable

const addCharRefFileInput = ref(null)

async function onRefImageFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  addCharRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
  event.target.value = ''
}

async function onRefImageDrop(event) {
  const file = props.mediaComposable.getFirstImageFile(event.dataTransfer)
  if (!file) return
  addCharRefImage.value = await props.mediaComposable.readFileAsRefImage(file)
}

async function doExtractFromRef() {
  const refImage = addCharRefImage.value
  if (!refImage) return
  extractingCharAppearance.value = true
  try {
    const name = editCharacterForm.value?.name || ''
    const res = await uploadAPI.extractDescriptionFromImage('character', refImage.dataUrl, name)
    if (res?.description && editCharacterForm.value) {
      editCharacterForm.value.appearance = res.description
      ElMessage.success(t('filmCreate.msgAppearanceExtracted'))
    }
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.msgVisionModelMissing'))
  } finally {
    extractingCharAppearance.value = false
  }
}
</script>

<style scoped>
.asset-name-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.asset-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.char-role-tag {
  flex-shrink: 0;
  padding: 0 5px;
  font-size: 11px;
  height: 18px;
  line-height: 18px;
}
.sd2-voice-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sd2-voice-btn-text {
  margin-left: 4px;
}
.sd2-voice-status--active {
  font-size: 11px;
  color: var(--el-color-success, #67c23a);
}
.sd2-voice-status--stale {
  font-size: 11px;
  color: var(--el-color-warning, #e6a23c);
}
.sd2-voice-note {
  font-size: 12px;
  color: var(--text-muted);
}
.char-role-select {
  width: 200px;
  max-width: 100%;
}
.char-form-item-label {
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  display: inline-block;
  min-width: 90px;
  max-width: 130px;
}
.char-prompt-wrapper {
  width: 100%;
}
.char-prompt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.char-prompt-tip {
  font-size: 12px;
  color: var(--text-muted);
}
.char-prompt-input {
  font-size: 12px;
}
.char-code-textarea {
  font-size: var(--font-xs);
  font-family: var(--font-mono);
}
.char-no-anchors-tip {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 0;
}
.char-stage-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.library-role-tag {
  margin-left: 6px;
}
</style>
