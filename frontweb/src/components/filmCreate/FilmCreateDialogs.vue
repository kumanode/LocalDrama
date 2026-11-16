<template>
  <SbPromptDialog
    :model-value="state.showSbPromptDialog"
    :target="state.sbPromptTarget"
    :image-text="state.sbPromptImageText"
    :polished-text="state.sbPromptPolishedText"
    :video-text="state.sbPromptVideoText"
    :polishing="state.sbPromptPolishing"
    :saving="state.sbPromptSaving"
    @update:model-value="(v) => (state.showSbPromptDialog = v)"
    @update:image-text="(v) => (state.sbPromptImageText = v)"
    @update:polished-text="(v) => (state.sbPromptPolishedText = v)"
    @update:video-text="(v) => (state.sbPromptVideoText = v)"
    @polish="actions.onPolishSbPrompt"
    @save="actions.onSaveSbPromptDialog"
    @close="actions.onCloseSbPrompt"
  />

  <FramePromptEditor
    :model-value="state.showFramePromptEditor"
    :slot="state.editingFramePromptSlot"
    :storyboard="state.editingFramePromptSb"
    :prompt-text="state.editingFramePromptText"
    :saving="state.editingFramePromptSaving"
    :regenerating="state.editingFramePromptRegenerating"
    @update:model-value="(v) => (state.showFramePromptEditor = v)"
    @update:prompt-text="(v) => (state.editingFramePromptText = v)"
    @save="actions.saveEditingFramePrompt"
    @regenerate="actions.regenerateEditingFramePrompt"
  />

  <VideoParamsDialog
    :model-value="state.showVideoParamsDialog"
    :target="state.videoParamsTarget"
    :params="state.videoParamsComposable"
    :saving="state.videoParamsSaving"
    :regenerating-layout-sb-ids="state.regeneratingLayoutSbIds"
    :split-by-audio-loading="state.splitByAudioLoading"
    @update:model-value="(v) => (state.showVideoParamsDialog = v)"
    @close="actions.onVideoParamsDialogClosed"
    @save="actions.onSaveVideoParams"
    @regen-layout="actions.onRegenerateLayoutDescription"
    @split-audio="actions.onSplitSbByAudio"
  />

  <NovelImportDialog
    :model-value="state.showNovelImport"
    :drama-id="state.dramaId"
    :script-title="state.scriptTitle"
    :store="state.store"
    @update:model-value="(v) => (state.showNovelImport = v)"
    @imported="actions.onNovelImported"
  />

  <el-dialog
    :model-value="state.showAiConfigDialog"
    :title="$t('routes.aiConfig')"
    width="90%"
    destroy-on-close
    class="ai-config-dialog"
    @update:model-value="(v) => (state.showAiConfigDialog = v)"
  >
    <AIConfigContent v-if="state.showAiConfigDialog" />
  </el-dialog>

  <Teleport to="body">
    <div
      v-if="state.previewImageUrl"
      class="image-preview-overlay"
      @click="actions.closeImagePreview"
    >
      <img
        :src="state.previewImageUrl"
        alt=""
        class="image-preview-img"
        @click.stop="actions.closeImagePreview"
      />
    </div>
  </Teleport>
</template>

<script setup>
import SbPromptDialog from './SbPromptDialog.vue'
import FramePromptEditor from './FramePromptEditor.vue'
import VideoParamsDialog from './VideoParamsDialog.vue'
import NovelImportDialog from './NovelImportDialog.vue'
import AIConfigContent from '@/components/AIConfigContent.vue'

defineProps({
  state: {
    type: Object,
    required: true,
  },
  actions: {
    type: Object,
    required: true,
  },
})
</script>
