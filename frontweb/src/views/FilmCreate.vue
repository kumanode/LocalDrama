<template>
  <div class="film-create" :class="{ 'sidebar-collapsed': navCollapsed }">
    <FilmHeader
      :drama-id="dramaId"
      :drama-title="store.drama?.title"
      :episodes="store.drama?.episodes || []"
      v-model:selected-episode-id="selectedEpisodeId"
      :nav-collapsed="navCollapsed"
      :nav-steps="navSteps"
      :storyboards="storyboards"
      v-model:storyboard-menu-expanded="storyboardMenuExpanded"
      :all-active-task-items="allActiveTaskItems"
      :all-active-task-labels="allActiveTaskLabels"
      @toggle-nav="toggleNav"
      @episode-select="onEpisodeSelect"
      @scroll-to-anchor="scrollToAnchor"
      @cancel-active-task="cancelActiveTask"
      @open-ai-config="showAiConfigDialog = true"
    />

    <main class="main">
      <!-- 分镜图上传图片用，单例放在外层避免 v-for 导致 ref 为数组 -->
      <input
        ref="sbImageFileInput"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style="display: none"
        @change="onSbImageFileChange"
      />
      <!-- 剧本工作台：单卡片 + 选项卡（创作 / 选择） -->
      <ScriptSection
        :drama-id="dramaId"
        :episodes="store.drama?.episodes || []"
        :current-episode-id="currentEpisodeId"
        v-model:selected-episode-id="selectedEpisodeId"
        v-model:script-workbench-mode="scriptWorkbenchMode"
        v-model:story-input="storyInput"
        v-model:story-style="storyStyle"
        v-model:story-type="storyType"
        v-model:story-episode-count="storyEpisodeCount"
        v-model:script-title="scriptTitle"
        v-model:script-content="scriptContent"
        :is-story-gen-running="isStoryGenRunning"
        :script-generating="scriptGenerating"
        v-model:select-preview-episode-id="selectPreviewEpisodeId"
        :selectable-script-dramas="selectableScriptDramas"
        :select-script-dramas="selectScriptDramas"
        :select-script-loading="selectScriptLoading"
        :select-script-importing="selectScriptImporting"
        v-model:show-select-script-dialog="showSelectScriptDialog"
        @save-project-settings="saveProjectSettings"
        @generate-story="onGenerateStory"
        @open-novel-import="showNovelImport = true"
        @episode-select="onEpisodeSelect"
        @add-episode="onAddEpisode"
        @generate-script="onGenerateScript"
        @open-select-script="openSelectScriptDialog"
        @load-select-script-list="loadSelectScriptList"
        @pick-script="onPickScriptFromDialog"
      />

      <!-- 一键全流程生成 -->
      <PipelinePanel
        v-model:project-aspect-ratio="projectAspectRatio"
        v-model:video-clip-duration="videoClipDuration"
        v-model:script-language="scriptLanguage"
        v-model:generation-style="generationStyle"
        v-model:custom-style-prompt="customStylePrompt"
        :generation-style-options="generationStyleOptions"
        :current-episode-id="currentEpisodeId"
        :pipeline-running="pipelineRunning"
        :pipeline-paused="pipelinePaused"
        :pipeline-error-log="pipelineErrorLog"
        :pipeline-current-step="pipelineCurrentStep"
        :pipeline-step-index="pipelineStepIndex"
        :pipeline-step-total="pipelineStepTotal"
        :pipeline-countdown="pipelineCountdown"
        :pipeline-countdown-msg="pipelineCountdownMsg"
        :pipeline-active-tasks="pipelineActiveTasks"
        @save-project-settings="saveProjectSettings"
        @start-one-click="startOneClickPipeline"
        @start-text-framework="startTextFrameworkPipeline"
        @pause="pipelinePaused = true"
        @resume="onPipelineResume"
        @skip-countdown="skipPipelineCountdown"
      />

      <!-- 资源管理：角色 / 道具 / 场景 -->
      <ResourceSection
        :drama-id="dramaId"
        :current-episode-id="currentEpisodeId"
        :characters="characters"
        :props-list="props"
        :scenes="scenes"
        :char-composable="charComposable"
        :prop-composable="propComposable"
        :scene-composable="sceneComposable"
        :media-composable="assetMedia"
        :get-char-affected-storyboards="getCharAffectedStoryboards"
        :get-prop-affected-storyboards="getPropAffectedStoryboards"
        :get-scene-affected-storyboards="getSceneAffectedStoryboards"
        :regen-sb-images-for-asset="regenSbImagesForAsset"
        :regen-sb-images-progress="regenSbImagesProgress"
        @generate-characters="onGenerateCharacters"
        @extract-props="onExtractProps"
        @extract-scenes="onExtractScenes"
        @regen-affected-sb-images="onRegenAffectedSbImages"
        @scroll-to-storyboard="scrollToStoryboard"
      />

      <!-- 6. 分镜生成 -->
      <StoryboardSection
        v-model:storyboard-count="storyboardCount"
        v-model:video-duration="videoDuration"
        v-model:grid-mode="gridMode"
        v-model:storyboard-use-first-last-frame="storyboardUseFirstLastFrame"
        v-model:storyboard-universal-omni="storyboardUniversalOmni"
        v-model:storyboard-include-narration="storyboardIncludeNarration"
        v-model:sb-truncated-dismissed="sbTruncatedDismissed"
        :last-frame-use-first-layout-lock="lastFrameUseFirstLayoutLock"
        :script-estimate-storyboard-title="scriptEstimateStoryboardTitle"
        :script-estimate-storyboard-hint="scriptEstimateStoryboardHint"
        :script-estimate-video-duration-title="scriptEstimateVideoDurationTitle"
        :script-estimate-video-duration-hint="scriptEstimateVideoDurationHint"
        :exporting-storyboard-sheet="exportingStoryboardSheet"
        :current-episode-id="currentEpisodeId"
        :storyboard-generating="storyboardGenerating"
        :universal-omni-polish-running="universalOmniPolishRunning"
        :universal-omni-polish-progress="universalOmniPolishProgress"
        :batch-image-running="batchImageRunning"
        :batch-image-stopping="batchImageStopping"
        :batch-image-progress="batchImageProgress"
        :batch-image-errors="batchImageErrors"
        :batch-video-running="batchVideoRunning"
        :batch-video-stopping="batchVideoStopping"
        :batch-video-progress="batchVideoProgress"
        :batch-video-errors="batchVideoErrors"
        :sb-truncated-warning="sbTruncatedWarning"
        :pipeline-running="pipelineRunning"
        :storyboards="storyboards"
        :characters="characters"
        :scenes="scenes"
        :props-list="props"
        :card-state="sbCardState"
        :card-actions="sbCardActions"
        @change-first-last-frame="onStoryboardUseFirstLastFrameChange"
        @save-project-settings="() => saveProjectSettings(false)"
        @export-storyboard-sheet="onExportStoryboardSheet"
        @export-narration-srt="onExportNarrationSrt"
        @generate-storyboard="onGenerateStoryboard"
        @add-single-storyboard="onAddSingleStoryboard"
        @start-batch-image="startBatchImageGeneration"
        @start-batch-video="startBatchVideoGeneration"
        @stop-batch-image="batchImageStopping = true"
        @stop-batch-video="batchVideoStopping = true"
      />

      <!-- 7. 视频配置 + AI 模型配置 -->
      <VideoConfigSection
        v-model:video-resolution="videoResolution"
        v-model:video-subtitle="videoSubtitle"
        v-model:video-burn-dialogue="videoBurnDialogue"
        v-model:video-watermark="videoWatermark"
        v-model:video-watermark-text="videoWatermarkText"
        @open-ai-config="showAiConfigDialog = true"
      />

      <!-- 8. 合成视频 -->
      <MergeExportSection
        :current-episode-id="currentEpisodeId"
        :storyboards-length="storyboards.length"
        :video-status="videoStatus"
        :video-progress="videoProgress"
        :video-error-msg="videoErrorMsg"
        :current-episode-video-url="currentEpisodeVideoUrl"
        @generate-video="onGenerateVideo"
      />
    </main>

    <!-- 分镜提示词编辑弹窗 -->
    <SbPromptDialog
      v-model="showSbPromptDialog"
      :target="sbPromptTarget"
      v-model:image-text="sbPromptImageText"
      v-model:polished-text="sbPromptPolishedText"
      v-model:video-text="sbPromptVideoText"
      :polishing="sbPromptPolishing"
      :saving="sbPromptSaving"
      @polish="onPolishSbPrompt"
      @save="onSaveSbPromptDialog"
      @close="sbPromptTarget = null"
    />

    <!-- 首尾帧提示词编辑器 -->
    <FramePromptEditor
      v-model="showFramePromptEditor"
      :slot="editingFramePromptSlot"
      :storyboard="editingFramePromptSb"
      v-model:prompt-text="editingFramePromptText"
      :saving="editingFramePromptSaving"
      :regenerating="editingFramePromptRegenerating"
      @save="saveEditingFramePrompt"
      @regenerate="regenerateEditingFramePrompt"
    />

    <!-- 分镜视频参数编辑弹窗 -->
    <VideoParamsDialog
      v-model="showVideoParamsDialog"
      :target="videoParamsTarget"
      :params="videoParamsComposable"
      :saving="videoParamsSaving"
      :regenerating-layout-sb-ids="regeneratingLayoutSbIds"
      :split-by-audio-loading="splitByAudioLoading"
      @close="onVideoParamsDialogClosed"
      @save="onSaveVideoParams"
      @regen-layout="onRegenerateLayoutDescription"
      @split-audio="onSplitSbByAudio"
    />

    <!-- P1-2: 导入小说弹窗 -->
    <NovelImportDialog
      v-model="showNovelImport"
      :drama-id="dramaId"
      :script-title="scriptTitle"
      :store="store"
      @imported="onNovelImported"
    />

    <!-- AI 配置弹窗（不跳转，避免本页内容丢失） -->
    <el-dialog v-model="showAiConfigDialog" :title="$t('routes.aiConfig')" width="90%" destroy-on-close class="ai-config-dialog">
      <AIConfigContent v-if="showAiConfigDialog" />
    </el-dialog>

    <!-- 图片放大预览：点击遮罩或图片关闭 -->
    <Teleport to="body">
      <div
        v-if="previewImageUrl"
        class="image-preview-overlay"
        @click="closeImagePreview"
      >
        <img :src="previewImageUrl" alt="" class="image-preview-img" @click.stop="closeImagePreview" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive, nextTick } from 'vue'
import { useAgentContext } from '@/stores/agentContext'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Setting, Plus, Minus, Sunny, Moon, MagicStick, Upload, Delete, Check, Loading, WarningFilled, User, Box, Picture, Film, VideoCamera, Document, InfoFilled, Refresh, ZoomIn, QuestionFilled, DocumentAdd, Expand, Fold, VideoPlay, Grid, Close } from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'
import { useFilmStore } from '@/stores/film'
import { useGenerationTaskStore, GEN_RESOURCE } from '@/stores/generationTaskStore'
import { syncGeneratingSetsFromStore, buildEpisodeContext, buildExtractTaskMeta, isEpisodeExtractRunning } from '@/composables/useGenerationTaskSync'
import { dramaAPI } from '@/api/drama'
import { generationAPI } from '@/api/generation'
import { aiAPI } from '@/api/ai'
import { characterAPI } from '@/api/characters'
import { propAPI } from '@/api/props'
import { sceneAPI } from '@/api/scenes'
import { imagesAPI } from '@/api/images'
import { videosAPI } from '@/api/videos'
import { storyboardsAPI } from '@/api/storyboards'
import { uploadAPI } from '@/api/upload'
import { characterLibraryAPI } from '@/api/characterLibrary'
import { sceneLibraryAPI } from '@/api/sceneLibrary'
import { propLibraryAPI } from '@/api/propLibrary'
import { generationSettingsAPI } from '@/api/prompts'
import { exportStoryboardSheet } from '@/utils/exportStoryboardSheet'
import StylePickerButton from '@/components/StylePickerButton.vue'
import AIConfigContent from '@/components/AIConfigContent.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import FilmHeader from '@/components/filmCreate/FilmHeader.vue'
import ScriptSection from '@/components/filmCreate/ScriptSection.vue'
import PipelinePanel from '@/components/filmCreate/PipelinePanel.vue'
import ResourceSection from '@/components/filmCreate/ResourceSection.vue'
import StoryboardSection from '@/components/filmCreate/StoryboardSection.vue'
import MergeExportSection from '@/components/filmCreate/MergeExportSection.vue'
import SbPromptDialog from '@/components/filmCreate/SbPromptDialog.vue'
import FramePromptEditor from '@/components/filmCreate/FramePromptEditor.vue'
import VideoParamsDialog from '@/components/filmCreate/VideoParamsDialog.vue'
import VideoConfigSection from '@/components/filmCreate/VideoConfigSection.vue'
import NovelImportDialog from '@/components/filmCreate/NovelImportDialog.vue'
import { useVideoParams } from '@/composables/filmCreate/useVideoParams'
import { useAssetMedia } from '@/composables/filmCreate/useAssetMedia'
import { useI18n } from '@/i18n'
import {
  generationStyleOptions,
  getStylePromptEn,
  getStylePromptZh,
  stylePromptMetadataForSave,
  backfillDramaStylePromptMetadataIfNeeded,
  CUSTOM_STYLE_VALUE,
} from '@/constants/styleOptions'
import { useNavigation } from '@/composables/filmCreate/useNavigation'
import { useStoryScript } from '@/composables/filmCreate/useStoryScript'
import { useCharacters } from '@/composables/filmCreate/useCharacters'
import { useProps as usePropsComposable } from '@/composables/filmCreate/useProps'
import { useScenes } from '@/composables/filmCreate/useScenes'
import { useNarration } from '@/composables/filmCreate/useNarration'
import { usePipeline } from '@/composables/filmCreate/usePipeline'
import { useStoryboards } from '@/composables/filmCreate/useStoryboards'
import { useStoryboardAssociations } from '@/composables/filmCreate/useStoryboardAssociations'
import { useBatchGeneration } from '@/composables/filmCreate/useBatchGeneration'
import { useMergeExport } from '@/composables/filmCreate/useMergeExport'
import { useFramePrompts } from '@/composables/filmCreate/useFramePrompts'
import { useUniversalSegments } from '@/composables/filmCreate/useUniversalSegments'
import { useStoryboardPromptDialog } from '@/composables/filmCreate/useStoryboardPromptDialog'
import { useStoryboardVideo } from '@/composables/filmCreate/useStoryboardVideo'
import { useStoryboardImages } from '@/composables/filmCreate/useStoryboardImages'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const store = useFilmStore()
const genStore = useGenerationTaskStore()
const { isDark, toggle: toggleTheme } = useTheme()
const { videoResolution: storeVideoResolution } = storeToRefs(store)

// ── Composable: Navigation ─────────────────────────────
const { navCollapsed, storyboardMenuExpanded, toggleNav, scrollToTop, scrollToAnchor } = useNavigation()

function goList() {
  router.push('/')
}

function goCanvasMode() {
  if (!dramaId.value) return
  const query = selectedEpisodeId.value ? { episode: String(selectedEpisodeId.value) } : {}
  router.push({ path: `/film/${dramaId.value}/canvas`, query })
}


const showAiConfigDialog = ref(false)
watch(showAiConfigDialog, (open) => {
  if (!open) invalidateActiveVideoAiConfigCache()
})
const storyInput = ref('')
const storyStyle = ref('')
const storyType = ref('')
const storyEpisodeCount = ref(1)
/** 剧本工作台：create 创作 | select 选择预览 */
const scriptWorkbenchMode = ref('create')
// P1-2: 小说导入
const showNovelImport = ref(false)
function onNovelImported({ multiple }) {
  if (multiple) {
    loadDrama()
  }
}
const scriptTitle = ref('')
const selectedEpisodeId = ref(null)
/** 保存剧本后用于恢复选中集（后端重插后 id 会变，用 episode_number 匹配） */
const savedCurrentEpisodeNumber = ref(1)
const scriptLanguage = ref('zh')
const scriptStoryboardStyle = ref('')
const generationStyle = ref('')
const customStylePrompt = ref('')
const projectAspectRatio = ref('16:9')
const videoClipDuration = ref(5)

/** 根据 value 查找样式选项对象 */
function _findStyleOption(val) {
  for (const group of generationStyleOptions) {
    const found = group.options.find(o => o.value === val)
    if (found) return found
  }
  return null
}

/** 传给图像/视频 AI 用的英文 prompt（效果最好）；
 *  找不到 promptEn 时降级到 prompt，再降级到原始值；
 *  custom 时返回用户填写的自定义描述，避免把字面量 "custom" 写入提示词 */
function getSelectedStylePrompt() {
  const val = (generationStyle.value || '').toString().trim()
  if (!val) return undefined
  if (val === CUSTOM_STYLE_VALUE) {
    const text = (customStylePrompt.value || '').toString().trim()
    return text || undefined
  }
  const opt = _findStyleOption(val)
  if (opt) return opt.promptEn || opt.prompt || val
  return val
}

/** 中文风格描述（用于界面展示或中文场景提示词拼接） */
function getSelectedStylePromptZh() {
  const val = (generationStyle.value || '').toString().trim()
  if (!val) return undefined
  if (val === CUSTOM_STYLE_VALUE) {
    const text = (customStylePrompt.value || '').toString().trim()
    return text || undefined
  }
  const opt = _findStyleOption(val)
  if (opt) return opt.prompt || opt.promptEn || val
  return val
}

function projectStylePromptMetadata() {
  return stylePromptMetadataForSave(generationStyle.value, customStylePrompt.value)
}

const scriptContent = computed({
  get: () => store.scriptContent,
  set: (v) => store.setScriptContent(v)
})
const videoResolution = storeVideoResolution
const videoMusic = ref('')
const videoSfx = ref('')
const videoQuality = ref('high')

const dramaId = computed(() => store.dramaId)
const characters = computed(() => store.characters)
const scenes = computed(() => store.scenes)
const props = computed(() => store.props)
const storyboards = computed(() => store.storyboards)
const currentEpisode = computed(() => store.currentEpisode)
const currentEpisodeId = computed(() => store.currentEpisode?.id ?? null)
const videoProgress = computed(() => store.videoProgress)
const videoStatus = computed(() => store.videoStatus)

// ── Composable: Merge & Export ────────────────────────
const {
  videoSubtitle,
  videoBurnDialogue,
  videoWatermark,
  videoWatermarkText,
  videoErrorMsg,
  currentEpisodeVideoUrl,
  getFinalizeMergeOptions,
  onGenerateVideo,
} = useMergeExport({
  store,
  dramaId,
  currentEpisodeId,
  currentEpisode,
  genStore,
  loadDrama: (...args) => loadDrama(...args),
  pollTask: (...args) => pollTask(...args),
})

function trackFilmCreateAction(_action, _payload = {}) {
  // 单机版：无埋点上报
}

const storyboardGenerating = computed(() =>
  isEpisodeExtractRunning(genStore, dramaId.value, currentEpisodeId.value, GEN_RESOURCE.GENERATE_STORYBOARD)
)
const sbTruncatedWarning = ref(false)
const sbTruncatedDismissed = ref(false)

// ── Composable: Asset Media ───────────────────────────
const assetMedia = useAssetMedia({ store, dramaId, loadDrama })
const {
  assetImageUrl,
  hasAssetImage,
  assetVideoUrl,
  isHttpVideoUrl,
  previewImageUrl,
  openImagePreview,
  closeImagePreview,
  imageUrl,
  getFirstImageFile,
} = assetMedia

// ── Composable: Characters ────────────────────────────
const charComposable = useCharacters({ store, dramaId, currentEpisodeId, getSelectedStyle, loadDrama, pollTask, pollUntilResourceHasImage, hasAssetImage })
const { charactersGenerating, generatingCharIds } = charComposable

// ── Composable: Props ──────────────────────────────────
const propComposable = usePropsComposable({ store, dramaId, currentEpisodeId, getSelectedStyle, loadDrama, pollTask, pollUntilResourceHasImage, hasAssetImage })
const { propsExtracting, generatingPropIds } = propComposable

// ── Composable: Scenes ─────────────────────────────────
const sceneComposable = useScenes({ store, dramaId, currentEpisodeId, getSelectedStyle, scriptLanguage, loadDrama, pollTask, pollUntilResourceHasImage, hasAssetImage, dramaAPI })
const { scenesExtracting, generatingSceneIds } = sceneComposable

// ── Composable: Video Params ───────────────────────────
const videoParamsComposable = useVideoParams({
  store,
  dramaId,
  currentEpisodeId,
  loadDrama,
  refreshStoryboardsOnly: (...args) => refreshStoryboardsOnly(...args),
})
const {
  showVideoParamsDialog,
  videoParamsTarget,
  videoParamsSaving,
  regeneratingLayoutSbIds,
  splitByAudioLoading,
  inferringParams,
  sbTitle,
  sbLocation,
  sbTime,
  sbDuration,
  sbAction,
  sbDialogue,
  sbNarration,
  sbAtmosphere,
  sbResult,
  sbAngle,
  sbAngleH,
  sbAngleV,
  sbAngleS,
  sbMovement,
  sbLighting,
  sbDof,
  sbShotType,
  sbLayoutDescription,
  sbCreationMode,
  sbUniversalSegmentText,
  isSbUniversalMode,
  onToggleSbUniversalMode,
  onSaveUniversalSegmentField,
  onBatchInferParams,
  getMovementLabel,
  angleToPromptFragment,
  syncVideoParamsFromStoryboards,
  setSbCreationModeId,
  onOpenVideoParamsDialog,
  onVideoParamsDialogClosed,
  onSaveSbVideoFields,
  onSaveVideoParams,
  canSplitSbByAudio,
  onSplitSbByAudio,
  onRegenerateLayoutDescription,
} = videoParamsComposable

// ── Composable: Frame Prompts ─────────────────────────
const {
  showFramePromptEditor,
  editingFramePromptSb,
  editingFramePromptSlot,
  editingFramePromptText,
  editingFramePromptSaving,
  editingFramePromptRegenerating,
  buildFirstFrameImagePrompt,
  buildLastFrameImagePrompt,
  getCachedFramePromptFromDb,
  ensureProfessionalFramePrompt,
  openFramePromptEditor,
  saveEditingFramePrompt,
  regenerateEditingFramePrompt,
  showSbFramePromptPreview,
} = useFramePrompts({
  store,
  sbLocation,
  sbTime,
  sbShotType,
  sbAngleH,
  sbAngleV,
  sbAngleS,
  sbResult,
  sbAction,
  sbAtmosphere,
  angleToPromptFragment,
  getSelectedStylePromptZh,
  getSelectedStylePrompt,
  pollTask: (...args) => pollTask(...args),
})

// ── Composable: Universal Segments ────────────────────
const {
  generatingUniversalSegmentIds,
  universalOmniPolishRunning,
  universalOmniPolishAbort,
  universalOmniPolishProgress,
  sbUniversalSegmentTrimmed,
  universalSegmentDurationSecForSb,
  getSbVideoDurationForApi,
  buildUniversalSegmentFieldOverrides,
  universalSegmentAtImageToGrokTags,
  onUniversalSegmentToGrokVideoTags,
  onUniversalSegmentPromptMenu,
  onGenerateUniversalSegmentPrompt,
  onPolishUniversalSegmentPromptStream,
  polishUniversalSegmentsAfterGeneration,
} = useUniversalSegments({
  store,
  videoClipDuration,
  sbDuration,
  sbTitle,
  sbLocation,
  sbTime,
  sbAction,
  sbDialogue,
  sbNarration,
  sbResult,
  sbAtmosphere,
  sbShotType,
  sbMovement,
  sbLayoutDescription,
  sbUniversalSegmentText,
  onSaveUniversalSegmentField,
  isSbUniversalMode,
  storyboardUniversalOmni: () => storyboardUniversalOmni?.value,
  pipelineRest: (...args) => pipelineRest(...args),
})

// ── Composable: Storyboard Prompt Dialog ─────────────
const {
  editingSbVideoPromptId,
  editingSbVideoPromptText,
  editingSbImagePromptId,
  editingSbImagePromptText,
  showSbPromptDialog,
  sbPromptTarget,
  sbPromptImageText,
  sbPromptPolishedText,
  sbPromptVideoText,
  sbPromptSaving,
  sbPromptPolishing,
  formatVideoPromptForEdit,
  onEditSbImagePrompt,
  onOpenSbPromptDialog,
  onPolishSbPrompt,
  onSaveSbPromptDialog,
  onSaveSbImagePrompt,
  onEditSbVideoPrompt,
  onSaveSbVideoPrompt,
} = useStoryboardPromptDialog({
  loadDrama: (...args) => loadDrama(...args),
})

async function onGenerateCharacters() {
  trackFilmCreateAction('generate_characters_click')
  const beforeCount = (store.currentEpisode?.characters || []).length
  try {
    await charComposable.onGenerateCharacters()
    const afterCount = (store.currentEpisode?.characters || []).length
    trackFilmCreateAction('generate_characters_complete', {
      extra: { before_count: beforeCount, after_count: afterCount },
    })
  } catch (e) {
    trackFilmCreateAction('generate_characters_failed', {
      extra: { message: String(e?.message || 'failed').slice(0, 120) },
    })
    throw e
  }
}

async function onExtractProps() {
  trackFilmCreateAction('extract_props_click')
  const beforeCount = (store.props || []).length
  try {
    await propComposable.onExtractProps()
    const afterCount = (store.props || []).length
    trackFilmCreateAction('extract_props_complete', {
      extra: { before_count: beforeCount, after_count: afterCount },
    })
  } catch (e) {
    trackFilmCreateAction('extract_props_failed', {
      extra: { message: String(e?.message || 'failed').slice(0, 120) },
    })
    throw e
  }
}

async function onExtractScenes() {
  trackFilmCreateAction('extract_scenes_click')
  const beforeCount = (store.currentEpisode?.scenes || []).length
  try {
    await sceneComposable.onExtractScenes()
    const afterCount = (store.currentEpisode?.scenes || []).length
    trackFilmCreateAction('extract_scenes_complete', {
      extra: { before_count: beforeCount, after_count: afterCount },
    })
  } catch (e) {
    trackFilmCreateAction('extract_scenes_failed', {
      extra: { message: String(e?.message || 'failed').slice(0, 120) },
    })
    throw e
  }
}



// 资源管理大面板及子区块折叠状态
const resourcePanelCollapsed = ref(false)
const charactersBlockCollapsed = ref(false)
const propsBlockCollapsed = ref(false)
const scenesBlockCollapsed = ref(false)
const sceneUseQuadGrid = ref(false)
const propUseQuadGrid = ref(false)  // 道具四视图（与场景四宫格同级选项）

// 分镜行内编辑状态（按 storyboard id 存储）
// navCollapsed/storyboardMenuExpanded/toggleNav → 已移至 useNavigation composable

/** 左侧导航各步骤状态 */
const navSteps = computed(() => {
  const epRunning = genStore.getRunningForEpisode(dramaId.value, currentEpisodeId.value)
  // 剧本
  const hasScript = !!(scriptContent?.value?.trim())
  const scriptStatus = isStoryGenRunning.value
    ? 'generating'
    : hasScript ? 'done' : 'pending'

  // 角色
  const charList = characters.value || []
  const charDone = charList.length > 0 && charList.every(c => hasAssetImage(c))
  const charGen = charactersGenerating.value || generatingCharIds.size > 0
    || epRunning.some((t) => t.resourceType === GEN_RESOURCE.CHAR_IMAGE || t.resourceType === GEN_RESOURCE.EXTRACT_CHARACTERS)
  const charStatus = charGen ? 'generating' : charDone ? 'done' : charList.length > 0 ? 'partial' : 'pending'

  // 道具
  const propList = props.value || []
  const propDone = propList.length > 0 && propList.every(p => hasAssetImage(p))
  const propGen = propsExtracting.value || generatingPropIds.size > 0
    || epRunning.some((t) => t.resourceType === GEN_RESOURCE.PROP_IMAGE || t.resourceType === GEN_RESOURCE.EXTRACT_PROPS)
  const propStatus = propGen ? 'generating' : propDone ? 'done' : propList.length > 0 ? 'partial' : 'pending'

  // 场景
  const sceneList = scenes.value || []
  const sceneDone = sceneList.length > 0 && sceneList.every(s => hasAssetImage(s))
  const sceneGen = scenesExtracting.value || generatingSceneIds.size > 0
    || epRunning.some((t) => t.resourceType === GEN_RESOURCE.SCENE_IMAGE || t.resourceType === GEN_RESOURCE.EXTRACT_SCENES)
  const sceneStatus = sceneGen ? 'generating' : sceneDone ? 'done' : sceneList.length > 0 ? 'partial' : 'pending'

  // 分镜脚本
  const sbList = storyboards.value || []
  const sbScriptDone = sbList.length > 0
  const sbScriptGen = storyboardGenerating.value || universalOmniPolishRunning.value
    || epRunning.some((t) => t.resourceType === GEN_RESOURCE.GENERATE_STORYBOARD)
  const sbScriptStatus = sbScriptGen ? 'generating' : sbScriptDone ? 'done' : 'pending'

  // 分镜图
  const sbImgDone = sbList.length > 0 && sbList.every(sb => hasSbImage(sb))
  const sbImgGen = generatingSbImageIds.size > 0 || batchImageRunning.value || epRunning.some((t) =>
    t.resourceType === GEN_RESOURCE.SB_IMAGE
    || t.resourceType === GEN_RESOURCE.SB_FIRST_IMAGE
    || t.resourceType === GEN_RESOURCE.SB_LAST_IMAGE
  )
  const sbImgStatus = sbImgGen ? 'generating' : sbImgDone ? 'done' : sbList.length > 0 ? 'partial' : 'pending'

  // 视频
  const sbVideoAllDone = sbList.length > 0 && sbList.every(sb => getSbAllVideos(sb.id).length > 0)
  const sbVideoSome = sbList.some(sb => getSbAllVideos(sb.id).length > 0)
  const sbVideoGen = batchVideoRunning.value || generatingSbVideoIds.size > 0
    || epRunning.some((t) => t.resourceType === GEN_RESOURCE.SB_VIDEO)
  const videoStatus = sbVideoGen ? 'generating' : sbVideoAllDone ? 'done' : sbVideoSome ? 'partial' : 'pending'

  return [
    { key: 'script',   label: t('filmCreate.stepScript'),   anchor: 'anchor-script',     status: scriptStatus,    count: hasScript ? 1 : 0 },
    { key: 'chars',    label: t('filmCreate.stepCharacters'), anchor: 'anchor-characters', status: charStatus,      count: charList.length },
    { key: 'props',    label: t('filmCreate.stepProps'),      anchor: 'anchor-props',      status: propStatus,      count: propList.length },
    { key: 'scenes',   label: t('filmCreate.stepScenes'),     anchor: 'anchor-scenes',     status: sceneStatus,     count: sceneList.length },
    { key: 'sb',       label: t('filmCreate.stepStoryboard'), anchor: 'anchor-storyboard', status: sbScriptStatus,  count: sbList.length },
    { key: 'sbimg',    label: t('filmCreate.stepStoryboardImages'), anchor: 'anchor-storyboard', status: sbImgStatus, count: sbList.length },
    { key: 'video',    label: t('filmCreate.stepVideos'),     anchor: 'anchor-video',      status: videoStatus,     count: 0 },
  ]
})

/** 聚合所有当前正在运行的任务，用于悬浮任务面板（含跨剧跨集） */
const allActiveTaskItems = computed(() => {
  const items = []
  const seen = new Set()
  function addItem(item) {
    const id = item.id || item.label
    if (!id || seen.has(id)) return
    seen.add(id)
    items.push(item)
  }
  for (const tTask of genStore.getAllRunningTasks()) {
    addItem({
      id: `gen:${tTask.key || tTask.taskId || tTask.label}`,
      label: tTask.label || t('filmCreate.taskRunning'),
      kind: 'genStore',
      task: tTask,
    })
  }
  if (pipelineRunning.value) {
    const step = pipelineCurrentStep.value
    addItem({
      id: 'pipeline',
      label: step ? step.replace(/^\[步骤 \d+\/\d+\] /, '') : t('filmCreate.pipelineRunningEllipsis'), // i18n-scan-ignore: regex
      kind: 'pipeline',
    })
  }
  if (isStoryGenRunning.value && !genStore.getAllRunningTasks().some((tTask) => tTask.resourceType === GEN_RESOURCE.GENERATE_STORY)) {
    addItem({ id: 'story-gen-local', label: t('filmCreate.storyGenEllipsis'), kind: 'storyGenLocal' })
  }
  if (universalOmniPolishRunning.value) {
    const p = universalOmniPolishProgress.value
    addItem({
      id: 'universal-omni-polish',
      label: t('filmCreate.polishOmniProgress', { current: p.current, total: p.total, label: p.label ? ' ' + p.label : '' }),
      kind: 'universalOmniPolish',
    })
  }
  if (batchImageRunning.value) {
    addItem({ id: 'batch-image', label: t('filmCreate.batchImageEllipsis'), kind: 'batchImage' })
  }
  if (batchVideoRunning.value) {
    const p = batchVideoProgress.value
    const suffix = p?.total ? ` ${p.current}/${p.total}` : ''
    addItem({ id: 'batch-video', label: t('filmCreate.batchVideoEllipsis', { suffix }), kind: 'batchVideo' })
  }
  return items
})

const allActiveTaskLabels = computed(() => allActiveTaskItems.value.map((t) => t.label))

async function cancelActiveTask(item) {
  if (!item) return
  try {
    if (item.kind === 'genStore' && item.task) {
      await genStore.cancelTask(item.task)
      ElMessage.success(t('filmCreate.taskCancelled'))
      return
    }
    if (item.kind === 'pipeline') {
      pipelineAbortRequested.value = true
      pipelineRunning.value = false
      pipelinePaused.value = false
      for (const tTask of genStore.getAllRunningTasks()) {
        if (tTask.taskId) await genStore.cancelTask(tTask)
      }
      ElMessage.success(t('filmCreate.pipelineStopped'))
      return
    }
    if (item.kind === 'storyGenLocal') {
      storyGenerating.value = false
      scriptGenerating.value = false
      const storyTask = genStore.getAllRunningTasks().find((tTask) => tTask.resourceType === GEN_RESOURCE.GENERATE_STORY)
      if (storyTask) await genStore.cancelTask(storyTask)
      ElMessage.success(t('filmCreate.storyGenCancelled'))
      return
    }
    if (item.kind === 'universalOmniPolish') {
      universalOmniPolishAbort.value = true
      ElMessage.success(t('filmCreate.stoppingPolish'))
      return
    }
    if (item.kind === 'batchImage') {
      batchImageStopping.value = true
      ElMessage.info(t('filmCreate.stoppingBatchImage'))
      return
    }
    if (item.kind === 'batchVideo') {
      batchVideoStopping.value = true
      ElMessage.info(t('filmCreate.stoppingBatchVideo'))
      return
    }
  } catch (e) {
    ElMessage.error(e?.message || t('filmCreate.cancelFailed'))
  }
}

// P0-1: 连贯帧模式
const videoFrameContiguity = ref(false)
const {
  ttsSbIds,
  ttsSbNarrationIds,
  sbDialogueAudioPaths,
  sbNarrationAudioPaths,
  normalizeAudioRelPath,
  sbDialogueAudioRelPath,
  sbNarrationAudioRelPath,
  playSbTtsFromRel,
  playSbDialogueTts,
  playSbNarrationTts,
  onTtsSbDialogue,
  onTtsSbNarration,
  formatSrtTimestamp,
  onExportNarrationSrt,
  onSaveSbNarrationField,
} = useNarration({
  store,
  currentEpisodeId,
  storyboards,
  sbDuration,
  sbNarration,
})

const dragOverSbId = ref(null)
// 公共库弹窗状态已移至各 composable
const storyboardUseFirstLastFrame = ref(false)
const exportingStoryboardSheet = ref(false)
/** 生成尾帧时是否注入首帧作站位/构图参考（默认开启） */
const lastFrameUseFirstLayoutLock = ref(true)
const gridMode = ref('single') // 序列图模式：single / quad_grid / nine_grid

// ── Composable: Storyboards ───────────────────────────
const {
  sbImages,
  sbVideos,
  sbVideoErrors,
  sbSelectedImgId,
  sbSelectedLastImgId,
  sbSelectedVideoId,
  generatingSbImageIds,
  generatingSbFirstImageIds,
  generatingSbLastImageIds,
  generatingSbVideoIds,
  upscalingSbIds,
  linkingTailFrameIds,
  usingPrevTailAsFirstIds,
  sbImageUploadSlotById,
  uploadingSbImageId,
  sbImageUploadForId,
  sbImageFileInput,
  batchImageRunning,
  batchImageStopping,
  batchImageProgress,
  batchImageErrors,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
  batchVideoErrors,
  getSbAllImages,
  getSbAllVideos,
  getSbFirstImage,
  getSbLastImage,
  getSbImage,
  getSbVideo,
  hasSbImage,
  hasSbFirstLastPair,
  getQuadGridImage,
  getSbFirstFrameUrl,
  getSbLastFrameUrl,
  getNextStoryboard,
  getPrevStoryboard,
  canUsePrevTailAsFirst,
  isSbVideoGenerating,
  getSbResumableFailedVideo,
  getSbVideoError,
  loadStoryboardMedia,
  loadSingleStoryboardMedia,
  restoreSelectionsFromBackend,
  sbMainVideoPlayerKey,
  getVideoStripItems,
  onSelectSbMainVideo,
  quadPanelLabel,
  getStripItems,
  stripItemTitle,
  onSelectSbFrameImage,
  onSelectSbMainImage,
  onSelectStripItem,
  onStripItemClick,
  onRemoveSbHistoryImage,
  frameTypeForSlot,
  uploadingSbImageSlot,
  onUploadSbImageClick,
  doUploadSbImage,
  onSbImageFileChange,
  recordHasPlayableVideoUrl,
  resolveSbImageById,
} = useStoryboards({
  store,
  dramaId,
  currentEpisodeId,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  genStore,
})

// ── Composable: Storyboard Associations ───────────────
const {
  sbCharacterIds,
  sbPropIds,
  sbSceneId,
  regenSbImagesForAsset,
  regenSbImagesProgress,
  getSbCharacterIds,
  setSbCharacterIds,
  charactersAvailableToAddToSb,
  onSbAddCharacterCommand,
  getSbPropIds,
  setSbPropIds,
  onStoryboardPropChange,
  getSbSelectedScene,
  getSbSelectedCharacters,
  getSbSelectedProps,
  onStoryboardCharacterChange,
  onStoryboardSceneChange,
  dedupeStoryboardsForAssetLink,
  getCharAffectedStoryboards,
  getSceneAffectedStoryboards,
  getPropAffectedStoryboards,
  scrollToStoryboard,
  onRegenAffectedSbImages,
  syncAssociationsFromEpisode,
} = useStoryboardAssociations({
  storyboards,
  characters,
  props,
  scenes,
  dramaId,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  ensureProfessionalFramePrompt: (...args) => ensureProfessionalFramePrompt(...args),
  getSelectedStyle,
  projectAspectRatio,
  pollTask,
  loadSingleStoryboardMedia,
  sbSelectedImgId,
})

// ── Composable: Story Script ─────────────────────────
const {
  storyboardCount,
  videoDuration,
  storyboardIncludeNarration,
  storyboardUniversalOmni,
  storyGenerating,
  scriptGenerating,
  showSelectScriptDialog,
  selectScriptLoading,
  selectScriptImporting,
  selectScriptDramas,
  selectPreviewEpisodeId,
  clipSecondsForStoryboardEstimate,
  shotCountEstimateFromDurationSec,
  estimateVideoDurationSecFromCharLen,
  scriptStoryboardEstimate,
  scriptEstimateVideoDurationHint,
  scriptEstimateVideoDurationTitle,
  scriptEstimateStoryboardHint,
  scriptEstimateStoryboardTitle,
  scriptTextTrimmedForEstimate,
  userFilledStoryboardCount,
  userFilledVideoDuration,
  getVideoDurationForApi,
  getStoryboardCountForApi,
  saveScriptToBackend,
  onGenerateStory,
  openSelectScriptDialog,
  loadSelectScriptList,
  onPickScriptFromDialog,
  onGenerateScript,
  onAddEpisode,
  refreshStoryboardsForEpisode,
  refreshStoryboardsOnly,
  onGenerateStoryboard,
  onAddSingleStoryboard,
  onDeleteSingleStoryboard,
  onInsertStoryboardBefore,
} = useStoryScript({
  store,
  route,
  router,
  dramaId,
  currentEpisodeId,
  scriptTitle,
  scriptContent,
  storyInput,
  storyStyle,
  storyType,
  storyEpisodeCount,
  scriptLanguage,
  scriptStoryboardStyle,
  generationStyle,
  customStylePrompt,
  projectAspectRatio,
  videoClipDuration,
  savedCurrentEpisodeNumber,
  selectedEpisodeId,
  scriptWorkbenchMode,
  loadDrama,
  pollTask,
  genStore,
  getSelectedStyle,
  projectStylePromptMetadata,
  polishUniversalSegmentsAfterGeneration: (...args) => polishUniversalSegmentsAfterGeneration(...args),
  sbTruncatedWarning,
  sbTruncatedDismissed,
  trackFilmCreateAction,
  onEpisodeSelect,
})

const selectableScriptDramas = computed(() => {
  const cur = store.dramaId
  const list = selectScriptDramas.value || []
  if (cur == null) return list
  return list.filter((d) => Number(d.id) !== Number(cur))
})

const isStoryGenRunning = computed(() => {
  if (storyGenerating.value || scriptGenerating.value) return true
  return genStore.getAllRunningTasks().some(
    (t) => Number(t.dramaId) === Number(dramaId.value) && t.resourceType === GEN_RESOURCE.GENERATE_STORY
  )
})


function onSbImageDragOver(e, sbId) {
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dragOverSbId.value = sbId
}
function onSbImageDragLeave(e, sbId) {
  e.preventDefault()
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
  if (sbId != null && dragOverSbId.value !== sbId) return
  dragOverSbId.value = null
}
function onSbImageDrop(e, sb) {
  e.preventDefault()
  e.stopPropagation()
  dragOverSbId.value = null
  const file = getFirstImageFile(e.dataTransfer)
  if (file && sb?.id) doUploadSbImage(sb.id, file)
}

function getSelectedStyle() {
  return getSelectedStylePrompt()
}

function onStoryboardUseFirstLastFrameChange() {
  if (storyboardUseFirstLastFrame.value && gridMode.value !== 'single') {
    gridMode.value = 'single'
    ElMessage.info(t('filmCreate.firstLastFrameSingleGridTip'))
  }
  saveProjectSettings(false)
}

function getGeneratingSetsBag() {
  return {
    generatingCharIds,
    generatingPropIds,
    generatingSceneIds,
    generatingSbImageIds,
    generatingSbFirstImageIds,
    generatingSbLastImageIds,
    generatingSbVideoIds,
  }
}

function buildSbGenMeta(sb, resourceType, labelPrefix) {
  const num = sb?.storyboard_number ?? sb?.id
  const epNum = store.currentEpisode?.episode_number
  const dramaTitle = store.drama?.title || ''
  const epText = t('filmCreate.episodeNum', { num: epNum ?? '' })
  const epLabel = dramaTitle ? `${dramaTitle} · ${epText}` : epText
  return {
    dramaId: dramaId.value,
    episodeId: currentEpisodeId.value,
    dramaTitle,
    episodeNumber: epNum,
    resourceType,
    resourceId: sb.id,
    label: `${epLabel} ${labelPrefix} #${num}`,
  }
}

async function recoverAndSyncEpisodeTasks(epId) {
  const did = dramaId.value
  const eid = epId ?? currentEpisodeId.value
  if (!did || !eid) return
  const ctx = buildEpisodeContext(store, did, eid)
  await genStore.recoverPendingForEpisode({
    ...ctx,
    ElMessage,
    callbacks: {
      onStoryboardMedia: (sbId) => loadSingleStoryboardMedia(sbId),
      onDramaRefresh: () => loadDrama(),
      onEpisodeMergeComplete: () => {
        store.setVideoStatus('done', did, eid)
        store.setVideoProgress(100, did, eid)
      },
      onEpisodeMergeFailed: (err) => {
        store.setVideoStatus('error', did, eid)
        videoErrorMsg.value = err || t('filmCreate.videoGenFailed')
      },
    },
  })
  syncGeneratingSetsFromStore(genStore, did, eid, getGeneratingSetsBag())
  const mergeRunning = genStore.getRunningForEpisode(did, eid).some(
    (t) => t.resourceType === GEN_RESOURCE.EPISODE_MERGE
  )
  if (mergeRunning) {
    store.setVideoStatus('generating', did, eid)
  }
}

// ── Composable: Storyboard Images ─────────────────────
const {
  onGenerateSbFrameImage,
  onGenerateSbFramePair,
  onGenerateSbImage,
  getSbLocalImage,
  onUpscaleSbImage,
  onLinkTailFrameToNext,
  onUsePrevTailAsFirst,
} = useStoryboardImages({
  store,
  dramaId,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  generatingSbFirstImageIds,
  generatingSbLastImageIds,
  generatingSbImageIds,
  upscalingSbIds,
  linkingTailFrameIds,
  usingPrevTailAsFirstIds,
  sbCharacterIds,
  sbSelectedImgId,
  sbSelectedLastImgId,
  ensureProfessionalFramePrompt: (...args) => ensureProfessionalFramePrompt(...args),
  buildLastFrameImagePrompt: (...args) => buildLastFrameImagePrompt(...args),
  getSbFirstImage,
  getSbLastImage,
  getSbImage,
  getSbVideo,
  getNextStoryboard,
  getPrevStoryboard,
  getSelectedStyle,
  projectAspectRatio,
  assetImageUrl,
  frameTypeForSlot,
  buildSbGenMeta,
  pollTask: (...args) => pollTask(...args),
  loadDrama: (...args) => loadDrama(...args),
  loadSingleStoryboardMedia: (...args) => loadSingleStoryboardMedia(...args),
  refreshStoryboardsOnly: (...args) => refreshStoryboardsOnly(...args),
  restoreSelectionsFromBackend: (...args) => restoreSelectionsFromBackend(...args),
  onSelectSbFrameImage,
  genStore,
})

function syncStoryboardStateFromEpisode(ep) {
  syncAssociationsFromEpisode(ep)
  syncVideoParamsFromStoryboards(ep?.storyboards || [])
}

function onEpisodeSelect(epId) {
  if (epId == null) {
    store.setCurrentEpisode(null)
    store.setScriptContent('')
    scriptTitle.value = ''
    syncStoryboardStateFromEpisode(null)
    return
  }
  const list = store.drama?.episodes || []
  const ep = list.find((e) => Number(e.id) === Number(epId))
  if (!ep) return
  store.setCurrentEpisode(ep)
  store.setScriptContent(ep.script_content || '')
  scriptTitle.value = ep.title || t('filmCreate.episodeNum', { num: ep.episode_number || 0 })
  syncStoryboardStateFromEpisode(ep)
  loadStoryboardMedia()
  recoverAndSyncEpisodeTasks(epId)
}

async function loadDrama() {
  if (!store.dramaId) return
  try {
    let d = await dramaAPI.get(store.dramaId)
    d = await backfillDramaStylePromptMetadataIfNeeded(dramaAPI, store.dramaId, d)
    store.setDrama(d)
    // 恢复「故事生成」框的梗概（项目 description 存的是故事梗概）
    storyInput.value = (d.description || '').toString().trim()
    storyStyle.value = (d.metadata && d.metadata.story_style) ? d.metadata.story_style : ''
    storyType.value = d.genre || ''
    generationStyle.value = d.style || ''
    if ((d.style || '') === CUSTOM_STYLE_VALUE) {
      customStylePrompt.value = (d.metadata?.style_prompt_zh || d.metadata?.style_prompt_en || '').toString()
    } else {
      customStylePrompt.value = ''
    }
    projectAspectRatio.value = (d.metadata && d.metadata.aspect_ratio) ? d.metadata.aspect_ratio : '16:9'
    videoClipDuration.value = (d.metadata && d.metadata.video_clip_duration) ? Number(d.metadata.video_clip_duration) : 5
    storyboardIncludeNarration.value = !!(d.metadata && d.metadata.storyboard_include_narration)
    storyboardUniversalOmni.value = !!(d.metadata && d.metadata.storyboard_universal_omni)
    storyboardUseFirstLastFrame.value = !!(d.metadata && d.metadata.storyboard_use_first_last_frame)
    lastFrameUseFirstLayoutLock.value = d.metadata?.last_frame_use_first_layout_lock !== false
    if (storyboardUseFirstLastFrame.value && gridMode.value !== 'single') {
      gridMode.value = 'single'
    }
    const list = d.episodes || []
    // 优先保持当前选中的集（按 id 在最新列表中查找），避免 AI 生成角色等操作后误切到其他集
    const currentId = selectedEpisodeId.value
    let ep = currentId != null ? list.find((e) => Number(e.id) === Number(currentId)) : null
    if (!ep) {
      const wantNum = savedCurrentEpisodeNumber.value
      ep = list.find((e) => Number(e.episode_number) === Number(wantNum)) || list[0] || null
    }
    store.setCurrentEpisode(ep)
    if (ep) {
      store.setScriptContent(ep.script_content || '')
      scriptTitle.value = ep.title || t('filmCreate.episodeNum', { num: ep.episode_number || 0 })
      selectedEpisodeId.value = ep.id
    } else {
      store.setScriptContent('')
      scriptTitle.value = ''
      selectedEpisodeId.value = null
    }
    syncStoryboardStateFromEpisode(ep)
    await loadStoryboardMedia()
    await recoverAndSyncEpisodeTasks(ep?.id)
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.loadFailed'))
  }
}

function onLastFrameLayoutLockChange() {
  saveProjectSettings()
}

function updateStoryboardDialogue(sbId) {
  // 可在此防抖后调用后端更新 dialogue
}

/**
 * @param {boolean} includeGenerationStyle - 仅在选择「画面风格」为 true：写入 dramas.style 与 style_prompt_*。
 * 其它项目设置改为 false，避免界面未刷新时仍用旧的 generationStyle 覆盖外部已更新的画风（如直接调 API PUT outline）。
 */
async function saveProjectSettings(includeGenerationStyle = false) {
  if (!store.dramaId) return
  const metadata = {
    story_style: storyStyle.value || undefined,
    aspect_ratio: projectAspectRatio.value || '16:9',
    video_clip_duration: videoClipDuration.value || 5,
    storyboard_include_narration: !!storyboardIncludeNarration.value,
    storyboard_universal_omni: !!storyboardUniversalOmni.value,
    storyboard_use_first_last_frame: !!storyboardUseFirstLastFrame.value,
    last_frame_use_first_layout_lock: !!lastFrameUseFirstLayoutLock.value,
  }
  if (includeGenerationStyle) {
    Object.assign(metadata, projectStylePromptMetadata())
  }
  const payload = {
    genre: storyType.value || undefined,
    metadata,
  }
  if (includeGenerationStyle) {
    payload.style = generationStyle.value || undefined
  }
  dramaAPI.saveOutline(store.dramaId, payload).catch(e => console.error('Settings auto-save failed', e))
}

/** 导出当前集分镜表（每镜一行；首尾帧模式含首/尾帧专用提示词） */
async function onExportStoryboardSheet() {
  const boards = storyboards.value || []
  if (!boards.length) {
    ElMessage.warning(t('filmCreate.noStoryboardsWarning'))
    return
  }
  const epNum = store.currentEpisode?.episode_number
  const dramaTitle = (store.drama?.title || 'project').replace(/[\\/:*?"<>|]/g, '_')
  const epLabel = epNum != null ? t('filmCreate.episodeNum', { num: epNum }) : `ep${currentEpisodeId.value || '1'}`
  const filenameBase = `${dramaTitle}-${epLabel}-${t('filmCreate.storyboardSheetFilename')}`
  const useFirstLast = !!storyboardUseFirstLastFrame.value

  exportingStoryboardSheet.value = true
  const framePromptBySbId = {}
  try {
    await Promise.all(
      boards.map(async (sb) => {
        try {
          const res = await storyboardsAPI.getFramePrompts(sb.id)
          const fps = res?.frame_prompts || []
          framePromptBySbId[sb.id] = {
            first: fps.find((r) => r.frame_type === 'first')?.prompt?.trim() || '',
            last: fps.find((r) => r.frame_type === 'last')?.prompt?.trim() || '',
          }
        } catch (_) {
          framePromptBySbId[sb.id] = { first: '', last: '' }
        }
      })
    )
  } finally {
    exportingStoryboardSheet.value = false
  }

  function resolveFirstFramePrompt(sbId) {
    const cached = framePromptBySbId[sbId]?.first
    if (cached) return cached
    const imgPrompt = getSbFirstImage(sbId)?.prompt?.trim()
    if (imgPrompt) return imgPrompt
    if (useFirstLast) return buildFirstFrameImagePrompt(sbId)
    return ''
  }

  function resolveLastFramePrompt(sbId) {
    const cached = framePromptBySbId[sbId]?.last
    if (cached) return cached
    const imgPrompt = getSbLastImage(sbId)?.prompt?.trim()
    if (imgPrompt) return imgPrompt
    if (useFirstLast) return buildLastFrameImagePrompt(sbId)
    return ''
  }

  const result = exportStoryboardSheet(
    {
      storyboards: boards,
      getScene: (sbId) => getSbSelectedScene(sbId),
      getCharacters: (sbId) => getSbSelectedCharacters(sbId),
      getProps: (sbId) => getSbSelectedProps(sbId),
      getMovementLabel,
      getFirstFramePrompt: resolveFirstFramePrompt,
      getLastFramePrompt: resolveLastFramePrompt,
      getField(sb, key) {
        const id = sb.id
        const map = {
          title: sbTitle.value[id],
          location: sbLocation.value[id],
          time: sbTime.value[id],
          duration: sbDuration.value[id] ?? sb.duration,
          dialogue: sbDialogue.value[id],
          narration: sbNarration.value[id],
          action: sbAction.value[id],
          result: sbResult.value[id],
          atmosphere: sbAtmosphere.value[id],
          shot_type: sbShotType.value[id],
          movement: sbMovement.value[id],
          layout_description: sbLayoutDescription.value[id],
          universal_segment_text: sbUniversalSegmentText.value[id],
        }
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          const v = map[key]
          return v != null && v !== '' ? v : sb[key]
        }
        return sb[key]
      },
    },
    filenameBase
  )

  if (!result.ok) {
    ElMessage.warning(t('filmCreate.noExportableContentWarning'))
    return
  }
  ElMessage.success(t('filmCreate.exportedStoryboardSheetCount', { count: result.count }))
}

// ── Composable: Storyboard Video ──────────────────────
const {
  toAbsoluteImageUrl,
  getMainImageUrlForVideo,
  sbCanSubmitVideo,
  buildSbVideoPromptForApi,
  getSbUniversalOmniRefSlots,
  collectSbOmniReferenceAbsoluteUrls,
  collectSbSceneOnlyReferenceAbsoluteUrls,
  invalidateActiveVideoAiConfigCache,
  getActiveVideoAiConfig,
  confirmUniversalNonSeedance2Video,
  sbVideoFirstLastUrls,
  onGenerateSbVideo,
  onResumeSbVideoPoll,
} = useStoryboardVideo({
  store,
  dramaId,
  videoResolution,
  projectAspectRatio,
  getSelectedStyle,
  getSbVideoDurationForApi,
  isSbUniversalMode,
  sbUniversalSegmentTrimmed,
  storyboardUseFirstLastFrame,
  getSbFirstFrameUrl,
  getSbLastFrameUrl,
  isSbVideoGenerating,
  getSbResumableFailedVideo,
  sbVideoErrors,
  sbSelectedVideoId,
  generatingSbVideoIds,
  getSbSelectedScene,
  getSbSelectedCharacters,
  getSbSelectedProps,
  hasAssetImage,
  assetImageUrl,
  buildSbGenMeta,
  pollTask: (...args) => pollTask(...args),
  loadSingleStoryboardMedia: (...args) => loadSingleStoryboardMedia(...args),
  genStore,
})

// ── Composable: Batch Generation ──────────────────────
const {
  startBatchImageGeneration,
  startBatchVideoGeneration,
} = useBatchGeneration({
  store,
  dramaId,
  currentEpisodeId,
  pipelineRunning,
  pipelineConcurrency,
  pipelineVideoConcurrency,
  batchImageRunning,
  batchImageStopping,
  batchImageProgress,
  batchImageErrors,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
  batchVideoErrors,
  videoFrameContiguity,
  sbImages,
  sbVideos,
  hasSbImage,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  gridMode,
  ensureProfessionalFramePrompt: (...args) => ensureProfessionalFramePrompt(...args),
  getSelectedStyle,
  projectAspectRatio,
  videoResolution,
  pollTask,
  loadStoryboardMedia,
  loadSingleStoryboardMedia,
  sbSelectedImgId,
  sbSelectedVideoId,
  restoreSelectionsFromBackend,
  recordHasPlayableVideoUrl,
  sbCanSubmitVideo,
  collectSbOmniReferenceAbsoluteUrls,
  getSbFirstFrameUrl,
  generatingSbVideoIds,
  getMainImageUrlForVideo,
  toAbsoluteImageUrl,
  sbVideoFirstLastUrls,
  buildSbVideoPromptForApi,
  getSbVideoDurationForApi,
  buildSbGenMeta,
})

/** 无 task_id 时轮询刷新直到资源出现图片或超时（用于角色/道具/场景图生成） */
async function pollUntilResourceHasImage(checker, maxAttempts = 20, intervalMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    await loadDrama()
    if (checker()) return
  }
}

function resolvePollMeta(meta = {}) {
  return {
    dramaId: meta.dramaId ?? dramaId.value,
    episodeId: meta.episodeId ?? currentEpisodeId.value,
    dramaTitle: meta.dramaTitle ?? store.drama?.title,
    episodeNumber: meta.episodeNumber ?? store.currentEpisode?.episode_number,
    resourceType: meta.resourceType || 'unknown',
    resourceId: meta.resourceId,
    label: meta.label,
    ...meta,
  }
}

function pollTask(taskId, onDone, meta = {}) {
  return genStore.pollTask(taskId, resolvePollMeta(meta), onDone, { ElMessage })
}

const {
  pipelineRunning,
  pipelinePaused,
  pipelineAbortRequested,
  pipelineErrorLog,
  pipelineCurrentStep,
  pipelineStepIndex,
  pipelineStepTotal,
  pipelineCountdown,
  pipelineCountdownMsg,
  pipelineConcurrency,
  pipelineVideoConcurrency,
  pipelineActiveTasks,
  loadPipelineConcurrency,
  runConcurrently,
  skipPipelineCountdown,
  startOneClickPipeline,
  startTextFrameworkPipeline,
  startRepairPipeline,
  onPipelineResume,
  pipelineRest,
  checkPause,
  waitForResume,
  pollTaskWithPause,
  addPipelineError,
} = usePipeline({
  store,
  dramaId,
  currentEpisodeId,
  scriptLanguage,
  storyInput,
  projectAspectRatio,
  videoResolution,
  sceneUseQuadGrid,
  storyboardUseFirstLastFrame,
  storyboardUniversalOmni,
  storyboardIncludeNarration,
  getSelectedStyle,
  getStoryboardCountForApi,
  getVideoDurationForApi,
  hasAssetImage,
  hasSbImage,
  getSbFirstFrameUrl,
  getMainImageUrlForVideo,
  toAbsoluteImageUrl,
  sbVideoFirstLastUrls,
  buildSbVideoPromptForApi,
  getSbVideoDurationForApi,
  recordHasPlayableVideoUrl,
  sbVideos,
  loadDrama,
  loadStoryboardMedia,
  loadSingleStoryboardMedia,
  refreshStoryboardsOnly,
  pollUntilResourceHasImage,
  generatingCharIds,
  generatingSceneIds,
  generatingPropIds,
  generatingSbImageIds,
  generatingSbVideoIds,
  ensureProfessionalFramePrompt,
  isSbUniversalMode,
  sbCanSubmitVideo,
  collectSbOmniReferenceAbsoluteUrls,
  polishUniversalSegmentsAfterGeneration,
  buildSbGenMeta,
  resolvePollMeta,
  genStore,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  getFinalizeMergeOptions,
  trackFilmCreateAction,
})

const agentContext = useAgentContext()
watch(currentEpisode, (episode) => {
  agentContext.setEpisodeId(episode?.id ?? null)
}, { immediate: true })

function onAgentChanged(event) {
  if (Number(event.detail?.dramaId) !== Number(dramaId.value)) return
  loadDrama()
}
window.addEventListener('lmd-agent-changed', onAgentChanged)

onBeforeUnmount(() => {
  window.removeEventListener('lmd-agent-changed', onAgentChanged)
  agentContext.clear()
})

function applyRouteToStore() {
  const id = route.params.id
  if (id && id !== 'new') {
    store.setDrama({ id: Number(id) })
    if (route.query.episode) {
      selectedEpisodeId.value = Number(route.query.episode)
    }
    loadDrama()
  } else {
    store.reset()
    storyInput.value = ''
    scriptTitle.value = ''
    selectedEpisodeId.value = null
    savedCurrentEpisodeNumber.value = 1
    storyStyle.value = ''
    storyType.value = ''
    scriptLanguage.value = 'zh'
    scriptStoryboardStyle.value = ''
    generationStyle.value = ''
    customStylePrompt.value = ''
  }
}

onMounted(async () => {
  loadPipelineConcurrency()
  applyRouteToStore()
})

watch(() => route.params.id, () => {
  applyRouteToStore()
})

// 剧本分集切换时同步 URL query 参数（?episode=<episode_id>），使刷新/分享页面仍保持当前选中集
// 同时监听 query 变化，支持浏览器前进/后退时自动切换对应集次
watch(
  () => selectedEpisodeId.value,
  (newId) => {
    if (!dramaId.value) return
    const currentInQuery = route.query.episode != null ? Number(route.query.episode) : null
    const desired = newId != null ? Number(newId) : null
    if (currentInQuery !== desired) {
      const newQuery = { ...route.query }
      if (desired != null) {
        newQuery.episode = String(desired)
      } else {
        delete newQuery.episode
      }
      router.replace({ query: newQuery }).catch(() => {})
    }
  },
  { flush: 'post' }
)

watch(
  () => route.query.episode,
  (newEp) => {
    if (!dramaId.value) return
    const newVal = newEp != null ? Number(newEp) : null
    const currentSel = selectedEpisodeId.value != null ? Number(selectedEpisodeId.value) : null
    if (currentSel !== newVal) {
      onEpisodeSelect(newVal)
    }
  }
)

const sbCardState = reactive({
  sbCharacterIds,
  sbPropIds,
  sbSceneId,
  sbNarration,
  sbUniversalSegmentText,
  ttsSbNarrationIds,
  generatingUniversalSegmentIds,
  dragOverSbId,
  generatingSbFirstImageIds,
  usingPrevTailAsFirstIds,
  sbImageUploadSlotById,
  generatingSbLastImageIds,
  generatingSbImageIds,
  uploadingSbImageId,
  upscalingSbIds,
  linkingTailFrameIds,
  ttsSbIds,
})

const sbCardActions = {
  getMovementLabel,
  onOpenVideoParamsDialog,
  isSbUniversalMode,
  onToggleSbUniversalMode,
  onInsertStoryboardBefore,
  onDeleteSingleStoryboard,
  setSbCharacterIds,
  setSbPropIds,
  setSbSceneId: (sbId, v) => {
    sbSceneId.value = { ...sbSceneId.value, [sbId]: v }
  },
  onStoryboardSceneChange,
  openImagePreview,
  onSbAddCharacterCommand,
  onOpenSbPromptDialog,
  onSaveSbNarrationField,
  onTtsSbNarration,
  sbNarrationAudioRelPath,
  playSbNarrationTts,
  onUniversalSegmentPromptMenu,
  sbUniversalSegmentTrimmed,
  getSbUniversalOmniRefSlots,
  onSaveUniversalSegmentField,
  getStripItems,
  onSbImageDragOver,
  onSbImageDragLeave,
  onSbImageDrop,
  getSbFirstImage,
  canUsePrevTailAsFirst,
  onUsePrevTailAsFirst,
  onUploadSbImageClick,
  showSbFramePromptPreview,
  onGenerateSbFrameImage,
  getSbLastImage,
  onLastFrameLayoutLockChange,
  stripItemTitle,
  onStripItemClick,
  onRemoveSbHistoryImage,
  getSbImage,
  onGenerateSbImage,
  onSelectStripItem,
  hasSbImage,
  onGenerateSbFramePair,
  hasSbFirstLastPair,
  getSbLocalImage,
  onUpscaleSbImage,
  getSbVideo,
  sbMainVideoPlayerKey,
  getSbVideoError,
  getSbResumableFailedVideo,
  onResumeSbVideoPoll,
  isSbVideoGenerating,
  sbCanSubmitVideo,
  onGenerateSbVideo,
  getVideoStripItems,
  onSelectSbMainVideo,
  getNextStoryboard,
  onLinkTailFrameToNext,
  onTtsSbDialogue,
  sbDialogueAudioRelPath,
  playSbDialogueTts,
}
</script>

<style scoped>
.film-create {
  min-height: 100vh;
  background: #16171e;
  background-image:
    radial-gradient(ellipse 80% 50% at 60% -5%, rgba(99, 102, 241, 0.13) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 90% 50%, rgba(139, 92, 246, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse 45% 35% at 5% 75%, rgba(79, 70, 229, 0.06) 0%, transparent 55%),
    linear-gradient(180deg, #16171e 0%, #1a1b24 40%, #1e1f29 100%);
  color: #e4e4e7;
}
html.light .film-create {
  background: #f8f7ff;
  background-image:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse 50% 40% at 85% 110%, rgba(99, 102, 241, 0.06) 0%, transparent 50%);
  color: #1e1b4b;
}

@media (max-width: 768px) {
  .main { margin-left: 48px !important; padding: 16px 12px 48px; }
  .asset-list-two { grid-template-columns: 1fr; }
}
/* 当前任务面板 - 已提取至 FilmHeader */

.main {
  margin-left: 180px;
  margin-right: 0;
  padding: 24px 32px 48px;
  transition: margin-left 0.25s cubic-bezier(.4,0,.2,1);
}
.sidebar-collapsed .main {
  margin-left: 48px;
}
.section {
  margin-bottom: 24px;
}
.card {
  background: #1e1f28;
  border-radius: 14px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}
.card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.25);
}
html.light .card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border-color: rgba(139, 92, 246, 0.08);
  box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 20px rgba(99, 102, 241, 0.05);
}
html.light .card:hover {
  border-color: rgba(139, 92, 246, 0.18);
  box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 36px rgba(99, 102, 241, 0.08);
}
.section-title {
  font-size: 1.05rem;
  margin: 0 0 4px;
  color: #f4f4f5;
  font-weight: 600;
  letter-spacing: -0.01em;
}
html.light .section-title { color: #1e1b4b; }

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(10, 10, 15, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  cursor: pointer;
  pointer-events: auto;
}
.empty-tip {
  color: #5a5a66;
  font-size: 0.9rem;
  padding: 16px 0;
}
html.light .empty-tip {
  color: #9ca3af;
}
</style>
