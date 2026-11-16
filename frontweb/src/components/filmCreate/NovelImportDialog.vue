<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('filmCreate.novelImportTitle')"
    width="600px"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="novelImportReset"
  >
    <div class="novel-import-dialog">
      <p style="color:#6b7280;font-size:13px;margin-bottom:12px">{{ $t('filmCreate.novelImportDesc') }}</p>
      <el-tabs v-model="novelImportMode">
        <el-tab-pane :label="$t('filmCreate.pasteTextTab')" name="text">
          <el-input
            v-model="novelText"
            type="textarea"
            :rows="10"
            :placeholder="$t('filmCreate.pasteNovelPlaceholder')"
          />
        </el-tab-pane>
        <el-tab-pane :label="$t('filmCreate.uploadFileTab')" name="file">
          <el-upload
            drag
            :auto-upload="false"
            :on-change="onNovelFileChange"
            accept=".txt,.md"
            :show-file-list="false"
          >
            <el-icon class="el-icon--upload"><DocumentAdd /></el-icon>
            <div class="el-upload__text">{{ $t('filmCreate.dragFileHint') }}<em>{{ $t('filmCreate.clickToUpload') }}</em></div>
          </el-upload>
          <div v-if="novelFileName" style="margin-top:8px;font-size:13px;color:#409eff">
            {{ $t('filmCreate.selectedFilePrefix') }}{{ novelFileName }}
          </div>
        </el-tab-pane>
      </el-tabs>
      <div class="novel-import-options" style="margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;font-size:13px">
          <span>{{ $t('filmCreate.maxImportEpisodes') }}</span>
          <el-input-number v-model="novelMaxChapters" :min="1" :max="20" size="small" style="width:100px" />
        </div>
        <el-checkbox v-model="novelAiSummarize" size="small">{{ $t('filmCreate.aiConvertToScriptFormat') }}</el-checkbox>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="novelImporting" @click="onImportNovel">{{ $t('filmCreate.startImport') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentAdd } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import { dramaAPI } from '@/api/drama'
import { parseScriptIntoEpisodes, episodesListToPlainScript } from '@/utils/scriptEpisodes'
import request from '@/utils/request'
import axios from 'axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  dramaId: {
    type: [Number, String],
    default: null,
  },
  scriptTitle: {
    type: String,
    default: '',
  },
  store: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'imported'])

const { t } = useI18n()

const novelImportMode = ref('text')
const novelText = ref('')
const novelFileName = ref('')
const novelFileContent = ref('')
const novelMaxChapters = ref(10)
const novelAiSummarize = ref(false)
const novelImporting = ref(false)

function novelImportReset() {
  novelText.value = ''
  novelFileName.value = ''
  novelFileContent.value = ''
}

function onNovelFileChange(file) {
  novelFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    novelFileContent.value = ev.target.result
  }
  reader.readAsText(file.raw || file, 'utf-8')
}

async function onImportNovel() {
  const text = novelImportMode.value === 'file' ? novelFileContent.value : novelText.value
  if (!text?.trim()) {
    ElMessage.warning(t('filmCreate.enterNovelContentWarning'))
    return
  }
  novelImporting.value = true
  try {
    const formData = new FormData()
    if (novelImportMode.value === 'file' && novelFileContent.value) {
      const blob = new Blob([novelFileContent.value], { type: 'text/plain' })
      formData.append('file', blob, novelFileName.value || 'novel.txt')
    } else {
      formData.append('text', text)
    }
    formData.append('title', props.scriptTitle || t('filmCreate.importNovelTitle'))
    formData.append('max_chapters', String(novelMaxChapters.value))
    formData.append('ai_summarize', String(novelAiSummarize.value))

    const baseURL = request.defaults?.baseURL || '/api/v1'
    const res = await axios.post(`${baseURL}/dramas/import-novel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    let chapters = res.data?.data?.chapters || res.data?.chapters || []
    if (!chapters.length) {
      ElMessage.warning(t('filmCreate.noChapterRecognized'))
      return
    }

    const clientParsed = parseScriptIntoEpisodes(text)
    if (clientParsed.split && clientParsed.episodes.length > chapters.length) {
      chapters = clientParsed.episodes.map((e, i) => ({
        index: i + 1,
        title: e.title,
        content: e.script_content,
        script: e.script_content,
      }))
    }
    const toEpisodeRow = (ch, i) => ({
      episode_number: i + 1,
      title: (ch.title && String(ch.title).trim()) || t('filmCreate.episodeNum', { num: i + 1 }),
      script_content: String(ch.script ?? ch.content ?? '').trimEnd(),
      description: null,
      duration: 0,
    })
    const rows = chapters.map(toEpisodeRow)
    const plainScript = episodesListToPlainScript(
      rows.map((r) => ({ title: r.title, script_content: r.script_content }))
    )
    if (props.store.dramaId && rows.length >= 2) {
      await dramaAPI.saveEpisodes(props.store.dramaId, rows)
      emit('imported', { rows, multiple: true })
      ElMessage.success(t('filmCreate.importedAndSplitEpisodesSuccess', { count: rows.length }))
    } else {
      props.store.setScriptContent(plainScript || rows[0]?.script_content || '')
      emit('imported', { rows, multiple: false })
      ElMessage.success(
        rows.length >= 2
          ? t('filmCreate.importedChaptersCount', { count: rows.length })
          : t('filmCreate.importedChaptersSuccess', { count: rows.length })
      )
    }
    emit('update:modelValue', false)
    novelImportReset()
  } catch (e) {
    ElMessage.error(e.message || t('filmCreate.importFailed'))
  } finally {
    novelImporting.value = false
  }
}
</script>
