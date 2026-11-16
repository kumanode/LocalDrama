<template>
  <div class="film-list">
    <header class="header">
      <div class="header-inner">
        <h1 class="logo">
          <img class="logo-mark" src="/logo/logo-64.png" alt="" width="28" height="28" draggable="false" />
          <span class="logo-text">
            <span class="logo-main">{{ $t('header.appTitle') }}</span>
            <span class="logo-sub">{{ $t('header.appSubtitle') }}</span>
          </span>
        </h1>
        <!-- 公共资源库（左侧，靛紫调） -->
        <div class="header-library">
          <el-button class="btn-library" @click="showCharLibrary = true">
            <el-icon><User /></el-icon>{{ $t('header.characterLib') }}
          </el-button>
          <el-button class="btn-library" @click="showSceneLibrary = true">
            <el-icon><PictureFilled /></el-icon>{{ $t('header.sceneLib') }}
          </el-button>
          <el-button class="btn-library" @click="showPropLibrary = true">
            <el-icon><Box /></el-icon>{{ $t('header.propLib') }}
          </el-button>
        </div>
        <!-- 右侧操作区 -->
        <div class="header-actions">
          <!-- 暂时隐藏，功能待完善 -->
          <!-- <el-button class="btn-library" title="自由创作" @click="$router.push('/free-create')">
            <el-icon><MagicStick /></el-icon>自由创作
          </el-button>
          <el-button class="btn-library" title="媒体素材库" @click="$router.push('/media-library')">
            <el-icon><Files /></el-icon>素材库
          </el-button> -->
          <LanguageToggle />
          <el-button class="btn-theme" :title="isDark ? $t('header.switchToLight') : $t('header.switchToDark')" @click="toggleTheme">
            <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
            {{ isDark ? $t('header.lightMode') : $t('header.darkMode') }}
          </el-button>
          <el-button class="btn-settings" @click="showAiConfigDialog = true">
            <el-icon><Setting /></el-icon>{{ $t('header.aiConfig') }}
          </el-button>
          <input ref="importFileInput" type="file" accept=".zip" style="display:none" @change="onImportFile" />
        </div>
      </div>
    </header>

    <main class="main">
      <div v-loading="loading" class="projects-wrap">
        <div class="project-grid">
          <!-- 操作卡片：始终作为第一个格子 -->
          <div class="project-card action-card">
            <div class="action-card-inner">
              <h3 class="action-card-title">{{ $t('filmList.quickStart') }}</h3>
              <div class="action-card-buttons">
                <el-button type="primary" size="large" class="action-btn action-btn-new" @click="goNewProject">
                  <el-icon><Plus /></el-icon>{{ $t('filmList.newDramaProject') }}
                </el-button>
                <el-button size="large" class="action-btn action-btn-import" :loading="importing" @click="triggerImport">
                  <el-icon><Upload /></el-icon>{{ $t('filmList.importDramaProject') }}
                </el-button>
              </div>
              <div v-if="exampleList.length > 0" class="action-card-example">
                <div class="example-hint">
                  <el-icon class="example-hint-icon"><QuestionFilled /></el-icon>
                  <span class="example-hint-text">{{ $t('filmList.beginnerHint') }}</span>
                </div>
                <div class="example-list">
                  <el-button
                    v-for="ex in exampleList"
                    :key="ex.filename"
                    size="small"
                    class="example-btn"
                    :loading="importingExample === ex.filename"
                    @click="onImportExample(ex)"
                  >
                    <el-icon><FolderOpened /></el-icon>{{ locale === 'en' && /[\u4e00-\u9fff]/.test(ex.name) ? `${ex.name} (${$t('filmList.sampleChinese')})` : ex.name }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div
            v-for="d in dramas"
            :key="d.id"
            class="project-card"
            @click="openProject(d.id)"
          >
            <div class="project-card-actions" @click.stop>
              <el-button size="small" circle :icon="Download" :title="$t('filmList.exportTooltip')" :loading="exportingId === d.id" @click="onExport(d)" />
              <el-button size="small" circle :icon="Edit" :title="$t('filmList.editTooltip')" @click="openEditDialog(d)" />
              <el-button size="small" type="danger" plain circle :icon="Delete" :title="$t('filmList.deleteTooltip')" @click="onDelete(d)" />
            </div>
            <div class="project-card-body">
              <h3 class="project-title">{{ d.title || $t('filmList.unnamedProject') }}</h3>
              <p class="project-desc">{{ d.description || $t('filmList.noDescription') }}</p>
              <div class="project-badges">
                <span class="badge badge-status" :class="'badge-status--' + (d.status || 'draft')">{{ formatStatus(d.status) }}</span>
                <span v-if="d.episodes?.length" class="badge badge-episodes">{{ d.episodes.length }} {{ t('filmList.episodeCountUnit') }}</span>
                <span v-if="totalStoryboards(d) > 0" class="badge badge-storyboards">{{ totalStoryboards(d) }} {{ t('filmList.storyboardCountUnit') }}</span>
                <span v-if="d.metadata?.aspect_ratio" class="badge badge-ratio">{{ d.metadata.aspect_ratio }}</span>
                <span v-if="d.style" class="badge badge-style">{{ formatStyle(d.style) }}</span>
                <span v-if="d.genre" class="badge badge-genre">{{ formatGenre(d.genre) }}</span>
              </div>
              <p class="project-meta">{{ formatDate(d.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 新建项目：先填标题和描述 -->
    <el-dialog
      v-model="showNewDialog"
      :title="$t('filmList.createDialogTitle')"
      width="480px"
      :close-on-click-modal="false"
      @closed="resetNewForm"
    >
      <el-form :model="newForm" label-width="80px" label-position="top">
        <el-form-item :label="$t('filmList.projectName')" required>
          <el-input v-model="newForm.title" :placeholder="$t('filmList.projectNamePlaceholder')" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('filmList.projectDesc')">
          <el-input v-model="newForm.description" type="textarea" :rows="3" :placeholder="$t('filmList.projectDescPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('filmList.aspectRatio')">
          <el-select v-model="newForm.aspect_ratio" style="width: 100%">
            <el-option :label="`${t('filmCreate.aspectRatio16_9')} ${t('filmList.aspectDefaultSuffix')}`" value="16:9" />
            <el-option :label="`${t('filmCreate.aspectRatio9_16')} ${t('filmList.aspectShortSuffix')}`" value="9:16" />
            <el-option :label="t('filmCreate.aspectRatio3_4')" value="3:4" />
            <el-option :label="t('filmCreate.aspectRatio1_1')" value="1:1" />
            <el-option :label="t('filmCreate.aspectRatio4_3')" value="4:3" />
            <el-option :label="t('filmCreate.aspectRatio21_9')" value="21:9" />
          </el-select>
          <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-subtle);">{{ t('filmList.aspectRatioHint') }}</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="newSaving" :disabled="!newForm.title?.trim()" @click="submitNew">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- AI 配置弹窗 -->
    <el-dialog v-model="showAiConfigDialog" :title="t('routes.aiConfig')" width="90%" destroy-on-close>
      <AIConfigContent v-if="showAiConfigDialog" />
    </el-dialog>

    <!-- 公共角色库 -->
    <el-dialog v-model="showCharLibrary" :title="$t('library.charTitle')" width="720px" destroy-on-close class="library-dialog" @open="loadCharLibraryList">
      <div class="library-toolbar">
        <el-input v-model="charLibraryKeyword" :placeholder="$t('library.searchCharPlaceholder')" clearable style="width: 200px" @input="debouncedLoadCharLibrary()" />
      </div>
      <div v-loading="charLibraryLoading" class="library-list">
        <div v-for="item in charLibraryList" :key="item.id" class="library-item">
          <div class="library-item-cover" @click="openImagePreview(assetImageUrl(item))">
            <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
            <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
          </div>
          <div class="library-item-info">
            <div class="library-item-name">{{ item.name || $t('library.unnamed') }}</div>
            <div class="library-item-desc">{{ (item.description || '').slice(0, 60) }}{{ (item.description || '').length > 60 ? '…' : '' }}</div>
            <div class="library-item-actions">
              <el-button size="small" @click="openEditCharLibrary(item)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" type="danger" plain @click="onDeleteCharLibrary(item)">{{ $t('common.delete') }}</el-button>
            </div>
          </div>
        </div>
        <div v-if="!charLibraryLoading && charLibraryList.length === 0" class="library-empty">{{ $t('library.emptyChar') }}</div>
      </div>
      <div class="library-pagination">
        <el-pagination v-model:current-page="charLibraryPage" v-model:page-size="charLibraryPageSize" :total="charLibraryTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadCharLibraryList" @size-change="loadCharLibraryList" />
      </div>
      <template #footer><el-button @click="showCharLibrary = false">{{ $t('common.close') }}</el-button></template>
    </el-dialog>
    <!-- 编辑公共角色 -->
    <el-dialog v-model="showEditCharLibrary" :title="$t('library.editChar')" width="480px" @close="editCharLibraryForm = null">
      <el-form v-if="editCharLibraryForm" label-width="80px">
        <el-form-item :label="$t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openImagePreview(assetImageUrl(editCharLibraryForm))">
              <img v-if="editCharLibraryForm.image_url || editCharLibraryForm.local_path" :src="assetImageUrl(editCharLibraryForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editCharLibraryForm.imgUploading" @click="charLibFileRef.click()">{{ $t('library.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editCharLibraryForm.imgGenerating" @click="doGenerateLibImg(editCharLibraryForm, (editCharLibraryForm.name + (editCharLibraryForm.description ? ', ' + editCharLibraryForm.description : '')), characterLibraryAPI, loadCharLibraryList)">{{ $t('library.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="charLibFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editCharLibraryForm, characterLibraryAPI, loadCharLibraryList)" />
        </el-form-item>
        <el-form-item :label="$t('common.name')"><el-input v-model="editCharLibraryForm.name" :placeholder="$t('filmCreate.charName')" /></el-form-item>
        <el-form-item :label="$t('library.category')"><el-input v-model="editCharLibraryForm.category" :placeholder="$t('library.optional')" /></el-form-item>
        <el-form-item :label="$t('common.description')"><el-input v-model="editCharLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('library.descPlaceholder')" /></el-form-item>
        <el-form-item :label="$t('library.tags')"><el-input v-model="editCharLibraryForm.tags" :placeholder="$t('library.tagPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditCharLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editCharLibrarySaving" @click="submitEditCharLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 公共场景库 -->
    <el-dialog v-model="showSceneLibrary" :title="$t('library.sceneTitle')" width="720px" destroy-on-close class="library-dialog" @open="loadSceneLibraryList">
      <div class="library-toolbar">
        <el-input v-model="sceneLibraryKeyword" :placeholder="$t('library.searchScenePlaceholder')" clearable style="width: 200px" @input="debouncedLoadSceneLibrary()" />
      </div>
      <div v-loading="sceneLibraryLoading" class="library-list">
        <div v-for="item in sceneLibraryList" :key="item.id" class="library-item">
          <div class="library-item-cover" @click="openImagePreview(assetImageUrl(item))">
            <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
            <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
          </div>
          <div class="library-item-info">
            <div class="library-item-name">{{ item.location || item.time || $t('library.unnamed') }}</div>
            <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
            <div class="library-item-actions">
              <el-button size="small" @click="openEditSceneLibrary(item)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" type="danger" plain @click="onDeleteSceneLibrary(item)">{{ $t('common.delete') }}</el-button>
            </div>
          </div>
        </div>
        <div v-if="!sceneLibraryLoading && sceneLibraryList.length === 0" class="library-empty">{{ $t('library.emptyScene') }}</div>
      </div>
      <div class="library-pagination">
        <el-pagination v-model:current-page="sceneLibraryPage" v-model:page-size="sceneLibraryPageSize" :total="sceneLibraryTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadSceneLibraryList" @size-change="loadSceneLibraryList" />
      </div>
      <template #footer><el-button @click="showSceneLibrary = false">{{ $t('common.close') }}</el-button></template>
    </el-dialog>
    <!-- 编辑公共场景 -->
    <el-dialog v-model="showEditSceneLibrary" :title="$t('library.editScene')" width="480px" @close="editSceneLibraryForm = null">
      <el-form v-if="editSceneLibraryForm" label-width="80px">
        <el-form-item :label="$t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openImagePreview(assetImageUrl(editSceneLibraryForm))">
              <img v-if="editSceneLibraryForm.image_url || editSceneLibraryForm.local_path" :src="assetImageUrl(editSceneLibraryForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editSceneLibraryForm.imgUploading" @click="sceneLibFileRef.click()">{{ $t('library.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editSceneLibraryForm.imgGenerating" @click="doGenerateLibImg(editSceneLibraryForm, ([editSceneLibraryForm.location, editSceneLibraryForm.time, editSceneLibraryForm.description].filter(Boolean).join(', ')), sceneLibraryAPI, loadSceneLibraryList)">{{ $t('library.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="sceneLibFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editSceneLibraryForm, sceneLibraryAPI, loadSceneLibraryList)" />
        </el-form-item>
        <el-form-item :label="$t('library.location')"><el-input v-model="editSceneLibraryForm.location" :placeholder="$t('filmCreate.sceneLocation')" /></el-form-item>
        <el-form-item :label="$t('library.time')"><el-input v-model="editSceneLibraryForm.time" :placeholder="$t('filmCreate.sceneTime')" /></el-form-item>
        <el-form-item :label="$t('library.category')"><el-input v-model="editSceneLibraryForm.category" :placeholder="$t('library.optional')" /></el-form-item>
        <el-form-item :label="$t('common.description')"><el-input v-model="editSceneLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('library.descPlaceholder')" /></el-form-item>
        <el-form-item :label="$t('library.tags')"><el-input v-model="editSceneLibraryForm.tags" :placeholder="$t('library.tagPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditSceneLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editSceneLibrarySaving" @click="submitEditSceneLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 公共道具库 -->
    <el-dialog v-model="showPropLibrary" :title="$t('library.propTitle')" width="720px" destroy-on-close class="library-dialog" @open="loadPropLibraryList">
      <div class="library-toolbar">
        <el-input v-model="propLibraryKeyword" :placeholder="$t('library.searchPropPlaceholder')" clearable style="width: 200px" @input="debouncedLoadPropLibrary()" />
      </div>
      <div v-loading="propLibraryLoading" class="library-list">
        <div v-for="item in propLibraryList" :key="item.id" class="library-item">
          <div class="library-item-cover" @click="openImagePreview(assetImageUrl(item))">
            <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
            <span v-else class="library-item-placeholder">{{ $t('library.noImage') }}</span>
          </div>
          <div class="library-item-info">
            <div class="library-item-name">{{ item.name || $t('library.unnamed') }}</div>
            <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}{{ (item.description || item.prompt || '').length > 60 ? '…' : '' }}</div>
            <div class="library-item-actions">
              <el-button size="small" @click="openEditPropLibrary(item)">{{ $t('common.edit') }}</el-button>
              <el-button size="small" type="danger" plain @click="onDeletePropLibrary(item)">{{ $t('common.delete') }}</el-button>
            </div>
          </div>
        </div>
        <div v-if="!propLibraryLoading && propLibraryList.length === 0" class="library-empty">{{ $t('library.emptyProp') }}</div>
      </div>
      <div class="library-pagination">
        <el-pagination v-model:current-page="propLibraryPage" v-model:page-size="propLibraryPageSize" :total="propLibraryTotal" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @current-change="loadPropLibraryList" @size-change="loadPropLibraryList" />
      </div>
      <template #footer><el-button @click="showPropLibrary = false">{{ $t('common.close') }}</el-button></template>
    </el-dialog>
    <!-- 编辑公共道具 -->
    <el-dialog v-model="showEditPropLibrary" :title="$t('library.editProp')" width="480px" @close="editPropLibraryForm = null">
      <el-form v-if="editPropLibraryForm" label-width="80px">
        <el-form-item :label="$t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openImagePreview(assetImageUrl(editPropLibraryForm))">
              <img v-if="editPropLibraryForm.image_url || editPropLibraryForm.local_path" :src="assetImageUrl(editPropLibraryForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editPropLibraryForm.imgUploading" @click="propLibFileRef.click()">{{ $t('library.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editPropLibraryForm.imgGenerating" @click="doGenerateLibImg(editPropLibraryForm, (editPropLibraryForm.name + (editPropLibraryForm.description ? ', ' + editPropLibraryForm.description : '')), propLibraryAPI, loadPropLibraryList)">{{ $t('library.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="propLibFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editPropLibraryForm, propLibraryAPI, loadPropLibraryList)" />
        </el-form-item>
        <el-form-item :label="$t('common.name')"><el-input v-model="editPropLibraryForm.name" :placeholder="$t('filmCreate.propName')" /></el-form-item>
        <el-form-item :label="$t('library.category')"><el-input v-model="editPropLibraryForm.category" :placeholder="$t('library.optional')" /></el-form-item>
        <el-form-item :label="$t('common.description')"><el-input v-model="editPropLibraryForm.description" type="textarea" :rows="3" :placeholder="$t('library.descPlaceholder')" /></el-form-item>
        <el-form-item :label="$t('library.tags')"><el-input v-model="editPropLibraryForm.tags" :placeholder="$t('library.tagPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditPropLibrary = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editPropLibrarySaving" @click="submitEditPropLibrary">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 图片放大预览 -->
    <Teleport to="body">
      <div v-if="previewImageUrl" class="image-preview-overlay" @click="previewImageUrl = null">
        <img :src="previewImageUrl" alt="" class="image-preview-img" @click.stop="previewImageUrl = null" />
      </div>
    </Teleport>

    <!-- 编辑项目：修改标题和故事 -->
    <el-dialog
      v-model="showEditDialog"
      :title="$t('filmList.editDialogTitle')"
      width="480px"
      :close-on-click-modal="false"
      @closed="resetEditForm"
    >
      <el-form :model="editForm" label-width="80px" label-position="top">
        <el-form-item :label="$t('filmList.projectName')" required>
          <el-input v-model="editForm.title" :placeholder="$t('filmList.projectNamePlaceholder')" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('filmList.projectDesc')">
          <el-input v-model="editForm.description" type="textarea" :rows="3" :placeholder="$t('filmList.projectDescPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editSaving" :disabled="!editForm.title?.trim()" @click="submitEdit">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Setting, Plus, User, PictureFilled, Box, Sunny, Moon, Download, Upload, QuestionFilled, FolderOpened, MagicStick, Files } from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'
import { dramaAPI } from '@/api/drama'
import { characterLibraryAPI } from '@/api/characterLibrary'
import { sceneLibraryAPI } from '@/api/sceneLibrary'
import { propLibraryAPI } from '@/api/propLibrary'
import AIConfigContent from '@/components/AIConfigContent.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { uploadAPI } from '@/api/upload'
import { aiAPI } from '@/api/ai'
import { imagesAPI } from '@/api/images'
import { taskAPI } from '@/api/task'
import { getStyleLabel } from '@/constants/styleOptions'

const router = useRouter()
const { isDark, toggle: toggleTheme } = useTheme()
const { locale, t } = useI18n()

// 库编辑图片 – 文件输入 refs
const charLibFileRef  = ref(null)
const sceneLibFileRef = ref(null)
const propLibFileRef  = ref(null)

// 共享：上传图片
async function doUploadLibImg(event, form, api, reloadFn) {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  if (!file || !form?.id) return
  form.imgUploading = true
  try {
    const res = await uploadAPI.uploadImage(file)
    const data = res?.data ?? res
    const url = data?.url || data?.path || data?.local_path
    if (!url) { ElMessage.error(t('filmList.uploadNoUrl')); return }
    form.image_url = url
    form.local_path = data?.local_path ?? null
    await api.update(form.id, { image_url: url, local_path: null })
    reloadFn()
    ElMessage.success(t('filmList.imageUpdated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.uploadFailed')) }
  finally { form.imgUploading = false }
}

// 共享：AI 生成图片
async function doGenerateLibImg(form, prompt, api, reloadFn) {
  if (!prompt?.trim()) { ElMessage.warning(t('filmList.fillNameOrDescFirst')); return }
  form.imgGenerating = true
  try {
    const res = await imagesAPI.create({ prompt: prompt.trim(), drama_id: null })
    const imgData = res?.data ?? res
    const taskId = imgData?.task_id
    if (!taskId) throw new Error(t('filmList.noTaskId'))
    let task = null
    for (let i = 0; i < 300; i++) {
      await new Promise(r => setTimeout(r, 1500))
      const tr = await taskAPI.get(taskId)
      task = tr?.data ?? tr
      if (task.status === 'completed') break
      if (task.status === 'failed') throw new Error(task.error || t('filmList.generateFailed'))
    }
    if (!task || task.status !== 'completed') throw new Error(t('filmList.generateTimeout'))
    const result = task.result
    const imageUrl = result?.image_url
    const localPath = result?.local_path ?? null
    if (!imageUrl && !localPath) throw new Error(t('filmList.noImageUrl'))
    form.image_url = imageUrl || ''
    form.local_path = localPath
    await api.update(form.id, { image_url: imageUrl || null, local_path: localPath })
    reloadFn()
    ElMessage.success(t('filmList.aiImageGenerated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.generateFailed')) }
  finally { form.imgGenerating = false }
}

const loading = ref(false)
const dramas = ref([])
const total = ref(0)

const showAiConfigDialog = ref(false)
const vendorLockEnabled = ref(false)

// 图片预览
const previewImageUrl = ref(null)
function assetImageUrl(item) {
  if (!item) return ''
  if (typeof item === 'string') return item.startsWith('http') ? item : item
  const localPath = item.local_path && String(item.local_path).trim()
  if (localPath) return '/static/' + localPath.replace(/^\//, '')
  return item.image_url || ''
}
function openImagePreview(url) {
  if (url) previewImageUrl.value = url
}

// 公共角色库
const showCharLibrary = ref(false)
const charLibraryList = ref([])
const charLibraryLoading = ref(false)
const charLibraryPage = ref(1)
const charLibraryPageSize = ref(20)
const charLibraryTotal = ref(0)
const charLibraryKeyword = ref('')
const showEditCharLibrary = ref(false)
const editCharLibraryForm = ref(null)
const editCharLibrarySaving = ref(false)
let charLibraryKeywordTimer = null

async function loadCharLibraryList() {
  charLibraryLoading.value = true
  try {
    const res = await characterLibraryAPI.list({ page: charLibraryPage.value, page_size: charLibraryPageSize.value, keyword: charLibraryKeyword.value || undefined, global: 1 })
    charLibraryList.value = res?.items ?? []
    const p = res?.pagination ?? {}
    charLibraryTotal.value = p.total ?? 0
    if (p.page != null) charLibraryPage.value = p.page
    if (p.page_size != null) charLibraryPageSize.value = p.page_size
  } catch { charLibraryList.value = [] } finally { charLibraryLoading.value = false }
}
function debouncedLoadCharLibrary() {
  if (charLibraryKeywordTimer) clearTimeout(charLibraryKeywordTimer)
  charLibraryKeywordTimer = setTimeout(() => { charLibraryPage.value = 1; loadCharLibraryList() }, 300)
}
function openEditCharLibrary(item) {
  editCharLibraryForm.value = { id: item.id, name: item.name ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  showEditCharLibrary.value = true
}
async function submitEditCharLibrary() {
  if (!editCharLibraryForm.value?.id) return
  editCharLibrarySaving.value = true
  try {
    await characterLibraryAPI.update(editCharLibraryForm.value.id, { name: editCharLibraryForm.value.name, category: editCharLibraryForm.value.category || null, description: editCharLibraryForm.value.description || null, tags: editCharLibraryForm.value.tags || null, image_url: editCharLibraryForm.value.image_url || null, local_path: editCharLibraryForm.value.local_path ?? null })
    ElMessage.success(t('filmList.saved'))
    showEditCharLibrary.value = false
    loadCharLibraryList()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) } finally { editCharLibrarySaving.value = false }
}
async function onDeleteCharLibrary(item) {
  try { await ElMessageBox.confirm(t('filmCreate.deletePublicCharacterPrompt', { name: (item.name || t('common.unnamed')).slice(0, 20) }), t('filmCreate.confirmDeletionTitle'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await characterLibraryAPI.delete(item.id); ElMessage.success(t('filmList.deleted')); loadCharLibraryList() } catch (e) { ElMessage.error(e.message || t('filmList.deleteFailed')) }
}

// 公共场景库
const showSceneLibrary = ref(false)
const sceneLibraryList = ref([])
const sceneLibraryLoading = ref(false)
const sceneLibraryPage = ref(1)
const sceneLibraryPageSize = ref(20)
const sceneLibraryTotal = ref(0)
const sceneLibraryKeyword = ref('')
const showEditSceneLibrary = ref(false)
const editSceneLibraryForm = ref(null)
const editSceneLibrarySaving = ref(false)
let sceneLibraryKeywordTimer = null

async function loadSceneLibraryList() {
  sceneLibraryLoading.value = true
  try {
    const res = await sceneLibraryAPI.list({ page: sceneLibraryPage.value, page_size: sceneLibraryPageSize.value, keyword: sceneLibraryKeyword.value || undefined, global: 1 })
    sceneLibraryList.value = res?.items ?? []
    const p = res?.pagination ?? {}
    sceneLibraryTotal.value = p.total ?? 0
    if (p.page != null) sceneLibraryPage.value = p.page
    if (p.page_size != null) sceneLibraryPageSize.value = p.page_size
  } catch { sceneLibraryList.value = [] } finally { sceneLibraryLoading.value = false }
}
function debouncedLoadSceneLibrary() {
  if (sceneLibraryKeywordTimer) clearTimeout(sceneLibraryKeywordTimer)
  sceneLibraryKeywordTimer = setTimeout(() => { sceneLibraryPage.value = 1; loadSceneLibraryList() }, 300)
}
function openEditSceneLibrary(item) {
  editSceneLibraryForm.value = { id: item.id, location: item.location ?? '', time: item.time ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  showEditSceneLibrary.value = true
}
async function submitEditSceneLibrary() {
  if (!editSceneLibraryForm.value?.id) return
  editSceneLibrarySaving.value = true
  try {
    await sceneLibraryAPI.update(editSceneLibraryForm.value.id, { location: editSceneLibraryForm.value.location, time: editSceneLibraryForm.value.time || null, category: editSceneLibraryForm.value.category || null, description: editSceneLibraryForm.value.description || null, tags: editSceneLibraryForm.value.tags || null, image_url: editSceneLibraryForm.value.image_url || null, local_path: editSceneLibraryForm.value.local_path ?? null })
    ElMessage.success(t('filmList.saved'))
    showEditSceneLibrary.value = false
    loadSceneLibraryList()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) } finally { editSceneLibrarySaving.value = false }
}
async function onDeleteSceneLibrary(item) {
  const name = (item.location || item.time || t('common.unnamed')).slice(0, 20)
  try { await ElMessageBox.confirm(t('filmCreate.deletePublicScenePrompt', { name }), t('filmCreate.confirmDeletionTitle'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await sceneLibraryAPI.delete(item.id); ElMessage.success(t('filmList.deleted')); loadSceneLibraryList() } catch (e) { ElMessage.error(e.message || t('filmList.deleteFailed')) }
}

// 公共道具库
const showPropLibrary = ref(false)
const propLibraryList = ref([])
const propLibraryLoading = ref(false)
const propLibraryPage = ref(1)
const propLibraryPageSize = ref(20)
const propLibraryTotal = ref(0)
const propLibraryKeyword = ref('')
const showEditPropLibrary = ref(false)
const editPropLibraryForm = ref(null)
const editPropLibrarySaving = ref(false)
let propLibraryKeywordTimer = null

async function loadPropLibraryList() {
  propLibraryLoading.value = true
  try {
    const res = await propLibraryAPI.list({ page: propLibraryPage.value, page_size: propLibraryPageSize.value, keyword: propLibraryKeyword.value || undefined, global: 1 })
    propLibraryList.value = res?.items ?? []
    const p = res?.pagination ?? {}
    propLibraryTotal.value = p.total ?? 0
    if (p.page != null) propLibraryPage.value = p.page
    if (p.page_size != null) propLibraryPageSize.value = p.page_size
  } catch { propLibraryList.value = [] } finally { propLibraryLoading.value = false }
}
function debouncedLoadPropLibrary() {
  if (propLibraryKeywordTimer) clearTimeout(propLibraryKeywordTimer)
  propLibraryKeywordTimer = setTimeout(() => { propLibraryPage.value = 1; loadPropLibraryList() }, 300)
}
function openEditPropLibrary(item) {
  editPropLibraryForm.value = { id: item.id, name: item.name ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  showEditPropLibrary.value = true
}
async function submitEditPropLibrary() {
  if (!editPropLibraryForm.value?.id) return
  editPropLibrarySaving.value = true
  try {
    await propLibraryAPI.update(editPropLibraryForm.value.id, { name: editPropLibraryForm.value.name, category: editPropLibraryForm.value.category || null, description: editPropLibraryForm.value.description || null, tags: editPropLibraryForm.value.tags || null, image_url: editPropLibraryForm.value.image_url || null, local_path: editPropLibraryForm.value.local_path ?? null })
    ElMessage.success(t('filmList.saved'))
    showEditPropLibrary.value = false
    loadPropLibraryList()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) } finally { editPropLibrarySaving.value = false }
}
async function onDeletePropLibrary(item) {
  try { await ElMessageBox.confirm(t('filmCreate.deletePublicPropPrompt', { name: (item.name || t('common.unnamed')).slice(0, 20) }), t('filmCreate.confirmDeletionTitle'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await propLibraryAPI.delete(item.id); ElMessage.success(t('filmList.deleted')); loadPropLibraryList() } catch (e) { ElMessage.error(e.message || t('filmList.deleteFailed')) }
}

const showNewDialog = ref(false)
const newForm = ref({ title: '', description: '', aspect_ratio: '16:9' })
const newSaving = ref(false)
const exportingId = ref(null)
const importing = ref(false)
const importFileInput = ref(null)

const exampleList = ref([])
const importingExample = ref(null)

function loadExamples() {
  dramaAPI.listExamples()
    .then(res => { exampleList.value = Array.isArray(res) ? res : (res?.data ?? []) })
    .catch(() => { exampleList.value = [] })
}

async function onImportExample(ex) {
  importingExample.value = ex.filename
  try {
    const data = await dramaAPI.importExample(ex.filename)
    ElMessage.success(t('filmList.sampleImported', { name: data?.title || ex.name }))
    loadList()
  } catch (e) {
    const msg = e.response?.data?.message || e.message || t('filmList.importFailedSimple')
    ElMessage.error(msg)
  } finally {
    importingExample.value = null
  }
}

const showEditDialog = ref(false)
const editForm = ref({ id: null, title: '', description: '' })
const editSaving = ref(false)

function loadList() {
  loading.value = true
  dramaAPI
    .list({ page: 1, page_size: 50 })
    .then((res) => {
      dramas.value = res?.items ?? []
      total.value = res?.pagination?.total ?? 0
    })
    .catch(() => {
      dramas.value = []
    })
    .finally(() => {
      loading.value = false
    })
}

function formatDate(val) {
  if (!val) return ''
  const d = new Date(val)
  const loc = locale.value === 'en' ? 'en-US' : 'zh-CN'
  return d.toLocaleDateString(loc, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatStatus(status) {
  const keys = { draft: 'statusDraft', published: 'statusPublished', archived: 'statusArchived', generating: 'statusGenerating' }
  return keys[status] ? t(`filmList.${keys[status]}`) : status || t('filmList.statusDraft')
}

function formatStyle(style) {
  const aliases = { anime: 'anime style', sci_fi: 'sci-fi' }
  const key = aliases[style] || style
  return getStyleLabel(key, locale.value)
}

function formatGenre(genre) {
  const keys = { drama: 'genreDrama', comedy: 'genreComedy', adventure: 'genreAdventure', romance: 'genreRomance', thriller: 'genreThriller', action: 'genreAction', horror: 'genreHorror' }
  return keys[genre] ? t(`filmList.${keys[genre]}`) : genre
}

function totalStoryboards(d) {
  return (d.episodes || []).reduce((sum, ep) => sum + (ep.storyboards?.length || 0), 0)
}

function goNewProject() {
  showNewDialog.value = true
}

function resetNewForm() {
  newForm.value = { title: '', description: '', aspect_ratio: '16:9' }
}

async function submitNew() {
  const title = newForm.value.title?.trim()
  if (!title) return
  newSaving.value = true
  try {
    const drama = await dramaAPI.create({ title, description: newForm.value.description?.trim() || undefined, metadata: { aspect_ratio: newForm.value.aspect_ratio || '16:9' } })
    showNewDialog.value = false
    ElMessage.success(t('filmList.createSuccess'))
    loadList()
    router.push('/film/' + drama.id)
  } catch (e) {
    ElMessage.error(e.message || t('common.failed'))
  } finally {
    newSaving.value = false
  }
}

function openEditDialog(d) {
  editForm.value = { id: d.id, title: d.title || '', description: d.description || '' }
  showEditDialog.value = true
}

function resetEditForm() {
  editForm.value = { id: null, title: '', description: '' }
}

async function submitEdit() {
  const title = editForm.value.title?.trim()
  if (!title || editForm.value.id == null) return
  editSaving.value = true
  try {
    await dramaAPI.update(editForm.value.id, { title, description: editForm.value.description?.trim() || undefined })
    showEditDialog.value = false
    ElMessage.success(t('filmList.updateSuccess'))
    loadList()
  } catch (e) {
    ElMessage.error(e.message || t('common.failed'))
  } finally {
    editSaving.value = false
  }
}

function openProject(id) {
  router.push('/drama/' + id)
}

function onExport(d) {
  if (exportingId.value) return
  exportingId.value = d.id
  try {
    // 大 ZIP 用浏览器原生下载，避免 axios blob 经 dev proxy 整包缓冲导致 ERR_FAILED
    const a = document.createElement('a')
    a.href = `/api/v1/dramas/${d.id}/export`
    a.download = `${d.title || 'drama'}.zip`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    ElMessage.success(t('common.exporting'))
  } catch (e) {
    ElMessage.error(e.message || t('filmList.exportFailed', { error: e.message }))
  } finally {
    exportingId.value = null
  }
}

function triggerImport() {
  importFileInput.value?.click()
}

async function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  if (!file.name.endsWith('.zip')) {
    ElMessage.error(t('filmList.selectZipFile'))
    return
  }
  importing.value = true
  try {
    const data = await dramaAPI.importDrama(file)
    ElMessage.success(t('filmList.importSuccess')) 
    loadList()
  } catch (e) {
    const msg = e.response?.data?.message || e.message || t('filmList.importFailed', { error: e.message })
    ElMessage.error(msg)
  } finally {
    importing.value = false
  }
}

async function onDelete(d) {
  try {
    await ElMessageBox.confirm(
      t('filmList.deleteConfirmMsg', { name: d.title || t('filmList.unnamedProject') }),
      t('filmList.deleteConfirmTitle'),
      { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }
    )
  } catch {
    return
  }
  try {
    await dramaAPI.delete(d.id)
    ElMessage.success(t('filmList.deleteSuccess'))
    loadList()
  } catch (e) {
    ElMessage.error(e.message || t('common.failed'))
  }
}

onMounted(async () => {
  loadList()
  loadExamples()
  try {
    const lock = await aiAPI.getVendorLock()
    vendorLockEnabled.value = !!lock?.enabled
  } catch (_) {}
})
</script>

<style scoped>
.film-list {
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
}
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: none;
}
.header-inner {
  max-width: min(1400px, 96vw);
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.logo {
  margin: 0;
  cursor: pointer;
  display: flex;
  line-height: 1;
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}
.logo-text {
  display: flex;
  white-space: nowrap;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
  text-align: left;
}
.logo-mark {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: var(--radius-sm);
  display: block;
}
.logo-main {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-bright);
}
.logo-sub {
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}
.page-title {
  color: var(--text-muted);
  font-size: 0.95rem;
}
.header-library {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 20px;
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-actions .el-button {
  height: 32px;
}

/* 资源库按钮 —— 靛紫调 */
.btn-library {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--text-muted);
  --el-button-hover-text-color: var(--text-primary);
  --el-button-active-bg-color: var(--border-color);
  --el-button-active-border-color: var(--text-bright);
}
html.light .btn-library {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--text-muted);
  --el-button-hover-text-color: var(--text-primary);
  --el-button-active-bg-color: var(--border-color);
  --el-button-active-border-color: var(--text-bright);
}

/* 主题切换按钮 */
.btn-theme {
  --el-button-bg-color: var(--bg-hover);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-muted);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--border-muted);
  --el-button-hover-text-color: var(--text-primary);
  transition: all 0.2s;
}
html.light .btn-theme {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--text-bright);
  --el-button-hover-text-color: var(--text-bright);
}


/* AI配置按钮 —— technical (monochrome) */
.btn-settings {
  --el-button-bg-color: transparent;
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--text-bright);
  --el-button-hover-text-color: var(--text-bright);
  --el-button-active-bg-color: var(--bg-hover);
  --el-button-active-border-color: var(--text-bright);
}

/* 导入按钮 —— 亮色模式下提升可读性 */
html.light .btn-import {
  --el-button-text-color: var(--text-primary);
  --el-button-border-color: var(--border-color);
  --el-button-hover-text-color: var(--text-primary);
  --el-button-hover-border-color: var(--border-muted);
}

.main {
  max-width: min(1400px, 96vw);
  margin: 0 auto;
  padding: 24px 16px 48px;
}
.projects-wrap {
  min-height: 200px;
}
.empty {
  text-align: center;
  padding: 48px 24px;
}
.empty-title {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.empty-desc {
  color: var(--text-subtle);
  font-size: 0.9rem;
  margin: 0 0 20px;
}
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
}
.project-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-mech);
  box-shadow: none;
  overflow: hidden;
}
.project-card::before { display: none; }
.project-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-card);
  box-shadow: none;
}

/* 操作卡片 */
.action-card {
  cursor: default;
  border: 1px dashed var(--border-muted);
  background: var(--bg-inner);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  border-radius: var(--radius-lg);
}
.action-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-inner);
  box-shadow: none;
}
.action-card::before {
  display: none;
}
.action-card-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.action-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-bright);
  margin: 0;
}
.action-card-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
  align-items: center;
}
.action-btn {
  flex: 0 1 180px;
  min-width: 160px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-pill) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-btn-new {
  --el-button-bg-color: var(--el-color-primary);
}
.action-btn-import {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--text-muted);
  --el-button-hover-text-color: var(--text-primary);
}
.action-card-example {
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}
.example-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  margin-bottom: 8px;
}
.example-hint-icon {
  color: var(--text-primary);
  font-size: 15px;
}
.example-hint-text {
  font-size: 0.8rem;
  color: var(--text-subtle);
}
.example-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.example-btn {
  --el-button-bg-color: var(--bg-inner);
  --el-button-border-color: var(--border-muted);
  --el-button-text-color: var(--text-primary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--border-muted);
  --el-button-hover-text-color: var(--text-primary);
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-card-body {
  padding-right: 56px;
}
.project-title {
  font-size: 1.05rem;
  margin: 0 0 8px;
  color: var(--text-bright);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-desc {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.project-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 10px;
}
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}
.badge-status--draft {
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid var(--border-muted);
}
.badge-status--published {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-muted);
}
.badge-status--generating {
  background: var(--bg-hover);
  color: var(--el-color-warning);
  border: 1px solid var(--el-color-warning);
}
.badge-status--archived {
  background: var(--bg-inner);
  color: var(--text-primary);
  border: 1px solid var(--border-muted);
}
.badge-episodes {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-muted);
}
.badge-storyboards {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-muted);
}
.badge-ratio {
  background: var(--bg-hover);
  color: var(--el-color-warning);
  border: 1px solid var(--el-color-warning);
  font-family: var(--font-mono);
}
.badge-style {
  background: var(--bg-inner);
  color: var(--text-muted);
  border: 1px solid var(--border-muted);
}
.badge-genre {
  background: var(--bg-hover);
  color: var(--el-color-warning);
  border: 1px solid var(--el-color-warning);
}
.project-meta {
  font-size: 0.75rem;
  color: var(--text-subtle);
  margin: 0;
}
.project-card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
}
.project-card-actions .el-button {
  --el-button-size: 28px;
  padding: 0;
}
.project-card-actions .el-button .el-icon {
  font-size: 14px;
}

/* 公共库弹窗 */
:global(.library-dialog .el-dialog__body) { padding-top: 8px; }

/* 编辑弹框内图片区 */
.lib-img-editor { display: flex; align-items: center; gap: 14px; }
.lib-img-thumb { width: 88px; height: 88px; border-radius: 8px; overflow: hidden; cursor: zoom-in; background: var(--bg-inner, #1c1c1e); border: 1px solid var(--border-color, #27272a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lib-img-thumb img { width: 100%; height: 100%; object-fit: cover; }
.lib-img-empty { color: var(--text-faint, #52525b); font-size: 26px; }
.lib-img-btns { display: flex; flex-direction: column; gap: 8px; }
.library-toolbar { margin-bottom: 12px; }
.library-list {
  min-height: 200px;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.library-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: var(--bg-inner);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.library-item-cover {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-inner);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.library-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.library-item-placeholder { font-size: 0.8rem; color: var(--text-subtle); }
.library-item-info { flex: 1; min-width: 0; }
.library-item-name { font-weight: 500; margin-bottom: 4px; color: var(--text-bright); }
.library-item-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; }
.library-item-actions { display: flex; gap: 8px; }
.library-empty { text-align: center; color: var(--text-subtle); padding: 40px 20px; }
.library-pagination { margin-top: 12px; display: flex; justify-content: center; }

/* ===== 亮色模式适配 ===== */
html.light .film-list {
  background: var(--bg-page);
  color: var(--text-primary);
}
html.light .header {
  background: var(--bg-card);
  border-bottom-color: var(--border-color);
  box-shadow: none;
}
html.light .logo-main {
  color: var(--text-bright);
  background: none;
  -webkit-text-fill-color: var(--text-bright);
  filter: none;
}
html.light .logo-sub {
  color: var(--text-muted);
  -webkit-text-fill-color: var(--text-muted);
}
html.light .project-card {
  background: var(--bg-card);
  border-color: var(--border-color);
  box-shadow: none;
  backdrop-filter: none;
}
html.light .project-card::before {
  display: none;
}
html.light .project-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-card);
  box-shadow: none;
}
html.light .action-card {
  background: var(--bg-inner);
  border-color: var(--border-muted);
  box-shadow: none;
}
html.light .action-card:hover {
  background: var(--bg-inner);
  border-color: var(--text-muted);
  box-shadow: none;
}
html.light .action-card-title { color: var(--text-bright); }
html.light .project-title { color: var(--text-bright); }
html.light .project-desc { color: var(--text-muted); }
html.light .project-meta { color: var(--text-faint); }
html.light .example-hint-text { color: var(--text-subtle); }
html.light .library-item {
  background: var(--bg-card);
  border-color: var(--border-color);
}
html.light .library-item-name { color: var(--text-primary); }
html.light .library-item-desc { color: var(--text-subtle); }
html.light .library-empty { color: var(--text-subtle); }
html.light .lib-img-thumb {
  background: var(--bg-inner);
  border-color: var(--border-color);
}
html.light .lib-img-empty { color: var(--text-muted); }
html.light .badge-status--draft {
  background: var(--bg-hover);
  color: var(--text-subtle);
  border-color: var(--border-muted);
}

/* ===== 图片放大预览 ===== */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
}
.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
  object-fit: contain;
}
</style>
