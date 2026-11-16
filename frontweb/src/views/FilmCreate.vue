<template>
  <div class="film-create" :class="{ 'sidebar-collapsed': navCollapsed }">
    <FilmHeader
      :drama-id="dramaId"
      :drama-title="store.drama?.title"
      :episodes="store.drama?.episodes || []"
      v-model:selected-episode-id="selectedEpisodeId"
      :nav-collapsed="navCollapsed"
      :nav-steps="navSteps"
      :active-step-anchor="activeStepAnchor"
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
        class="hidden-file-input"
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
      <div class="script-save-status" role="status" aria-live="polite" :class="`is-${scriptSaveState}`">
        {{ scriptSaveState === 'saved'
          ? $t('filmCreate.savedChanges', { seconds: Math.floor((saveClock - scriptSavedAt) / 1000) })
          : $t(`filmCreate.${scriptSaveState}Changes`) }}
      </div>

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
        :readiness="pipelineReadiness"
        :cost-estimate="costEstimate"
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
        @generate-characters="charComposable.onGenerateCharacters"
        @extract-props="propComposable.onExtractProps"
        @extract-scenes="sceneComposable.onExtractScenes"
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

    <!-- Dialog Overlays & Image Preview -->
    <FilmCreateDialogs
      :state="dialogsState"
      :actions="dialogsActions"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAgentContext } from '@/stores/agentContext'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useFilmStore } from '@/stores/film'
import { useGenerationTaskStore, GEN_RESOURCE } from '@/stores/generationTaskStore'
import { isEpisodeExtractRunning } from '@/composables/useGenerationTaskSync'
import { dramaAPI } from '@/api/drama'
import { storyboardsAPI } from '@/api/storyboards'
import { aiAPI } from '@/api/ai'
import { systemSettingsAPI } from '@/api/prompts'
import { calculatePipelineReadiness, calculatePipelineCost } from '@/utils/pipelineReadinessAndCost'
import FilmHeader from '@/components/filmCreate/FilmHeader.vue'
import ScriptSection from '@/components/filmCreate/ScriptSection.vue'
import PipelinePanel from '@/components/filmCreate/PipelinePanel.vue'
import ResourceSection from '@/components/filmCreate/ResourceSection.vue'
import StoryboardSection from '@/components/filmCreate/StoryboardSection.vue'
import MergeExportSection from '@/components/filmCreate/MergeExportSection.vue'
import VideoConfigSection from '@/components/filmCreate/VideoConfigSection.vue'
import FilmCreateDialogs from '@/components/filmCreate/FilmCreateDialogs.vue'
import { useAssetMedia } from '@/composables/filmCreate/useAssetMedia'
import { useI18n } from '@/i18n'
import { useFilmCreateProductivity } from '@/composables/filmCreate/useFilmCreateProductivity'
import { generationStyleOptions } from '@/constants/styleOptions'
import { useWorkflowNavigation } from '@/composables/filmCreate/useWorkflowNavigation'
import { useProjectScript } from '@/composables/filmCreate/useProjectScript'
import { useResourceAssets } from '@/composables/filmCreate/useResourceAssets'
import { useStoryboardConfig } from '@/composables/filmCreate/useStoryboardConfig'
import { usePipeline } from '@/composables/filmCreate/usePipeline'
import { useStoryboardData } from '@/composables/filmCreate/useStoryboardData'
import { useMergeExport } from '@/composables/filmCreate/useMergeExport'
import { useGenerationStyle } from '@/composables/filmCreate/useGenerationStyle'
import { useStoryboardStudio } from '@/composables/filmCreate/useStoryboardStudio'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useFilmStore()
const genStore = useGenerationTaskStore()
const { videoResolution: storeVideoResolution } = storeToRefs(store)

const showAiConfigDialog = ref(false)
watch(showAiConfigDialog, (open) => {
  if (!open) {
    invalidateActiveVideoAiConfigCache()
    loadSystemAndConfigs()
  }
})
const aiConfigs = ref([])
const systemStatus = ref(null)

async function loadSystemAndConfigs() {
  try {
    const [cfg, sys] = await Promise.allSettled([aiAPI.list(), systemSettingsAPI.getSystemStatus()])
    if (cfg.status === 'fulfilled') aiConfigs.value = Array.isArray(cfg.value) ? cfg.value : []
    if (sys.status === 'fulfilled') systemStatus.value = sys.value || null
  } catch (_) {}
}
const storyInput = ref('')
const storyStyle = ref('')
const storyType = ref('')
const storyEpisodeCount = ref(1)
/** 剧本工作台：create 创作 | select 选择预览 */
const scriptWorkbenchMode = ref('create')
// P1-2: 小说导入
const showNovelImport = ref(false)
const scriptTitle = ref('')
const selectedEpisodeId = ref(null)
/** 保存剧本后用于恢复选中集（后端重插后 id 会变，用 episode_number 匹配） */
const savedCurrentEpisodeNumber = ref(1)
const scriptLanguage = ref('zh')
const scriptStoryboardStyle = ref('')
const projectAspectRatio = ref('16:9')
const videoClipDuration = ref(5)

const {
  generationStyle,
  customStylePrompt,
  getSelectedStylePrompt,
  getSelectedStylePromptZh,
  projectStylePromptMetadata,
  getSelectedStyle,
} = useGenerationStyle()

const scriptContent = computed({
  get: () => store.scriptContent,
  set: (v) => store.setScriptContent(v),
})
const videoResolution = storeVideoResolution

const dramaId = computed(() => store.dramaId)
const characters = computed(() => store.characters)
const scenes = computed(() => store.scenes)
const props = computed(() => store.props)
const storyboards = computed(() => store.storyboards)
const currentEpisode = computed(() => store.currentEpisode)
const currentEpisodeId = computed(() => store.currentEpisode?.id ?? null)
const pipelineReadiness = computed(() => calculatePipelineReadiness({
  currentEpisodeId: currentEpisodeId.value,
  scriptContent: scriptContent.value,
  aiConfigs: aiConfigs.value,
  systemStatus: systemStatus.value,
  characters: characters.value,
  storyboards: storyboards.value,
}))
const costEstimate = computed(() => calculatePipelineCost({
  storyboards: storyboards.value,
  characters: characters.value,
  scenes: scenes.value,
  aiConfigs: aiConfigs.value,
  // Shot media lives in per-shot maps, not only on the storyboard row.
  hasShotImage: (sb) => sbData.hasSbImage(sb),
  hasShotVideo: (sb) => sbData.getSbAllVideos(sb.id).length > 0 || Boolean(sb.video_url),
  expectedShotCount: storyboardCount.value,
}))
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
const assetMedia = useAssetMedia({ store, dramaId, loadDrama: (...args) => loadDrama(...args) })
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

// ── Composable: Resource Assets (Characters, Props, Scenes) ──
const {
  charComposable,
  charactersGenerating,
  generatingCharIds,
  propComposable,
  propsExtracting,
  generatingPropIds,
  sceneComposable,
  scenesExtracting,
  generatingSceneIds,
} = useResourceAssets({
  store,
  dramaId,
  currentEpisodeId,
  getSelectedStyle,
  scriptLanguage,
  loadDrama: (...args) => loadDrama(...args),
  pollTask: (...args) => pollTask(...args),
  pollUntilResourceHasImage: (...args) => pollUntilResourceHasImage(...args),
  hasAssetImage,
  dramaAPI,
})

// ── Composable: Storyboard Configuration (Params, Prompts, Narration) ──
const sbConfig = useStoryboardConfig({
  store,
  dramaId,
  currentEpisodeId,
  loadDrama: (...args) => loadDrama(...args),
  refreshStoryboardsOnly: (...args) => refreshStoryboardsOnly(...args),
  getSelectedStylePromptZh,
  getSelectedStylePrompt,
  pollTask: (...args) => sbData.pollTask(...args),
  videoClipDuration,
  storyboardUniversalOmni: () => storyboardUniversalOmni?.value,
  pipelineRest: (...args) => pipelineRest(...args),
  storyboards,
})
const {
  universalOmniPolishRunning,
  universalOmniPolishProgress,
  onExportNarrationSrt,
} = sbConfig

const sceneUseQuadGrid = ref(false)
const videoFrameContiguity = ref(false)


// 公共库弹窗状态已移至各 composable
const storyboardUseFirstLastFrame = ref(false)
/** 生成尾帧时是否注入首帧作站位/构图参考（默认开启） */
const lastFrameUseFirstLayoutLock = ref(true)
const gridMode = ref('single') // 序列图模式：single / quad_grid / nine_grid

// ── Composable: Storyboard Data (Base, Polling, Associations) ──
const sbData = useStoryboardData({
  store,
  dramaId,
  currentEpisodeId,
  storyboardUseFirstLastFrame,
  isSbUniversalMode: sbConfig.isSbUniversalMode,
  genStore,
  loadDrama: (...args) => loadDrama(...args),
  generatingCharIds,
  generatingPropIds,
  generatingSceneIds,
  videoErrorMsg,
  storyboards,
  characters,
  props,
  scenes,
  ensureProfessionalFramePrompt: (...args) => sbConfig.ensureProfessionalFramePrompt(...args),
  getSelectedStyle,
  projectAspectRatio,
})

const {
  sbImageFileInput,
  onSbImageFileChange,
  getCharAffectedStoryboards,
  getPropAffectedStoryboards,
  getSceneAffectedStoryboards,
  regenSbImagesForAsset,
  regenSbImagesProgress,
  onRegenAffectedSbImages,
  scrollToStoryboard,
  batchImageRunning,
  batchImageStopping,
  batchImageProgress,
  batchImageErrors,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
  batchVideoErrors,
} = sbData

// ── Composable: Project Script & Settings ─────────────
const {
  exportingStoryboardSheet, syncStoryboardStateFromEpisode, onEpisodeSelect, loadDrama,
  onLastFrameLayoutLockChange, onStoryboardUseFirstLastFrameChange, onNovelImported,
  updateStoryboardDialogue, saveProjectSettings, onExportStoryboardSheet, applyRouteToStore,
  storyboardCount, videoDuration, storyboardIncludeNarration, storyboardUniversalOmni,
  storyGenerating, scriptGenerating, showSelectScriptDialog, selectScriptLoading,
  selectScriptImporting, selectScriptDramas, selectPreviewEpisodeId,
  clipSecondsForStoryboardEstimate, shotCountEstimateFromDurationSec, estimateVideoDurationSecFromCharLen,
  scriptStoryboardEstimate, scriptEstimateVideoDurationHint, scriptEstimateVideoDurationTitle,
  scriptEstimateStoryboardHint, scriptEstimateStoryboardTitle, scriptTextTrimmedForEstimate,
  userFilledStoryboardCount, userFilledVideoDuration, getVideoDurationForApi, getStoryboardCountForApi,
  saveScriptToBackend, onGenerateStory, openSelectScriptDialog, loadSelectScriptList,
  onPickScriptFromDialog, onGenerateScript, onAddEpisode, refreshStoryboardsForEpisode,
  refreshStoryboardsOnly, onGenerateStoryboard, onAddSingleStoryboard, onDeleteSingleStoryboard,
  onInsertStoryboardBefore, selectableScriptDramas,
} = useProjectScript({
  store,
  route,
  router,
  dramaId,
  currentEpisodeId,
  storyInput,
  storyStyle,
  storyType,
  storyEpisodeCount,
  generationStyle,
  customStylePrompt,
  projectAspectRatio,
  videoClipDuration,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  selectedEpisodeId,
  savedCurrentEpisodeNumber,
  scriptTitle,
  scriptContent,
  scriptLanguage,
  scriptStoryboardStyle,
  scriptWorkbenchMode,
  projectStylePromptMetadata,
  syncAssociationsFromEpisode: sbData.syncAssociationsFromEpisode,
  syncVideoParamsFromStoryboards: sbConfig.syncVideoParamsFromStoryboards,
  loadStoryboardMedia: (...args) => sbData.loadStoryboardMedia(...args),
  recoverAndSyncEpisodeTasks: (...args) => sbData.recoverAndSyncEpisodeTasks(...args),
  getSbSelectedScene: (...args) => sbData.getSbSelectedScene(...args),
  getSbSelectedCharacters: (...args) => sbData.getSbSelectedCharacters(...args),
  getSbSelectedProps: (...args) => sbData.getSbSelectedProps(...args),
  getMovementLabel: sbConfig.getMovementLabel,
  getSbFirstImage: sbData.getSbFirstImage,
  getSbLastImage: sbData.getSbLastImage,
  buildFirstFrameImagePrompt: (...args) => sbConfig.buildFirstFrameImagePrompt(...args),
  buildLastFrameImagePrompt: (...args) => sbConfig.buildLastFrameImagePrompt(...args),
  sbFields: sbConfig.sbFields,
  genStore,
  getSelectedStyle,
  polishUniversalSegmentsAfterGeneration: (...args) => sbConfig.polishUniversalSegmentsAfterGeneration(...args),
  sbTruncatedWarning,
  sbTruncatedDismissed,
  trackFilmCreateAction,
  pollTask: (...args) => sbData.pollTask(...args),
})



// ── Composable: Pipeline ──────────────────────────────
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
  hasSbImage: sbData.hasSbImage,
  getSbFirstFrameUrl: sbData.getSbFirstFrameUrl,
  getMainImageUrlForVideo: (...args) => getMainImageUrlForVideo(...args),
  toAbsoluteImageUrl: (...args) => toAbsoluteImageUrl(...args),
  sbVideoFirstLastUrls: (...args) => sbVideoFirstLastUrls(...args),
  buildSbVideoPromptForApi: (...args) => buildSbVideoPromptForApi(...args),
  getSbVideoDurationForApi: sbConfig.getSbVideoDurationForApi,
  recordHasPlayableVideoUrl: sbData.recordHasPlayableVideoUrl,
  sbVideos: sbData.sbVideos,
  loadDrama,
  loadStoryboardMedia: (...args) => sbData.loadStoryboardMedia(...args),
  loadSingleStoryboardMedia: (...args) => sbData.loadSingleStoryboardMedia(...args),
  refreshStoryboardsOnly,
  pollUntilResourceHasImage: (...args) => sbData.pollUntilResourceHasImage(...args),
  generatingCharIds,
  generatingSceneIds,
  generatingPropIds,
  generatingSbImageIds: sbData.generatingSbImageIds,
  generatingSbVideoIds: sbData.generatingSbVideoIds,
  ensureProfessionalFramePrompt: sbConfig.ensureProfessionalFramePrompt,
  isSbUniversalMode: sbConfig.isSbUniversalMode,
  sbCanSubmitVideo: (...args) => sbCanSubmitVideo(...args),
  collectSbOmniReferenceAbsoluteUrls: (...args) => collectSbOmniReferenceAbsoluteUrls(...args),
  polishUniversalSegmentsAfterGeneration: sbConfig.polishUniversalSegmentsAfterGeneration,
  buildSbGenMeta: sbData.buildSbGenMeta,
  resolvePollMeta: sbData.resolvePollMeta,
  genStore,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  getFinalizeMergeOptions,
  trackFilmCreateAction,
})

// ── Composable: Storyboard Studio (Generators & Card Bindings) ──
const {
  sbCardState,
  sbCardActions,
  startBatchImageGeneration,
  startBatchVideoGeneration,
  toAbsoluteImageUrl,
  getMainImageUrlForVideo,
  sbCanSubmitVideo,
  buildSbVideoPromptForApi,
  collectSbOmniReferenceAbsoluteUrls,
  invalidateActiveVideoAiConfigCache,
  sbVideoFirstLastUrls,
} = useStoryboardStudio({
  ...sbData,
  ...sbConfig,
  store,
  dramaId,
  currentEpisodeId,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  ensureProfessionalFramePrompt: (...args) => sbConfig.ensureProfessionalFramePrompt(...args),
  buildLastFrameImagePrompt: (...args) => sbConfig.buildLastFrameImagePrompt(...args),
  getSelectedStyle,
  projectAspectRatio,
  assetImageUrl,
  buildSbGenMeta: sbData.buildSbGenMeta,
  pollTask: (...args) => sbData.pollTask(...args),
  loadDrama: (...args) => loadDrama(...args),
  loadSingleStoryboardMedia: (...args) => sbData.loadSingleStoryboardMedia(...args),
  refreshStoryboardsOnly: (...args) => refreshStoryboardsOnly(...args),
  restoreSelectionsFromBackend: (...args) => sbData.restoreSelectionsFromBackend(...args),
  genStore,
  videoResolution,
  getSbSelectedScene: (...args) => sbData.getSbSelectedScene(...args),
  getSbSelectedCharacters: (...args) => sbData.getSbSelectedCharacters(...args),
  getSbSelectedProps: (...args) => sbData.getSbSelectedProps(...args),
  hasAssetImage,
  pipelineRunning,
  pipelineConcurrency,
  pipelineVideoConcurrency,
  videoFrameContiguity,
  loadStoryboardMedia: (...args) => sbData.loadStoryboardMedia(...args),
  recordHasPlayableVideoUrl: sbData.recordHasPlayableVideoUrl,
  openImagePreview,
  onInsertStoryboardBefore,
  onDeleteSingleStoryboard,
  onLastFrameLayoutLockChange,
  getFirstImageFile,
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

// ── Composable: Workflow Navigation & Active Tasks ───
const {
  navCollapsed,
  storyboardMenuExpanded,
  toggleNav,
  scrollToAnchor,
  restoreScrollPosition,
  activeStepAnchor,
  allActiveTaskItems,
  allActiveTaskLabels,
  cancelActiveTask,
  navSteps,
} = useWorkflowNavigation({
  dramaId,
  genStore,
  pipelineRunning,
  pipelinePaused,
  pipelineAbortRequested,
  pipelineCurrentStep,
  storyGenerating,
  scriptGenerating,
  universalOmniPolishRunning: sbConfig.universalOmniPolishRunning,
  universalOmniPolishProgress: sbConfig.universalOmniPolishProgress,
  universalOmniPolishAbort: sbConfig.universalOmniPolishAbort,
  batchImageRunning: sbData.batchImageRunning,
  batchImageStopping: sbData.batchImageStopping,
  batchVideoRunning: sbData.batchVideoRunning,
  batchVideoStopping: sbData.batchVideoStopping,
  batchVideoProgress: sbData.batchVideoProgress,
  currentEpisodeId,
  scriptContent,
  characters,
  charactersGenerating,
  generatingCharIds,
  hasAssetImage,
  props,
  propsExtracting,
  generatingPropIds,
  scenes,
  scenesExtracting,
  generatingSceneIds,
  storyboards,
  storyboardGenerating,
  hasSbImage: sbData.hasSbImage,
  generatingSbImageIds: sbData.generatingSbImageIds,
  getSbAllVideos: sbData.getSbAllVideos,
  generatingSbVideoIds: sbData.generatingSbVideoIds,
})

// ── Dialog Overlays State & Actions ─────────────────
const dialogsState = reactive({
  ...sbConfig,
  showNovelImport,
  dramaId,
  scriptTitle,
  store,
  showAiConfigDialog,
  previewImageUrl,
})

const dialogsActions = {
  ...sbConfig,
  onCloseSbPrompt: () => {
    sbConfig.sbPromptTarget.value = null
  },
  onNovelImported,
  closeImagePreview,
}

const { scriptSaveState, scriptSavedAt, saveClock } = useFilmCreateProductivity({
  t,
  store,
  dramaId,
  currentEpisode,
  currentEpisodeId,
  scriptContent,
  saveScriptToBackend,
  storyboards,
  generateStoryboardImage: (sb) => sbCardActions.onGenerateSbImage(sb),
})

onMounted(async () => {
  loadPipelineConcurrency()
  loadSystemAndConfigs()
  await applyRouteToStore()
  await nextTick()
  restoreScrollPosition()

  // Esc closes any open dialog
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('lmd-agent-changed', onAgentChanged)
  window.removeEventListener('keydown', onGlobalKeydown)
  agentContext.clear()
})

function onGlobalKeydown(e) {
  if (e.key !== 'Escape') return
  const d = dialogsState
  if (d.showSbPromptDialog) d.showSbPromptDialog = false
  else if (d.showFramePromptEditor) d.showFramePromptEditor = false
  else if (d.showVideoParamsDialog) d.showVideoParamsDialog = false
  else if (d.showNovelImport) d.showNovelImport = false
  else if (d.showAiConfigDialog) d.showAiConfigDialog = false
  else if (d.previewImageUrl) closeImagePreview()
}

watch(() => route.params.id, async () => {
  await applyRouteToStore()
  await nextTick()
  restoreScrollPosition()
})

watch(
  () => store.drama?.title,
  (title) => {
    if (title) {
      document.title = `${title} - LocalDrama`
    }
  },
  { immediate: true }
)
</script>

<style scoped src="./FilmCreate.css"></style>
