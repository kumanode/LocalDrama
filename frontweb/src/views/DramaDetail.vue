<template>
  <div class="drama-detail">
    <header class="header">
      <div class="header-inner">
        <h1 class="logo" @click="router.push('/')">
          <img class="logo-mark" src="/logo/logo-64.png" alt="" width="28" height="28" draggable="false" />
          <span class="logo-text">
            <span class="logo-main">{{ t('header.appTitle') }}</span>
            <span class="logo-sub">{{ t('header.appSubtitle') }}</span>
          </span>
        </h1>
        <span class="breadcrumb-sep">›</span>
        <span class="page-title">{{ drama?.title || t('dramaDetail.title') }}</span>
        <el-button class="btn-back-list" @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>{{ t('dramaDetail.backToList') }}
        </el-button>
        <div class="header-actions">
          <el-button type="primary" @click="goCreate">
            <el-icon><VideoPlay /></el-icon>{{ t('dramaDetail.enterCreation') }}
          </el-button>
          <el-button type="primary" plain @click="goCanvasMode">
            <el-icon><Grid /></el-icon>{{ t('dramaCanvas.canvasMode') }}
          </el-button>
        </div>
      </div>
    </header>

    <main class="main" v-loading="loading">
      <!-- 基本信息 + 设置 -->
      <section class="section card">
        <div class="section-title">{{ t('dramaDetail.dramaInfo') }}</div>
        <el-form :model="infoForm" label-width="110px" label-position="left" class="info-form">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item :label="t('common.title')">
                <el-input v-model="infoForm.title" :placeholder="t('common.title')" @blur="saveInfo" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('filmCreate.styleLabel')">
                <StylePickerButton
                  v-model="infoForm.style"
                  v-model:custom-prompt="infoForm.customStylePrompt"
                  :options="generationStyleOptions"
                  :placeholder="t('filmCreate.styleLabel')"
                  @change="saveInfo"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('filmCreate.aspectRatio16_9').split(' ')[0]">
                <el-select v-model="infoForm.aspect_ratio" style="width: 100%" @change="saveInfo">
                  <el-option :label="t('filmCreate.aspectRatio16_9')" value="16:9" />
                  <el-option :label="t('filmCreate.aspectRatio9_16')" value="9:16" />
                  <el-option :label="t('filmCreate.aspectRatio3_4')" value="3:4" />
                  <el-option :label="t('filmCreate.aspectRatio1_1')" value="1:1" />
                  <el-option :label="t('filmCreate.aspectRatio4_3')" value="4:3" />
                  <el-option :label="t('filmCreate.aspectRatio21_9')" value="21:9" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item :label="t('dramaDetail.storyPremise')">
                <el-input v-model="infoForm.description" type="textarea" :rows="3" :placeholder="t('dramaDetail.storyPremisePlaceholder')" @blur="saveInfo" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </section>

      <!-- 分集列表 -->
      <section class="section card">
        <div class="section-header">
          <div class="section-title">{{ t('dramaDetail.allEpisodes') }}</div>
          <span class="section-count">{{ t('dramaDetail.totalEpisodes', { count: episodes.length }) }}</span>
          <EpisodeBatchImportDialog ref="episodeBatchImportDialogRef" :start-episode-number="nextEpisodeNumber" style="margin-left: auto" @import="onBatchImportEpisodes" />
          <el-button size="small" type="primary" :loading="addingEpisode" @click="onAddEpisode">
            <el-icon><Plus /></el-icon>{{ t('dramaDetail.addEpisode') }}
          </el-button>
        </div>
        <div v-if="episodes.length === 0" class="empty-tip">{{ t('dramaDetail.noEpisodesTip') }}</div>
        <div v-else class="episode-grid">
          <div
            v-for="ep in episodes"
            :key="ep.id"
            class="episode-card"
            :title="t('dramaDetail.enterEpisodeTip')"
            @click="goEpisode(ep.id)"
          >
            <div class="episode-card-header">
              <span class="episode-num">{{ t('filmCreate.episodeNumber', { num: ep.episode_number ?? ep.number ?? '?' }) }}</span>
              <el-button
                size="small"
                type="danger"
                plain
                circle
                :icon="Delete"
                :loading="deletingEpisodeId === ep.id"
                @click.stop="onDeleteEpisode(ep)"
              />
            </div>
            <div class="episode-title">{{ ep.title || t('common.unnamed') }}</div>
            <div class="episode-preview">{{ (ep.script_content || '').slice(0, 20) || t('dramaDetail.noScript') }}</div>
            <div class="episode-stats">
              <span class="ep-stat">
                <span class="ep-stat-num">{{ ep.storyboards?.length ?? 0 }}</span> {{ t('dramaDetail.shotCount', { count: '' }).trim() }}
              </span>
              <span v-if="ep.status" class="ep-stat ep-stat--status" :class="'ep-status--' + ep.status">{{ epStatusLabel(ep.status) }}</span>
            </div>
            <div class="episode-enter">
              <el-icon class="episode-enter-icon"><VideoPlay /></el-icon>
              {{ t('dramaDetail.enterCreation') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 本剧资源库（Tab 切换） -->
      <section class="section card res-section">
        <nav class="res-tabbar">
          <span class="res-tab-group-label">{{ t('dramaDetail.library') }}</span>
          <button
            v-for="tTab in [{v:'lib-char',label: t('dramaDetail.characters')},{v:'lib-scene',label: t('dramaDetail.scenes')},{v:'lib-prop',label: t('dramaDetail.props')}]"
            :key="tTab.v"
            class="res-tab res-tab--lib"
            :class="{ active: activeResTab === tTab.v }"
            @click="activeResTab = tTab.v"
          >{{ tTab.label }}</button>
          <span class="res-tab-spacer"></span>
          <span class="res-tab-group-label res-tab-group-label--prod">{{ t('dramaDetail.productionResources') }}</span>
          <button
            v-for="tTab in [{v:'drama-char',label: t('dramaDetail.characters')},{v:'drama-scene',label: t('dramaDetail.scenes')},{v:'drama-prop',label: t('dramaDetail.props')}]"
            :key="tTab.v"
            class="res-tab res-tab--drama"
            :class="{ active: activeResTab === tTab.v }"
            @click="activeResTab = tTab.v"
          >{{ tTab.label }}</button>
        </nav>

        <!-- 角色库 -->
        <template v-if="activeResTab === 'lib-char'">
          <div class="library-toolbar">
            <el-input v-model="charKw" :placeholder="t('dramaDetail.searchChar')" clearable style="width: 200px" @input="onCharKwInput" />
            <el-button size="small" @click="openImport('char')">{{ t('dramaDetail.importFromLibrary') }}</el-button>
          </div>
          <div v-loading="charLoading" class="library-list">
            <div v-for="item in charList" :key="item.id" class="library-item">
              <div class="library-item-cover" @click="openPreview(assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.name || t('common.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || '').slice(0, 60) }}</div>
                <div class="library-item-actions">
                  <el-button size="small" @click="openEditChar(item)">{{ t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="deleteChar(item)">{{ t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!charLoading && charList.length === 0" class="library-empty">{{ t('dramaDetail.noCharLibTip') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="charPage" v-model:page-size="charPageSize" :total="charTotal" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @current-change="loadCharList" @size-change="loadCharList" />
          </div>
        </template>

        <!-- 场景库 -->
        <template v-if="activeResTab === 'lib-scene'">
          <div class="library-toolbar">
            <el-input v-model="sceneKw" :placeholder="t('dramaDetail.searchScene')" clearable style="width: 200px" @input="onSceneKwInput" />
            <el-button size="small" @click="openImport('scene')">{{ t('dramaDetail.importFromLibrary') }}</el-button>
          </div>
          <div v-loading="sceneLoading" class="library-list">
            <div v-for="item in sceneList" :key="item.id" class="library-item">
              <div class="library-item-cover" @click="openPreview(assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.location || item.time || t('common.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}</div>
                <div class="library-item-actions">
                  <el-button size="small" @click="openEditScene(item)">{{ t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="deleteScene(item)">{{ t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!sceneLoading && sceneList.length === 0" class="library-empty">{{ t('dramaDetail.noSceneLibTip') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="scenePage" v-model:page-size="scenePageSize" :total="sceneTotal" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @current-change="loadSceneList" @size-change="loadSceneList" />
          </div>
        </template>

        <!-- 道具库 -->
        <template v-if="activeResTab === 'lib-prop'">
          <div class="library-toolbar">
            <el-input v-model="propKw" :placeholder="t('dramaDetail.searchProp')" clearable style="width: 200px" @input="onPropKwInput" />
            <el-button size="small" @click="openImport('prop')">{{ t('dramaDetail.importFromLibrary') }}</el-button>
          </div>
          <div v-loading="propLoading" class="library-list">
            <div v-for="item in propList" :key="item.id" class="library-item">
              <div class="library-item-cover" @click="openPreview(assetImageUrl(item))">
                <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
              </div>
              <div class="library-item-info">
                <div class="library-item-name">{{ item.name || t('common.unnamed') }}</div>
                <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 60) }}</div>
                <div class="library-item-actions">
                  <el-button size="small" @click="openEditProp(item)">{{ t('common.edit') }}</el-button>
                  <el-button size="small" type="danger" plain @click="deleteProp(item)">{{ t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
            <div v-if="!propLoading && propList.length === 0" class="library-empty">{{ t('dramaDetail.noPropLibTip') }}</div>
          </div>
          <div class="library-pagination">
            <el-pagination v-model:current-page="propPage" v-model:page-size="propPageSize" :total="propTotal" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @current-change="loadPropList" @size-change="loadPropList" />
          </div>
        </template>
        <!-- 本剧制作角色 -->
        <template v-if="activeResTab === 'drama-char'">
          <div class="drama-res-list">
            <template v-if="drama?.characters?.length">
              <div v-for="item in drama.characters" :key="item.id" class="drama-res-item">
                <div class="drama-res-cover" @click="openPreview(assetImageUrl(item))">
                  <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                  <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
                </div>
                <div class="drama-res-info">
                  <div class="drama-res-name">{{ item.name || t('common.unnamed') }}</div>
                  <div class="drama-res-meta" v-if="item.role">
                    <el-tag size="small" type="info">{{ item.role === 'main' ? t('dramaDetail.charRoleMain') : item.role === 'supporting' ? t('dramaDetail.charRoleSupporting') : item.role }}</el-tag>
                  </div>
                  <div class="drama-res-desc">{{ (item.description || item.prompt || '').slice(0, 80) }}</div>
                  <div class="drama-res-actions">
                    <el-button size="small" @click="openEditDramaChar(item)">{{ t('common.edit') }}</el-button>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="library-empty">{{ t('dramaDetail.noDramaCharTip') }}</div>
          </div>
        </template>

        <!-- 本剧制作场景 -->
        <template v-if="activeResTab === 'drama-scene'">
          <div class="drama-res-list">
            <template v-if="drama?.scenes?.length">
              <div v-for="item in drama.scenes" :key="item.id" class="drama-res-item">
                <div class="drama-res-cover" @click="openPreview(assetImageUrl(item))">
                  <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                  <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
                </div>
                <div class="drama-res-info">
                  <div class="drama-res-name">{{ item.location || t('common.unnamed') }}</div>
                  <div class="drama-res-meta" v-if="item.time">
                    <el-tag size="small" type="info">{{ item.time }}</el-tag>
                  </div>
                  <div class="drama-res-desc">{{ (item.description || item.prompt || '').slice(0, 80) }}</div>
                  <div class="drama-res-actions">
                    <el-button size="small" @click="openEditDramaScene(item)">{{ t('common.edit') }}</el-button>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="library-empty">{{ t('dramaDetail.noDramaSceneTip') }}</div>
          </div>
        </template>

        <!-- 本剧制作道具 -->
        <template v-if="activeResTab === 'drama-prop'">
          <div class="drama-res-list">
            <template v-if="drama?.props?.length">
              <div v-for="item in drama.props" :key="item.id" class="drama-res-item">
                <div class="drama-res-cover" @click="openPreview(assetImageUrl(item))">
                  <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
                  <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
                </div>
                <div class="drama-res-info">
                  <div class="drama-res-name">{{ item.name || t('common.unnamed') }}</div>
                  <div class="drama-res-meta" v-if="item.type">
                    <el-tag size="small" type="info">{{ item.type }}</el-tag>
                  </div>
                  <div class="drama-res-desc">{{ (item.description || item.prompt || '').slice(0, 80) }}</div>
                  <div class="drama-res-actions">
                    <el-button size="small" @click="openEditDramaProp(item)">{{ t('common.edit') }}</el-button>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="library-empty">{{ t('dramaDetail.noDramaPropTip') }}</div>
          </div>
        </template>
      </section>
    </main>

    <!-- 制作角色 编辑 -->
    <el-dialog v-model="editDramaCharVisible" :title="t('dramaDetail.editDramaChar')" width="500px" @close="editDramaCharForm = null">
      <el-form v-if="editDramaCharForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editDramaCharForm))">
              <img v-if="editDramaCharForm.image_url || editDramaCharForm.local_path" :src="assetImageUrl(editDramaCharForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editDramaCharForm.imgUploading" @click="dramaCharFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editDramaCharForm.imgGenerating" @click="generateDramaCharImg">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="dramaCharFileRef" type="file" accept="image/*" style="display:none" @change="uploadDramaCharImg" />
        </el-form-item>
        <el-form-item :label="t('common.name')"><el-input v-model="editDramaCharForm.name" /></el-form-item>
        <el-form-item :label="t('dramaDetail.charRole')">
          <el-select v-model="editDramaCharForm.role" style="width:100%">
            <el-option :label="t('dramaDetail.charRoleMain')" value="main" />
            <el-option :label="t('dramaDetail.charRoleSupporting')" value="supporting" />
            <el-option :label="t('dramaDetail.charRoleMinor')" value="minor" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editDramaCharForm.description" type="textarea" :rows="3" :placeholder="t('filmCreate.charDescription')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.charPersonality')"><el-input v-model="editDramaCharForm.personality" :placeholder="t('dramaDetail.charPersonalityPlaceholder')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.charAppearance')"><el-input v-model="editDramaCharForm.appearance" type="textarea" :rows="2" :placeholder="t('dramaDetail.charAppearancePlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDramaCharVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editDramaCharSaving" @click="saveDramaChar">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 制作场景 编辑 -->
    <el-dialog v-model="editDramaSceneVisible" :title="t('dramaDetail.editDramaScene')" width="500px" @close="editDramaSceneForm = null">
      <el-form v-if="editDramaSceneForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editDramaSceneForm))">
              <img v-if="editDramaSceneForm.image_url || editDramaSceneForm.local_path" :src="assetImageUrl(editDramaSceneForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editDramaSceneForm.imgUploading" @click="dramaSceneFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editDramaSceneForm.imgGenerating" @click="generateDramaSceneImg">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="dramaSceneFileRef" type="file" accept="image/*" style="display:none" @change="uploadDramaSceneImg" />
        </el-form-item>
        <el-form-item :label="t('dramaDetail.sceneLocation')"><el-input v-model="editDramaSceneForm.location" /></el-form-item>
        <el-form-item :label="t('dramaDetail.sceneTime')"><el-input v-model="editDramaSceneForm.time" :placeholder="t('dramaDetail.sceneTimePlaceholder')" /></el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editDramaSceneForm.description" type="textarea" :rows="3" :placeholder="t('filmCreate.charDescription')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.scenePrompt')"><el-input v-model="editDramaSceneForm.prompt" type="textarea" :rows="2" :placeholder="t('dramaDetail.scenePromptPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDramaSceneVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editDramaSceneSaving" @click="saveDramaScene">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 制作道具 编辑 -->
    <el-dialog v-model="editDramaPropVisible" :title="t('dramaDetail.editDramaProp')" width="500px" @close="editDramaPropForm = null">
      <el-form v-if="editDramaPropForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editDramaPropForm))">
              <img v-if="editDramaPropForm.image_url || editDramaPropForm.local_path" :src="assetImageUrl(editDramaPropForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editDramaPropForm.imgUploading" @click="dramaPropFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editDramaPropForm.imgGenerating" @click="generateDramaPropImg">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="dramaPropFileRef" type="file" accept="image/*" style="display:none" @change="uploadDramaPropImg" />
        </el-form-item>
        <el-form-item :label="t('common.name')"><el-input v-model="editDramaPropForm.name" /></el-form-item>
        <el-form-item :label="t('dramaDetail.propType')"><el-input v-model="editDramaPropForm.type" :placeholder="t('dramaDetail.propTypePlaceholder')" /></el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editDramaPropForm.description" type="textarea" :rows="3" :placeholder="t('filmCreate.charDescription')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.propPrompt')"><el-input v-model="editDramaPropForm.prompt" type="textarea" :rows="2" :placeholder="t('dramaDetail.propPromptPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDramaPropVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editDramaPropSaving" @click="saveDramaProp">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑角色 -->
    <el-dialog v-model="editCharVisible" :title="t('dramaDetail.editCharLib')" width="480px" @close="editCharForm = null">
      <el-form v-if="editCharForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editCharForm))">
              <img v-if="editCharForm.image_url || editCharForm.local_path" :src="assetImageUrl(editCharForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editCharForm.imgUploading" @click="charFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editCharForm.imgGenerating" @click="doGenerateLibImg(editCharForm, (editCharForm.name + (editCharForm.description ? ', ' + editCharForm.description : '')), characterLibraryAPI, loadCharList)">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="charFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editCharForm, characterLibraryAPI, loadCharList)" />
        </el-form-item>
        <el-form-item :label="t('common.name')"><el-input v-model="editCharForm.name" /></el-form-item>
        <el-form-item :label="t('dramaDetail.category')"><el-input v-model="editCharForm.category" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editCharForm.description" type="textarea" :rows="3" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.tags')"><el-input v-model="editCharForm.tags" :placeholder="t('dramaDetail.tagsPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editCharVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editCharSaving" @click="saveChar">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑场景 -->
    <el-dialog v-model="editSceneVisible" :title="t('dramaDetail.editSceneLib')" width="480px" @close="editSceneForm = null">
      <el-form v-if="editSceneForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editSceneForm))">
              <img v-if="editSceneForm.image_url || editSceneForm.local_path" :src="assetImageUrl(editSceneForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editSceneForm.imgUploading" @click="sceneFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editSceneForm.imgGenerating" @click="doGenerateLibImg(editSceneForm, ([editSceneForm.location, editSceneForm.time, editSceneForm.description].filter(Boolean).join(', ')), sceneLibraryAPI, loadSceneList)">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="sceneFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editSceneForm, sceneLibraryAPI, loadSceneList)" />
        </el-form-item>
        <el-form-item :label="t('dramaDetail.sceneLocation')"><el-input v-model="editSceneForm.location" /></el-form-item>
        <el-form-item :label="t('dramaDetail.sceneTime')"><el-input v-model="editSceneForm.time" :placeholder="t('dramaDetail.sceneTimePlaceholder')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.category')"><el-input v-model="editSceneForm.category" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editSceneForm.description" type="textarea" :rows="3" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.tags')"><el-input v-model="editSceneForm.tags" :placeholder="t('dramaDetail.tagsPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editSceneVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editSceneSaving" @click="saveScene">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑道具 -->
    <el-dialog v-model="editPropVisible" :title="t('dramaDetail.editPropLib')" width="480px" @close="editPropForm = null">
      <el-form v-if="editPropForm" label-width="80px">
        <el-form-item :label="t('filmCreate.avatarImage')">
          <div class="lib-img-editor">
            <div class="lib-img-thumb" @click="openPreview(assetImageUrl(editPropForm))">
              <img v-if="editPropForm.image_url || editPropForm.local_path" :src="assetImageUrl(editPropForm)" />
              <div v-else class="lib-img-empty"><el-icon><PictureFilled /></el-icon></div>
            </div>
            <div class="lib-img-btns">
              <el-button size="small" :loading="editPropForm.imgUploading" @click="propFileRef.click()">{{ t('dramaDetail.uploadImage') }}</el-button>
              <el-button size="small" type="primary" :loading="editPropForm.imgGenerating" @click="doGenerateLibImg(editPropForm, (editPropForm.name + (editPropForm.description ? ', ' + editPropForm.description : '')), propLibraryAPI, loadPropList)">{{ t('dramaDetail.aiGenerate') }}</el-button>
            </div>
          </div>
          <input ref="propFileRef" type="file" accept="image/*" style="display:none" @change="e => doUploadLibImg(e, editPropForm, propLibraryAPI, loadPropList)" />
        </el-form-item>
        <el-form-item :label="t('common.name')"><el-input v-model="editPropForm.name" /></el-form-item>
        <el-form-item :label="t('dramaDetail.category')"><el-input v-model="editPropForm.category" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('filmCreate.charDescription')"><el-input v-model="editPropForm.description" type="textarea" :rows="3" :placeholder="t('dramaDetail.optional')" /></el-form-item>
        <el-form-item :label="t('dramaDetail.tags')"><el-input v-model="editPropForm.tags" :placeholder="t('dramaDetail.tagsPlaceholder')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPropVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="editPropSaving" @click="saveProp">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 从素材库导入 -->
    <el-dialog
      v-model="importVisible"
      :title="t('dramaDetail.importTitle', { type: importType === 'char' ? t('dramaDetail.characters') : importType === 'scene' ? t('dramaDetail.scenes') : t('dramaDetail.props') })"
      width="760px"
      destroy-on-close
      @open="loadImportList"
    >
      <div class="library-toolbar">
        <el-input v-model="importKw" :placeholder="t('dramaDetail.searchKeyword')" clearable style="width: 220px" @input="onImportKwInput" />
        <span class="import-tip">{{ t('dramaDetail.importTip') }}</span>
      </div>
      <div v-loading="importLoading" class="library-list import-list">
        <div v-for="item in importList" :key="item.id" class="library-item">
          <div class="library-item-cover" @click="openPreview(assetImageUrl(item))">
            <img v-if="item.image_url || item.local_path" :src="assetImageUrl(item)" alt="" />
            <span v-else class="library-placeholder">{{ t('dramaDetail.noImage') }}</span>
          </div>
          <div class="library-item-info">
            <div class="library-item-name">
              {{ importType === 'scene' ? (item.location || item.time || t('common.unnamed')) : (item.name || t('common.unnamed')) }}
            </div>
            <div class="library-item-desc">{{ (item.description || item.prompt || '').slice(0, 80) }}</div>
            <div class="library-item-actions">
              <el-button size="small" type="primary" :loading="importingId === item.id" @click="doImport(item)">{{ t('dramaDetail.import') }}</el-button>
            </div>
          </div>
        </div>
        <div v-if="!importLoading && importList.length === 0" class="library-empty">{{ t('dramaDetail.emptyLibraryTip') }}</div>
      </div>
      <div class="library-pagination">
        <el-pagination
          v-model:current-page="importPage"
          v-model:page-size="importPageSize"
          :total="importTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="loadImportList"
          @size-change="loadImportList"
        />
      </div>
      <template #footer>
        <el-button @click="importVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 图片预览 -->
    <Teleport to="body">
      <div v-if="previewUrl" class="image-preview-overlay" @click="previewUrl = null">
        <img :src="previewUrl" alt="" class="image-preview-img" @click.stop="previewUrl = null" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, VideoPlay, Plus, Delete, PictureFilled, Grid } from '@element-plus/icons-vue'
import EpisodeBatchImportDialog from '@/components/EpisodeBatchImportDialog.vue'
import StylePickerButton from '@/components/StylePickerButton.vue'
import { useI18n } from '@/i18n'
import { useAgentContext } from '@/stores/agentContext'
import { dramaAPI } from '@/api/drama'
import { characterLibraryAPI } from '@/api/characterLibrary'
import { sceneLibraryAPI } from '@/api/sceneLibrary'
import { propLibraryAPI } from '@/api/propLibrary'
import { uploadAPI } from '@/api/upload'
import { imagesAPI } from '@/api/images'
import { taskAPI } from '@/api/task'
import { characterAPI } from '@/api/characters'
import { sceneAPI } from '@/api/scenes'
import { propAPI } from '@/api/props'
import {
  generationStyleOptions,
  stylePromptMetadataForSave,
  backfillDramaStylePromptMetadataIfNeeded,
  CUSTOM_STYLE_VALUE,
} from '@/constants/styleOptions'

const route = useRoute()
const { t } = useI18n()
const router = useRouter()
const dramaId = Number(route.params.id)

// 图片编辑 – 文件输入 refs（各资源类型独立）
const charFileRef  = ref(null)
const sceneFileRef = ref(null)
const propFileRef  = ref(null)

// 制作资源编辑
const dramaCharFileRef  = ref(null)
const dramaSceneFileRef = ref(null)
const dramaPropFileRef  = ref(null)

const editDramaCharVisible = ref(false)
const editDramaCharForm    = ref(null)
const editDramaCharSaving  = ref(false)

const editDramaSceneVisible = ref(false)
const editDramaSceneForm    = ref(null)
const editDramaSceneSaving  = ref(false)

const editDramaPropVisible = ref(false)
const editDramaPropForm    = ref(null)
const editDramaPropSaving  = ref(false)
const episodeBatchImportDialogRef = ref(null)

// 共享：上传图片到库条目
async function doUploadLibImg(event, form, api, reloadFn) {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  if (!file || !form?.id) return
  form.imgUploading = true
  try {
    const res = await uploadAPI.uploadImage(file, { dramaId })
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

// 共享：AI 生成图片到库条目
async function doGenerateLibImg(form, prompt, api, reloadFn) {
  if (!prompt?.trim()) { ElMessage.warning(t('filmList.fillNameOrDescFirst')); return }
  form.imgGenerating = true
  try {
    const res = await imagesAPI.create({ prompt: prompt.trim(), drama_id: dramaId || null })
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

// ── 制作资源编辑函数 ────────────────────────────────────────────────────────

function openEditDramaChar(item) {
  editDramaCharForm.value = {
    id: item.id, name: item.name ?? '', role: item.role ?? 'minor',
    description: item.description ?? '', personality: item.personality ?? '',
    appearance: item.appearance ?? '',
    image_url: item.image_url ?? '', local_path: item.local_path ?? null,
    imgUploading: false, imgGenerating: false
  }
  editDramaCharVisible.value = true
}
async function saveDramaChar() {
  if (!editDramaCharForm.value?.id) return
  editDramaCharSaving.value = true
  try {
    await characterAPI.update(editDramaCharForm.value.id, {
      name: editDramaCharForm.value.name,
      role: editDramaCharForm.value.role || null,
      description: editDramaCharForm.value.description || null,
      personality: editDramaCharForm.value.personality || null,
      appearance: editDramaCharForm.value.appearance || null,
    })
    ElMessage.success(t('filmList.saved'))
    editDramaCharVisible.value = false
    loadDrama()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) }
  finally { editDramaCharSaving.value = false }
}
async function uploadDramaCharImg(event) {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  const form = editDramaCharForm.value
  if (!file || !form?.id) return
  form.imgUploading = true
  try {
    const res = await uploadAPI.uploadImage(file, { dramaId })
    const data = res?.data ?? res
    const url = data?.url || data?.path || data?.local_path
    if (!url) { ElMessage.error(t('filmList.uploadNoUrl')); return }
    form.image_url = url
    form.local_path = data?.local_path ?? null
    await characterAPI.putImage(form.id, { image_url: url, local_path: null })
    loadDrama()
    ElMessage.success(t('filmList.imageUpdated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.uploadFailed')) }
  finally { form.imgUploading = false }
}
async function generateDramaCharImg() {
  const form = editDramaCharForm.value
  if (!form?.id) return
  form.imgGenerating = true
  try {
    const res = await characterAPI.generateImage(form.id, null, null)
    const data = res?.data ?? res
    const taskId = data?.task_id
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
    form.image_url = task.result?.image_url || ''
    form.local_path = task.result?.local_path ?? null
    loadDrama()
    ElMessage.success(t('filmList.aiImageGenerated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.generateFailed')) }
  finally { form.imgGenerating = false }
}

function openEditDramaScene(item) {
  editDramaSceneForm.value = {
    id: item.id, location: item.location ?? '', time: item.time ?? '',
    description: item.description ?? '', prompt: item.prompt ?? '',
    image_url: item.image_url ?? '', local_path: item.local_path ?? null,
    imgUploading: false, imgGenerating: false
  }
  editDramaSceneVisible.value = true
}
async function saveDramaScene() {
  if (!editDramaSceneForm.value?.id) return
  editDramaSceneSaving.value = true
  try {
    await sceneAPI.update(editDramaSceneForm.value.id, {
      location: editDramaSceneForm.value.location,
      time: editDramaSceneForm.value.time || null,
      description: editDramaSceneForm.value.description || null,
      prompt: editDramaSceneForm.value.prompt || null,
    })
    ElMessage.success(t('filmList.saved'))
    editDramaSceneVisible.value = false
    loadDrama()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) }
  finally { editDramaSceneSaving.value = false }
}
async function uploadDramaSceneImg(event) {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  const form = editDramaSceneForm.value
  if (!file || !form?.id) return
  form.imgUploading = true
  try {
    const res = await uploadAPI.uploadImage(file, { dramaId })
    const data = res?.data ?? res
    const url = data?.url || data?.path || data?.local_path
    if (!url) { ElMessage.error(t('filmList.uploadNoUrl')); return }
    form.image_url = url
    form.local_path = data?.local_path ?? null
    await sceneAPI.update(form.id, { image_url: url, local_path: null })
    loadDrama()
    ElMessage.success(t('filmList.imageUpdated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.uploadFailed')) }
  finally { form.imgUploading = false }
}
async function generateDramaSceneImg() {
  const form = editDramaSceneForm.value
  if (!form?.id) return
  const prompt = [form.location, form.time, form.description].filter(Boolean).join(', ')
  if (!prompt) { ElMessage.warning(t('filmList.fillLocationOrDescFirst')); return }
  form.imgGenerating = true
  try {
    const res = await sceneAPI.generateImage({ scene_id: form.id, drama_id: dramaId, prompt })
    const data = res?.data ?? res
    const taskId = data?.task_id
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
    form.image_url = task.result?.image_url || ''
    form.local_path = task.result?.local_path ?? null
    loadDrama()
    ElMessage.success(t('filmList.aiImageGenerated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.generateFailed')) }
  finally { form.imgGenerating = false }
}

function openEditDramaProp(item) {
  editDramaPropForm.value = {
    id: item.id, name: item.name ?? '', type: item.type ?? '',
    description: item.description ?? '', prompt: item.prompt ?? '',
    image_url: item.image_url ?? '', local_path: item.local_path ?? null,
    imgUploading: false, imgGenerating: false
  }
  editDramaPropVisible.value = true
}
async function saveDramaProp() {
  if (!editDramaPropForm.value?.id) return
  editDramaPropSaving.value = true
  try {
    await propAPI.update(editDramaPropForm.value.id, {
      name: editDramaPropForm.value.name,
      type: editDramaPropForm.value.type || null,
      description: editDramaPropForm.value.description || null,
      prompt: editDramaPropForm.value.prompt || null,
    })
    ElMessage.success(t('filmList.saved'))
    editDramaPropVisible.value = false
    loadDrama()
  } catch (e) { ElMessage.error(e.message || t('filmList.saveFailed')) }
  finally { editDramaPropSaving.value = false }
}
async function uploadDramaPropImg(event) {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  const form = editDramaPropForm.value
  if (!file || !form?.id) return
  form.imgUploading = true
  try {
    const res = await uploadAPI.uploadImage(file, { dramaId })
    const data = res?.data ?? res
    const url = data?.url || data?.path || data?.local_path
    if (!url) { ElMessage.error(t('filmList.uploadNoUrl')); return }
    form.image_url = url
    form.local_path = data?.local_path ?? null
    await propAPI.update(form.id, { image_url: url, local_path: null })
    loadDrama()
    ElMessage.success(t('filmList.imageUpdated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.uploadFailed')) }
  finally { form.imgUploading = false }
}
async function generateDramaPropImg() {
  const form = editDramaPropForm.value
  if (!form?.id) return
  form.imgGenerating = true
  try {
    const res = await propAPI.generateImage(form.id, null, null)
    const data = res?.data ?? res
    const taskId = data?.task_id
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
    form.image_url = task.result?.image_url || ''
    form.local_path = task.result?.local_path ?? null
    loadDrama()
    ElMessage.success(t('filmList.aiImageGenerated'))
  } catch (e) { ElMessage.error(e.message || t('filmList.generateFailed')) }
  finally { form.imgGenerating = false }
}

const loading = ref(false)
const drama = ref(null)
const episodes = ref([])
const nextEpisodeNumber = computed(() => (
  episodes.value.length > 0
    ? Math.max(...episodes.value.map((e) => Number(e.episode_number) || 0), 0) + 1
    : 1
))

const infoForm = reactive({ title: '', description: '', genre: '', style: '', customStylePrompt: '', aspect_ratio: '16:9' })

function assetImageUrl(item) {
  if (!item) return ''
  const lp = item.local_path && String(item.local_path).trim()
  if (lp) return '/static/' + lp.replace(/^\//, '')
  return item.image_url || ''
}

function formatDate(val) {
  if (!val) return ''
  return new Date(val).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function loadDrama() {
  loading.value = true
  try {
    let d = await dramaAPI.get(dramaId)
    d = await backfillDramaStylePromptMetadataIfNeeded(dramaAPI, dramaId, d)
    drama.value = d
    episodes.value = d.episodes || []
    useAgentContext().setEpisodes(episodes.value)
    infoForm.title = d.title || ''
    infoForm.description = d.description || ''
    infoForm.genre = d.genre || ''
    infoForm.style = d.style || ''
    if (infoForm.style === CUSTOM_STYLE_VALUE) {
      infoForm.customStylePrompt = (d.metadata?.style_prompt_zh || d.metadata?.style_prompt_en || '').toString()
    } else {
      infoForm.customStylePrompt = ''
    }
    infoForm.aspect_ratio = d.metadata?.aspect_ratio || '16:9'
  } catch (e) {
    ElMessage.error(e.message || t('filmList.loadFailed'))
  } finally {
    loading.value = false
  }
}

let infoSaveTimer = null
function saveInfo() {
  if (infoForm.style === CUSTOM_STYLE_VALUE && !(infoForm.customStylePrompt || '').trim()) {
    ElMessage.warning(t('filmList.fillStyleDescFirst'))
    return
  }
  if (infoSaveTimer) clearTimeout(infoSaveTimer)
  infoSaveTimer = setTimeout(async () => {
    try {
      await dramaAPI.update(dramaId, { title: infoForm.title, description: infoForm.description })
      await dramaAPI.saveOutline(dramaId, {
        genre: infoForm.genre || undefined,
        style: infoForm.style || undefined,
        metadata: {
          ...stylePromptMetadataForSave(infoForm.style, infoForm.customStylePrompt),
          aspect_ratio: infoForm.aspect_ratio || '16:9',
        },
      })
    } catch (e) {
      console.error('saveInfo failed', e)
    }
  }, 600)
}

function goCreate() {
  router.push(`/film/${dramaId}`)
}

function goCanvasMode() {
  router.push(`/film/${dramaId}/canvas`)
}

function goEpisode(epId) {
  router.push(`/film/${dramaId}?episode=${epId}`)
}

function epStatusLabel(status) {
  const map = {
    draft: t('filmList.statusDraft'),
    processing: t('dramaCanvas.statusRunning'),
    completed: t('dramaCanvas.statusCompleted'),
    failed: t('dramaCanvas.statusFailed'),
  }
  return map[status] || status
}

async function onBatchImportEpisodes(importedEpisodes) {
  const current = episodes.value.map((ep, i) => ({
    episode_number: ep.episode_number ?? i + 1,
    title: ep.title || t('filmCreate.episodeNumber', { num: ep.episode_number ?? i + 1 }),
    script_content: ep.script_content || '',
    description: ep.description ?? null,
    duration: ep.duration ?? 0,
  }))
  await dramaAPI.saveEpisodes(dramaId, [...current, ...importedEpisodes])
  await loadDrama()
}

const addingEpisode = ref(false)
const deletingEpisodeId = ref(null)

async function onDeleteEpisode(ep) {
  const label = `${t('filmCreate.episodeNumber', { num: ep.episode_number ?? ep.number ?? '?' })} "${ep.title || t('common.unnamed')}"`
  try {
    await ElMessageBox.confirm(
      t('dramaDetail.deleteEpisodeConfirm', { num: ep.episode_number ?? ep.number ?? '?' }),
      t('dramaDetail.deleteEpisodeTitle'),
      {
        type: 'warning',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
      }
    )
  } catch { return }
  deletingEpisodeId.value = ep.id
  try {
    const remaining = episodes.value
      .filter((e) => e.id !== ep.id)
      .map((e, i) => ({
        episode_number: e.episode_number ?? i + 1,
        title: e.title || t('filmCreate.episodeNumber', { num: e.episode_number ?? i + 1 }),
        script_content: e.script_content || '',
        description: e.description ?? null,
        duration: e.duration ?? 0,
      }))
    await dramaAPI.saveEpisodes(dramaId, remaining)
    ElMessage.success(t('dramaDetail.episodeDeleted'))
    await loadDrama()
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.msgDeleteFailed'))
  } finally {
    deletingEpisodeId.value = null
  }
}

async function onAddEpisode() {
  addingEpisode.value = true
  try {
    const list = episodes.value
    const nextNum = list.length > 0
      ? Math.max(...list.map((e) => Number(e.episode_number) || 0), 0) + 1
      : 1
    const updated = list.map((ep, i) => ({
      episode_number: ep.episode_number ?? i + 1,
      title: ep.title || t('filmCreate.episodeNumber', { num: ep.episode_number ?? i + 1 }),
      script_content: ep.script_content || '',
      description: ep.description ?? null,
      duration: ep.duration ?? 0
    }))
    updated.push({ episode_number: nextNum, title: t('filmCreate.episodeNumber', { num: nextNum }), script_content: '', description: null, duration: 0 })
    await dramaAPI.saveEpisodes(dramaId, updated)
    ElMessage.success(t('dramaDetail.episodeAdded'))
    await loadDrama()
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.msgAddFailed'))
  } finally {
    addingEpisode.value = false
  }
}

// ---------- 资源库 Tab ----------
const activeResTab = ref('lib-char') // lib-char | lib-scene | lib-prop | drama-char | drama-scene | drama-prop
const previewUrl = ref(null)
function openPreview(url) { if (url) previewUrl.value = url }

// 角色
const charList = ref([]), charLoading = ref(false), charPage = ref(1), charPageSize = ref(20), charTotal = ref(0), charKw = ref('')
let charKwTimer = null
async function loadCharList() {
  charLoading.value = true
  try {
    const res = await characterLibraryAPI.list({ drama_id: dramaId, page: charPage.value, page_size: charPageSize.value, keyword: charKw.value || undefined })
    charList.value = res?.items ?? []; charTotal.value = res?.pagination?.total ?? 0
  } catch { charList.value = [] } finally { charLoading.value = false }
}
function onCharKwInput() { if (charKwTimer) clearTimeout(charKwTimer); charKwTimer = setTimeout(() => { charPage.value = 1; loadCharList() }, 300) }
const editCharVisible = ref(false), editCharForm = ref(null), editCharSaving = ref(false)
function openEditChar(item) {
  editCharForm.value = { id: item.id, name: item.name ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  editCharVisible.value = true
}
async function saveChar() {
  if (!editCharForm.value?.id) return; editCharSaving.value = true
  try {
    await characterLibraryAPI.update(editCharForm.value.id, { name: editCharForm.value.name, category: editCharForm.value.category || null, description: editCharForm.value.description || null, tags: editCharForm.value.tags || null, image_url: editCharForm.value.image_url || null, local_path: editCharForm.value.local_path ?? null })
    ElMessage.success(t('dramaDetail.saved')); editCharVisible.value = false; loadCharList()
  } catch (e) { ElMessage.error(e.message || t('filmCreate.msgSaveFailed')) } finally { editCharSaving.value = false }
}
async function deleteChar(item) {
  try { await ElMessageBox.confirm(t('dramaDetail.deleteConfirm'), t('common.confirm'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await characterLibraryAPI.delete(item.id); ElMessage.success(t('filmCreate.msgCharDeleted')); loadCharList() } catch (e) { ElMessage.error(e.message || t('filmCreate.msgDeleteFailed')) }
}

// 场景
const sceneList = ref([]), sceneLoading = ref(false), scenePage = ref(1), scenePageSize = ref(20), sceneTotal = ref(0), sceneKw = ref('')
let sceneKwTimer = null
async function loadSceneList() {
  sceneLoading.value = true
  try {
    const res = await sceneLibraryAPI.list({ drama_id: dramaId, page: scenePage.value, page_size: scenePageSize.value, keyword: sceneKw.value || undefined })
    sceneList.value = res?.items ?? []; sceneTotal.value = res?.pagination?.total ?? 0
  } catch { sceneList.value = [] } finally { sceneLoading.value = false }
}
function onSceneKwInput() { if (sceneKwTimer) clearTimeout(sceneKwTimer); sceneKwTimer = setTimeout(() => { scenePage.value = 1; loadSceneList() }, 300) }
const editSceneVisible = ref(false), editSceneForm = ref(null), editSceneSaving = ref(false)
function openEditScene(item) {
  editSceneForm.value = { id: item.id, location: item.location ?? '', time: item.time ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  editSceneVisible.value = true
}
async function saveScene() {
  if (!editSceneForm.value?.id) return; editSceneSaving.value = true
  try {
    await sceneLibraryAPI.update(editSceneForm.value.id, { location: editSceneForm.value.location, time: editSceneForm.value.time || null, category: editSceneForm.value.category || null, description: editSceneForm.value.description || null, tags: editSceneForm.value.tags || null, image_url: editSceneForm.value.image_url || null, local_path: editSceneForm.value.local_path ?? null })
    ElMessage.success(t('dramaDetail.saved')); editSceneVisible.value = false; loadSceneList()
  } catch (e) { ElMessage.error(e.message || t('filmCreate.msgSaveFailed')) } finally { editSceneSaving.value = false }
}
async function deleteScene(item) {
  try { await ElMessageBox.confirm(t('dramaDetail.deleteConfirm'), t('common.confirm'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await sceneLibraryAPI.delete(item.id); ElMessage.success(t('filmCreate.msgSceneDeleted')); loadSceneList() } catch (e) { ElMessage.error(e.message || t('filmCreate.msgDeleteFailed')) }
}

// 道具
const propList = ref([]), propLoading = ref(false), propPage = ref(1), propPageSize = ref(20), propTotal = ref(0), propKw = ref('')
let propKwTimer = null
async function loadPropList() {
  propLoading.value = true
  try {
    const res = await propLibraryAPI.list({ drama_id: dramaId, page: propPage.value, page_size: propPageSize.value, keyword: propKw.value || undefined })
    propList.value = res?.items ?? []; propTotal.value = res?.pagination?.total ?? 0
  } catch { propList.value = [] } finally { propLoading.value = false }
}
function onPropKwInput() { if (propKwTimer) clearTimeout(propKwTimer); propKwTimer = setTimeout(() => { propPage.value = 1; loadPropList() }, 300) }
const editPropVisible = ref(false), editPropForm = ref(null), editPropSaving = ref(false)
function openEditProp(item) {
  editPropForm.value = { id: item.id, name: item.name ?? '', category: item.category ?? '', description: item.description ?? '', tags: item.tags ?? '', image_url: item.image_url ?? '', local_path: item.local_path ?? null, imgUploading: false, imgGenerating: false }
  editPropVisible.value = true
}
async function saveProp() {
  if (!editPropForm.value?.id) return; editPropSaving.value = true
  try {
    await propLibraryAPI.update(editPropForm.value.id, { name: editPropForm.value.name, category: editPropForm.value.category || null, description: editPropForm.value.description || null, tags: editPropForm.value.tags || null, image_url: editPropForm.value.image_url || null, local_path: editPropForm.value.local_path ?? null })
    ElMessage.success(t('dramaDetail.saved')); editPropVisible.value = false; loadPropList()
  } catch (e) { ElMessage.error(e.message || t('filmCreate.msgSaveFailed')) } finally { editPropSaving.value = false }
}
async function deleteProp(item) {
  try { await ElMessageBox.confirm(t('dramaDetail.deleteConfirm'), t('common.confirm'), { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }) } catch { return }
  try { await propLibraryAPI.delete(item.id); ElMessage.success(t('filmCreate.msgPropDeleted')); loadPropList() } catch (e) { ElMessage.error(e.message || t('filmCreate.msgDeleteFailed')) }
}

// ---------- 从素材库导入 ----------
const importVisible = ref(false)
const importType = ref('char') // 'char' | 'scene' | 'prop'
const importList = ref([])
const importLoading = ref(false)
const importPage = ref(1)
const importPageSize = ref(20)
const importTotal = ref(0)
const importKw = ref('')
const importingId = ref(null)
let importKwTimer = null

function openImport(type) {
  importType.value = type
  importKw.value = ''
  importPage.value = 1
  importVisible.value = true
}

async function loadImportList() {
  importLoading.value = true
  try {
    const api = importType.value === 'char' ? characterLibraryAPI
      : importType.value === 'scene' ? sceneLibraryAPI : propLibraryAPI
    // 不传 drama_id，获取全局素材库（所有记录）
    const res = await api.list({ page: importPage.value, page_size: importPageSize.value, keyword: importKw.value || undefined, global: 1 })
    importList.value = res?.items ?? []
    importTotal.value = res?.pagination?.total ?? 0
  } catch { importList.value = [] } finally { importLoading.value = false }
}

function onImportKwInput() {
  if (importKwTimer) clearTimeout(importKwTimer)
  importKwTimer = setTimeout(() => { importPage.value = 1; loadImportList() }, 300)
}

async function doImport(item) {
  importingId.value = item.id
  try {
    if (importType.value === 'char') {
      await characterLibraryAPI.create({
        drama_id: dramaId,
        name: item.name || '',
        image_url: item.image_url || null,
        local_path: item.local_path || null,
        description: item.description || null,
        category: item.category || null,
        tags: item.tags || null,
        source_type: 'imported',
      })
      loadCharList()
    } else if (importType.value === 'scene') {
      await sceneLibraryAPI.create({
        drama_id: dramaId,
        location: item.location || '',
        time: item.time || null,
        prompt: item.prompt || null,
        description: item.description || null,
        image_url: item.image_url || null,
        local_path: item.local_path || null,
        category: item.category || null,
        tags: item.tags || null,
        source_type: 'imported',
      })
      loadSceneList()
    } else {
      await propLibraryAPI.create({
        drama_id: dramaId,
        name: item.name || '',
        description: item.description || null,
        prompt: item.prompt || null,
        image_url: item.image_url || null,
        local_path: item.local_path || null,
        category: item.category || null,
        tags: item.tags || null,
        source_type: 'imported',
      })
      loadPropList()
    }
    ElMessage.success(t('filmList.importedToDramaLibrary'))
  } catch (e) {
    ElMessage.error(e.message || t('filmList.importFailedSimple'))
  } finally {
    importingId.value = null
  }
}

watch(activeResTab, (tab) => {
  if (tab === 'lib-char') loadCharList()
  else if (tab === 'lib-scene') loadSceneList()
  else if (tab === 'lib-prop') loadPropList()
})

function onAgentChanged(event) {
  if (Number(event.detail?.dramaId) !== dramaId) return
  loadDrama()
  loadCharList()
  loadSceneList()
}

onMounted(() => {
  window.addEventListener('lmd-agent-changed', onAgentChanged)
  loadDrama()
  loadCharList()
  if (route.query.importBatch) {
    setTimeout(() => {
      episodeBatchImportDialogRef.value?.openDialog?.()
    }, 0)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('lmd-agent-changed', onAgentChanged)
  useAgentContext().clear()
})
</script>

<style scoped>
.drama-detail {
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
.logo {
  margin: 0;
  cursor: pointer;
  display: flex;
  line-height: 1;
  transition: filter 0.3s;
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
.logo:hover { opacity: 0.85; }
.logo-main {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-bright);
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.logo-sub {
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--text-subtle);
  -webkit-text-fill-color: var(--text-subtle);
}
html.light .drama-detail .logo-main {
  color: var(--text-bright);
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
html.light .drama-detail .logo-sub {
  color: var(--text-muted);
  -webkit-text-fill-color: var(--text-muted);
}
.header-inner { max-width: min(1200px, 96vw); margin: 0 auto; display: flex; align-items: center; gap: 16px; }
.breadcrumb-sep {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 300;
  flex-shrink: 0;
  user-select: none;
}
html.light .breadcrumb-sep { color: var(--text-primary); }
.page-title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 10px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
html.light .page-title {
  color: var(--text-subtle);
  background: var(--bg-inner);
  border-color: var(--border-muted);
}
.btn-back-list {
  flex-shrink: 0;
}
.header-actions { margin-left: auto; display: flex; gap: 8px; flex-shrink: 0; }
.main { max-width: min(1200px, 96vw); margin: 0 auto; padding: 24px 16px 48px; display: flex; flex-direction: column; gap: 20px; }
.section.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  box-shadow: none;
  transition: border-color var(--dur-fast) var(--ease-mech);
}
.section.card:hover {
  border-color: var(--text-muted);
}
html.light .section.card:hover {
  border-color: var(--border-muted);
  box-shadow: none;
}
.section-title { font-size: 1rem; font-weight: 600; color: var(--text-bright); margin-bottom: 16px; }
html.light .section-title { color: var(--text-primary); }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.section-header .section-title { margin-bottom: 0; }
.section-count { color: var(--text-subtle); font-size: 0.85rem; }
.info-form { max-width: 100%; }
.empty-tip { color: var(--text-subtle); text-align: center; padding: 32px; }

/* 分集卡片 */
.episode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.episode-card {
  background: var(--bg-hover);
  border: 1px solid var(--border-muted);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.25s, transform 0.2s, box-shadow 0.25s, background 0.2s;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.episode-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: none;
  opacity: 0;
  transition: opacity 0.25s;
}
.episode-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-hover);
}
.episode-card:hover::before { opacity: 1; }
.episode-card:hover .episode-enter {
  color: var(--el-color-primary);
  opacity: 1;
}
.episode-card:hover .episode-enter-icon {
  transform: translateX(3px);
}
.episode-enter {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  font-size: 0.78rem;
  color: var(--text-subtle);
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.7;
  transition: color 0.2s, opacity 0.2s;
}
.episode-enter-icon {
  font-size: 0.85rem;
  transition: transform 0.2s;
}
.episode-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.episode-num { font-size: 0.8rem; color: var(--text-subtle); }
.episode-title { font-weight: 500; color: var(--text-bright); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.episode-preview { font-size: 0.78rem; color: var(--text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px; }
.episode-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ep-stat { font-size: 0.72rem; color: var(--text-subtle); }
.ep-stat-num { color: var(--text-primary); font-weight: 600; }
.ep-stat--status { padding: 1px 7px; border-radius: var(--radius-sm); font-size: 0.7rem; }
.ep-status--draft { background: var(--bg-hover); color: var(--text-muted); }
.ep-status--processing { background: var(--bg-hover); color: var(--el-color-warning); }
.ep-status--completed { background: var(--bg-hover); color: var(--text-primary); }
.ep-status--failed { background: var(--danger-soft); color: var(--danger-text); }

/* 资源库 */
.library-toolbar { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.import-tip { font-size: 0.8rem; color: var(--text-subtle); }
.import-list { max-height: 480px; }
.library-list { min-height: 120px; display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
.library-item { display: flex; gap: 12px; padding: 10px; background: var(--bg-inner); border: 1px solid var(--border-color); border-radius: 8px; }
.library-item-cover { width: 72px; height: 72px; flex-shrink: 0; border-radius: 6px; overflow: hidden; background: var(--bg-inner); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.library-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.library-placeholder { font-size: 0.8rem; color: var(--text-subtle); }
.library-item-info { flex: 1; min-width: 0; }
.library-item-name { font-weight: 500; color: var(--text-bright); margin-bottom: 4px; }
.library-item-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.library-item-actions { display: flex; gap: 8px; }
.library-empty { text-align: center; color: var(--text-subtle); padding: 40px 20px; }
.library-pagination { margin-top: 12px; display: flex; justify-content: center; }

/* ——— 编辑器风格 Tab 栏 ——— */
.res-section { padding-bottom: 0 !important; }
.res-tabbar {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--border-color, #27272a);
  padding: 0 4px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: -4px -20px 0;
  padding-left: 20px;
}
.res-tabbar::-webkit-scrollbar { display: none; }
.res-tab-group-label {
  font-size: 11px;
  color: var(--text-faint, #52525b);
  padding: 0 8px 0 4px;
  white-space: nowrap;
  user-select: none;
  letter-spacing: 0.03em;
  align-self: center;
}
.res-tab-group-label--prod { color: var(--text-bright); }
.res-tab-spacer {
  flex: 1;
  min-width: 40px;
}
.res-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 9px 16px 8px;
  font-size: 13px;
  color: var(--text-secondary, #a1a1aa);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
  outline: none;
}
.res-tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: transparent;
  transition: background 0.15s;
}
.res-tab:hover { color: var(--text-primary); background: var(--bg-inner, rgba(255,255,255,0.04)); }
/* 资源库激活 */
.res-tab--lib.active { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.res-tab--lib.active::after { background: var(--bg-hover); }
/* 制作资源激活 */
.res-tab--drama.active { color: var(--text-bright); font-size: 14px; font-weight: 600; }
.res-tab--drama.active::after { background: var(--text-bright); }

html.light .episode-card { background: var(--bg-inner); border-color: var(--border-color); }
html.light .episode-card:hover {
  border-color: var(--text-muted);
  background: var(--bg-hover);
}
html.light .episode-card::before { background: none; }
html.light .episode-enter { border-top-color: var(--border-color); color: var(--text-muted); }
html.light .episode-card:hover .episode-enter { color: var(--el-color-primary); }
html.light .episode-title { color: var(--text-primary); }
html.light .res-tab:hover { background: rgba(0,0,0,0.04); }
html.light .res-tab--lib.active { color: var(--text-primary); }
html.light .res-tab--lib.active::after { background: var(--bg-hover); }
html.light .res-tab--drama.active { color: var(--text-bright); }
html.light .res-tab--drama.active::after { background: var(--text-bright); }

/* 本剧制作资源列表 */
.drama-res-list { display: flex; flex-wrap: wrap; gap: 12px; padding: 4px 0 8px; }
.drama-res-item { display: flex; gap: 12px; width: calc(50% - 6px); background: var(--bg-inner, #1c1c1e); border: 1px solid var(--border-color, #27272a); border-radius: 8px; padding: 10px; box-sizing: border-box; }
.drama-res-cover { width: 72px; height: 72px; border-radius: 6px; overflow: hidden; flex-shrink: 0; cursor: zoom-in; background: var(--bg-page, #0f0f12); display: flex; align-items: center; justify-content: center; }
.drama-res-cover img { width: 100%; height: 100%; object-fit: cover; }
.drama-res-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.drama-res-name { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drama-res-meta { display: flex; gap: 4px; flex-wrap: wrap; }
.drama-res-desc { font-size: 12px; color: var(--text-secondary, #a1a1aa); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.drama-res-actions { margin-top: 6px; }

/* 编辑弹框内图片区 */
.lib-img-editor { display: flex; align-items: center; gap: 14px; }
.lib-img-thumb { width: 88px; height: 88px; border-radius: 8px; overflow: hidden; cursor: zoom-in; background: var(--bg-inner, #1c1c1e); border: 1px solid var(--border-color, #27272a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lib-img-thumb img { width: 100%; height: 100%; object-fit: cover; }
.lib-img-empty { color: var(--text-faint, #52525b); font-size: 26px; }
.lib-img-btns { display: flex; flex-direction: column; gap: 8px; }

/* 图片预览 */
.image-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out; }
.image-preview-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain; }

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
</style>
