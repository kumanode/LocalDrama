<template>
  <div class="episode-batch-import-trigger">
    <el-button size="small" @click="openDialog">
      <el-icon><Upload /></el-icon>{{ t('episodeBatch.triggerButton') }}
    </el-button>

    <el-dialog
      v-model="visible"
      :title="t('episodeBatch.dialogTitle')"
      width="920px"
      append-to-body
      destroy-on-close
      @close="resetState"
    >
      <div class="batch-import-dialog">
        <el-tabs v-model="activeTab" class="batch-import-tabs">
          <el-tab-pane :label="t('episodeBatch.step1Settings')" name="config">
            <div class="batch-import-panel">
              <div class="batch-import-toolbar">
                <input ref="fileInputRef" type="file" accept=".txt,text/plain" style="display:none" @change="onFileChange" />
                <el-button @click="fileInputRef?.click()">
                  <el-icon><Upload /></el-icon>{{ t('episodeBatch.selectTxtFile') }}
                </el-button>
                <span class="batch-import-file" :class="{ 'is-empty': !fileName }">
                  {{ fileName || t('episodeBatch.noFileSelected') }}
                </span>
              </div>

              <el-form label-width="120px" class="batch-import-form">
                <el-form-item :label="t('episodeBatch.chapterRegex')">
                  <el-input v-model="chapterPattern" :placeholder="t('episodeBatch.chapterRegexPlaceholder')" />
                </el-form-item>
                <el-form-item :label="t('episodeBatch.chaptersPerEpisode')">
                  <el-input-number v-model="chaptersPerEpisode" :min="1" :max="100" />
                </el-form-item>
              </el-form>

              <div class="batch-import-tip-block">
                <div class="batch-import-tip">{{ t('episodeBatch.importTip1') }}</div>
                <div class="batch-import-tip">{{ t('episodeBatch.importTip2') }}</div>
                <div class="batch-import-tip">{{ t('episodeBatch.examplesLabel') }} <code class="batch-import-code">^\s*(第\d+章[^\n]*)</code>、<code class="batch-import-code">^\s*(Chapter\s*\d+[^\n]*)</code></div> <!-- i18n-scan-ignore: chapter regex examples -->
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="t('episodeBatch.step2Preview')" name="preview" :disabled="!previewReady">
            <div class="batch-import-panel">
              <template v-if="previewEpisodes.length">
                <div class="batch-import-preview-header">
                  <span>{{ t('episodeBatch.previewSummary', { chapters: previewChapters.length, episodes: previewEpisodes.length }) }}</span>
                </div>
                <el-table :data="previewEpisodes" border stripe height="420" class="batch-import-preview-table">
                  <el-table-column prop="episode_number" :label="t('episodeBatch.epNumberCol')" width="80" align="center" />
                  <el-table-column prop="title" :label="t('episodeBatch.epTitleCol')" min-width="220" show-overflow-tooltip />
                  <el-table-column :label="t('episodeBatch.includedChaptersCol')" min-width="260" show-overflow-tooltip>
                    <template #default="scope">
                      {{ scope.row.chapter_titles.join(', ') || t('episodeBatch.unnamedChapters') }}
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('episodeBatch.contentPreviewCol')" min-width="320" show-overflow-tooltip>
                    <template #default="scope">
                      <div class="batch-import-preview-cell batch-import-preview-cell--single-line">
                        {{ scope.row.script_content || t('episodeBatch.noContent') }}
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
              <div v-else class="batch-import-empty">{{ t('episodeBatch.confirmStep1First') }}</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
        <el-button v-if="activeTab === 'preview'" @click="activeTab = 'config'">{{ t('episodeBatch.previousStep') }}</el-button>
        <el-button
          v-if="activeTab === 'config'"
          type="primary"
          :disabled="!rawText.trim()"
          @click="confirmConfig"
        >{{ t('episodeBatch.parseAndPreview') }}</el-button>
        <el-button
          v-else
          type="primary"
          :disabled="!previewEpisodes.length"
          :loading="importing"
          @click="confirmImport"
        >{{ t('episodeBatch.confirmImport') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { locale, t } = useI18n()

const props = defineProps({
  startEpisodeNumber: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['import'])

const visible = ref(false)
const activeTab = ref('config')
const previewReady = ref(false)
const importing = ref(false)
const fileInputRef = ref(null)
const fileName = ref('')
const rawText = ref('')
const chapterPattern = ref('^\\s*(第[0-9０-９零一二三四五六七八九十百千万]+[章回节]|Chapter\\s*\\d+)[^\\n\\r]*') // i18n-scan-ignore: regex pattern
const chaptersPerEpisode = ref(1)
const previewChapters = ref([])
const previewEpisodes = ref([])

function openDialog() {
  visible.value = true
  activeTab.value = 'config'
}

defineExpose({
  openDialog,
})

function resetState() {
  visible.value = false
  activeTab.value = 'config'
  previewReady.value = false
  importing.value = false
  fileName.value = ''
  rawText.value = ''
  chapterPattern.value = '^\\s*(第[0-9０-９零一二三四五六七八九十百千万]+[章回节]|Chapter\\s*\\d+)[^\\n\\r]*' // i18n-scan-ignore: regex pattern
  chaptersPerEpisode.value = 1
  previewChapters.value = []
  previewEpisodes.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  fileName.value = file.name
  previewReady.value = false
  previewChapters.value = []
  previewEpisodes.value = []
  const reader = new FileReader()
  reader.onload = (ev) => {
    rawText.value = String(ev.target?.result || '')
  }
  reader.onerror = () => {
    ElMessage.error(t('episodeBatch.readFileFailed'))
  }
  reader.readAsText(file, 'utf-8')
}

function createChapterRegex(pattern) {
  const source = String(pattern || '').trim()
  if (!source) throw new Error(t('episodeBatch.enterChapterRegexPrompt'))
  try {
    return new RegExp(source, 'gm')
  } catch {
    throw new Error(t('episodeBatch.invalidRegexPrompt'))
  }
}

function splitNovelText(text, pattern) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const regex = createChapterRegex(pattern)
  const matches = []
  let match = null
  while ((match = regex.exec(normalized)) !== null) {
    matches.push({
      title: match[0].trim(),
      index: match.index,
    })
  }
  if (!matches.length) return []
  const chapters = []
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const start = current.index
    const end = next ? next.index : normalized.length
    const body = normalized.slice(start, end).trim()
    chapters.push({
      title: current.title,
      content: body,
    })
  }
  return chapters
}

function buildPreviewEpisodes(chapters, perEpisode, startEpNum) {
  const grouped = []
  const size = Math.max(1, Number(perEpisode) || 1)
  let currentNum = startEpNum
  for (let i = 0; i < chapters.length; i += size) {
    const chunk = chapters.slice(i, i + size)
    const titles = chunk.map((c) => c.title).filter(Boolean)
    const scriptContent = chunk.map((c) => c.content).filter(Boolean).join('\n\n')
    const primaryTitle = titles[0] || t('filmCreate.episodeNumber', { num: currentNum })
    grouped.push({
      episode_number: currentNum,
      title: primaryTitle,
      chapter_titles: titles,
      script_content: scriptContent,
    })
    currentNum++
  }
  return grouped
}

function confirmConfig() {
  if (!rawText.value.trim()) {
    ElMessage.warning(t('episodeBatch.selectFileFirstPrompt'))
    return
  }
  try {
    const chapters = splitNovelText(rawText.value, chapterPattern.value)
    if (!chapters.length) {
      ElMessage.warning(t('episodeBatch.noChaptersMatchedPrompt'))
      return
    }
    previewChapters.value = chapters
    previewEpisodes.value = buildPreviewEpisodes(chapters, chaptersPerEpisode.value, props.startEpisodeNumber)
    previewReady.value = true
    activeTab.value = 'preview'
  } catch (err) {
    ElMessage.error(err.message || t('episodeBatch.parseFailed'))
  }
}

async function confirmImport() {
  if (!previewEpisodes.value.length) return
  importing.value = true
  try {
    emit('import', previewEpisodes.value)
    ElMessage.success(t('episodeBatch.generatedEpisodesSuccess', { count: previewEpisodes.value.length }))
    resetState()
  } catch (err) {
    ElMessage.error(err.message || t('episodeBatch.importFailed'))
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.episode-batch-import-trigger {
  display: inline-block;
}
.batch-import-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.batch-import-tabs :deep(.el-tabs__content) {
  padding-top: 12px;
}
.batch-import-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.batch-import-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.batch-import-file {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.batch-import-file.is-empty {
  color: var(--el-text-color-placeholder);
}
.batch-import-form {
  max-width: 500px;
}
.batch-import-tip-block {
  padding: 12px 16px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.batch-import-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.batch-import-code {
  background: var(--el-fill-color-darker);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: var(--font-xs);
}
.batch-import-preview-header {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-color-primary);
  margin-bottom: var(--space-3);
}
.batch-import-preview-table {
  width: 100%;
}
.batch-import-preview-cell--single-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}
.batch-import-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-placeholder);
}
</style>
