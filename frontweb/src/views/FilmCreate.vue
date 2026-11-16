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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAgentContext } from '@/stores/agentContext'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useFilmStore } from '@/stores/film'
import { useGenerationTaskStore, GEN_RESOURCE } from '@/stores/generationTaskStore'
import { isEpisodeExtractRunning } from '@/composables/useGenerationTaskSync'
import { dramaAPI } from '@/api/drama'
import { storyboardsAPI } from '@/api/storyboards'
import AIConfigContent from '@/components/AIConfigContent.vue'
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
import { generationStyleOptions } from '@/constants/styleOptions'
import { useNavigation } from '@/composables/filmCreate/useNavigation'
import { useStoryScript } from '@/composables/filmCreate/useStoryScript'
import { useResourceAssets } from '@/composables/filmCreate/useResourceAssets'
import { useNarration } from '@/composables/filmCreate/useNarration'
import { usePipeline } from '@/composables/filmCreate/usePipeline'
import { useStoryboards } from '@/composables/filmCreate/useStoryboards'
import { useStoryboardAssociations } from '@/composables/filmCreate/useStoryboardAssociations'
import { useMergeExport } from '@/composables/filmCreate/useMergeExport'
import { useFramePrompts } from '@/composables/filmCreate/useFramePrompts'
import { useUniversalSegments } from '@/composables/filmCreate/useUniversalSegments'
import { useStoryboardPromptDialog } from '@/composables/filmCreate/useStoryboardPromptDialog'
import { useStoryboardMediaGenerators } from '@/composables/filmCreate/useStoryboardMediaGenerators'
import { useTaskPolling } from '@/composables/filmCreate/useTaskPolling'
import { useProjectSettings } from '@/composables/filmCreate/useProjectSettings'
import { useActiveTasks } from '@/composables/filmCreate/useActiveTasks'
import { useStepNavigation } from '@/composables/filmCreate/useStepNavigation'
import { useGenerationStyle } from '@/composables/filmCreate/useGenerationStyle'
import { useStoryboardCardBindings } from '@/composables/filmCreate/useStoryboardCardBindings'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useFilmStore()
const genStore = useGenerationTaskStore()
const { videoResolution: storeVideoResolution } = storeToRefs(store)

// ── Composable: Navigation ─────────────────────────────
const { navCollapsed, storyboardMenuExpanded, toggleNav, scrollToAnchor } = useNavigation()


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
  set: (v) => store.setScriptContent(v)
})
const videoResolution = storeVideoResolution

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

// ── Composable: Video Params ───────────────────────────
const videoParamsComposable = useVideoParams({
  store,
  dramaId,
  currentEpisodeId,
  loadDrama: (...args) => loadDrama(...args),
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





const sceneUseQuadGrid = ref(false)

// 分镜行内编辑状态（按 storyboard id 存储）
// navCollapsed/storyboardMenuExpanded/toggleNav → 已移至 useNavigation composable

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


// 公共库弹窗状态已移至各 composable
const storyboardUseFirstLastFrame = ref(false)
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

// ── Composable: Task Polling ──────────────────────────
const {
  getGeneratingSetsBag,
  buildSbGenMeta,
  resolvePollMeta,
  pollTask,
  pollUntilResourceHasImage,
  recoverAndSyncEpisodeTasks,
} = useTaskPolling({
  store,
  dramaId,
  currentEpisodeId,
  genStore,
  loadDrama: (...args) => loadDrama(...args),
  loadSingleStoryboardMedia: (...args) => loadSingleStoryboardMedia(...args),
  generatingCharIds,
  generatingPropIds,
  generatingSceneIds,
  generatingSbImageIds,
  generatingSbFirstImageIds,
  generatingSbLastImageIds,
  generatingSbVideoIds,
  videoErrorMsg,
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

// ── Composable: Project Settings ──────────────────────
const {
  exportingStoryboardSheet,
  syncStoryboardStateFromEpisode,
  onEpisodeSelect,
  loadDrama,
  onLastFrameLayoutLockChange,
  onStoryboardUseFirstLastFrameChange,
  onNovelImported,
  updateStoryboardDialogue,
  saveProjectSettings,
  onExportStoryboardSheet,
  applyRouteToStore,
} = useProjectSettings({
  store,
  route,
  router,
  storyInput,
  storyStyle,
  storyType,
  generationStyle,
  customStylePrompt,
  projectAspectRatio,
  videoClipDuration,
  storyboardIncludeNarration,
  storyboardUniversalOmni,
  storyboardUseFirstLastFrame,
  lastFrameUseFirstLayoutLock,
  gridMode,
  selectedEpisodeId,
  savedCurrentEpisodeNumber,
  scriptTitle,
  scriptLanguage,
  scriptStoryboardStyle,
  projectStylePromptMetadata,
  syncAssociationsFromEpisode,
  syncVideoParamsFromStoryboards,
  loadStoryboardMedia: (...args) => loadStoryboardMedia(...args),
  recoverAndSyncEpisodeTasks: (...args) => recoverAndSyncEpisodeTasks(...args),
  getSbSelectedScene: (...args) => getSbSelectedScene(...args),
  getSbSelectedCharacters: (...args) => getSbSelectedCharacters(...args),
  getSbSelectedProps: (...args) => getSbSelectedProps(...args),
  getMovementLabel,
  getSbFirstImage,
  getSbLastImage,
  buildFirstFrameImagePrompt: (...args) => buildFirstFrameImagePrompt(...args),
  buildLastFrameImagePrompt: (...args) => buildLastFrameImagePrompt(...args),
  sbFields: {
    sbTitle,
    sbLocation,
    sbTime,
    sbDuration,
    sbDialogue,
    sbNarration,
    sbAction,
    sbResult,
    sbAtmosphere,
    sbShotType,
    sbMovement,
    sbLayoutDescription,
    sbUniversalSegmentText,
  },
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
  loadDrama: (...args) => loadDrama(...args),
  pollTask: (...args) => pollTask(...args),
  genStore,
  getSelectedStyle,
  projectStylePromptMetadata,
  polishUniversalSegmentsAfterGeneration: (...args) => polishUniversalSegmentsAfterGeneration(...args),
  sbTruncatedWarning,
  sbTruncatedDismissed,
  trackFilmCreateAction,
  onEpisodeSelect: (...args) => onEpisodeSelect(...args),
})

const selectableScriptDramas = computed(() => {
  const cur = store.dramaId
  const list = selectScriptDramas.value || []
  if (cur == null) return list
  return list.filter((d) => Number(d.id) !== Number(cur))
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
  hasSbImage,
  getSbFirstFrameUrl,
  getMainImageUrlForVideo: (...args) => getMainImageUrlForVideo(...args),
  toAbsoluteImageUrl: (...args) => toAbsoluteImageUrl(...args),
  sbVideoFirstLastUrls: (...args) => sbVideoFirstLastUrls(...args),
  buildSbVideoPromptForApi: (...args) => buildSbVideoPromptForApi(...args),
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
  sbCanSubmitVideo: (...args) => sbCanSubmitVideo(...args),
  collectSbOmniReferenceAbsoluteUrls: (...args) => collectSbOmniReferenceAbsoluteUrls(...args),
  polishUniversalSegmentsAfterGeneration,
  buildSbGenMeta,
  resolvePollMeta,
  genStore,
  sbTruncatedWarning,
  sbTruncatedDismissed,
  getFinalizeMergeOptions,
  trackFilmCreateAction,
})

// ── Composable: Storyboard Media Generators (Images, Video, Batch) ──
const {
  onGenerateSbFrameImage,
  onGenerateSbFramePair,
  onGenerateSbImage,
  getSbLocalImage,
  onUpscaleSbImage,
  onLinkTailFrameToNext,
  onUsePrevTailAsFirst,
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
  startBatchImageGeneration,
  startBatchVideoGeneration,
} = useStoryboardMediaGenerators({
  store,
  dramaId,
  currentEpisodeId,
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
  videoResolution,
  getSbVideoDurationForApi,
  isSbUniversalMode,
  sbUniversalSegmentTrimmed,
  getSbFirstFrameUrl,
  getSbLastFrameUrl,
  isSbVideoGenerating,
  getSbResumableFailedVideo,
  sbVideoErrors,
  sbSelectedVideoId,
  generatingSbVideoIds,
  getSbSelectedScene: (...args) => getSbSelectedScene(...args),
  getSbSelectedCharacters: (...args) => getSbSelectedCharacters(...args),
  getSbSelectedProps: (...args) => getSbSelectedProps(...args),
  hasAssetImage,
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
  loadStoryboardMedia: (...args) => loadStoryboardMedia(...args),
  recordHasPlayableVideoUrl,
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

// ── Composable: Active Tasks ──────────────────────────
const {
  isStoryGenRunning,
  allActiveTaskItems,
  allActiveTaskLabels,
  cancelActiveTask,
} = useActiveTasks({
  dramaId,
  genStore,
  pipelineRunning,
  pipelinePaused,
  pipelineAbortRequested,
  pipelineCurrentStep,
  storyGenerating,
  scriptGenerating,
  universalOmniPolishRunning,
  universalOmniPolishProgress,
  universalOmniPolishAbort,
  batchImageRunning,
  batchImageStopping,
  batchVideoRunning,
  batchVideoStopping,
  batchVideoProgress,
})

// ── Composable: Step Navigation ───────────────────────
const { navSteps } = useStepNavigation({
  genStore,
  dramaId,
  currentEpisodeId,
  scriptContent,
  isStoryGenRunning,
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
  universalOmniPolishRunning,
  hasSbImage,
  generatingSbImageIds,
  batchImageRunning,
  getSbAllVideos,
  generatingSbVideoIds,
  batchVideoRunning,
})

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

// ── Composable: Storyboard Card Bindings ───────────────
const { sbCardState, sbCardActions } = useStoryboardCardBindings({
  sbCharacterIds,
  sbPropIds,
  sbSceneId,
  sbNarration,
  sbUniversalSegmentText,
  ttsSbNarrationIds,
  generatingUniversalSegmentIds,
  generatingSbFirstImageIds,
  usingPrevTailAsFirstIds,
  sbImageUploadSlotById,
  generatingSbLastImageIds,
  generatingSbImageIds,
  uploadingSbImageId,
  upscalingSbIds,
  linkingTailFrameIds,
  ttsSbIds,
  getMovementLabel,
  onOpenVideoParamsDialog,
  isSbUniversalMode,
  onToggleSbUniversalMode,
  onInsertStoryboardBefore,
  onDeleteSingleStoryboard,
  setSbCharacterIds,
  setSbPropIds,
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
  getFirstImageFile,
  doUploadSbImage,
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
})
</script>

<style scoped src="./FilmCreate.css"></style>
