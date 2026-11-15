<template>
  <div class="episode-batch-import-trigger">
    <el-button size="small" @click="openDialog">
      <el-icon><Upload /></el-icon>{{ locale === 'en' ? 'Batch Import Episodes' : '批量导入剧集' }}
    </el-button>

    <el-dialog
      v-model="visible"
      :title="locale === 'en' ? 'Batch Import Episodes' : '批量导入剧集'"
      width="920px"
      append-to-body
      destroy-on-close
      @close="resetState"
    >
      <div class="batch-import-dialog">
        <el-tabs v-model="activeTab" class="batch-import-tabs">
          <el-tab-pane :label="locale === 'en' ? '1. Settings' : '1. 导入设置'" name="config">
            <div class="batch-import-panel">
              <div class="batch-import-toolbar">
                <input ref="fileInputRef" type="file" accept=".txt,text/plain" style="display:none" @change="onFileChange" />
                <el-button @click="fileInputRef?.click()">
                  <el-icon><Upload /></el-icon>{{ locale === 'en' ? 'Select TXT File' : '选择 TXT 文件' }}
                </el-button>
                <span class="batch-import-file" :class="{ 'is-empty': !fileName }">
                  {{ fileName || (locale === 'en' ? 'No file selected' : '未选择文件') }}
                </span>
              </div>

              <el-form label-width="120px" class="batch-import-form">
                <el-form-item :label="locale === 'en' ? 'Chapter Regex' : '章节正则'">
                  <el-input v-model="chapterPattern" :placeholder="locale === 'en' ? 'e.g. ^\\s*(Chapter\\s*\\d+[^\\n]*)' : '例如：^\\s*(第\\d+章[^\\n]*)'" />
                </el-form-item>
                <el-form-item :label="locale === 'en' ? 'Chapters / Ep' : '每集章节数'">
                  <el-input-number v-model="chaptersPerEpisode" :min="1" :max="100" />
                </el-form-item>
              </el-form>

              <div class="batch-import-tip-block">
                <div class="batch-import-tip">{{ locale === 'en' ? 'Import prepared novel or script text files (.txt) into the project.' : '将提前准备好的小说原文或者剧本内容的.txt文件导入系统' }}</div>
                <div class="batch-import-tip">{{ locale === 'en' ? 'Please ensure the regex pattern correctly matches chapter headlines.' : '请正确输入用于匹配章节标题的正则表达式。' }}</div>
                <div class="batch-import-tip">{{ locale === 'en' ? 'Examples:' : '示例：' }} <code class="batch-import-code">^\s*(第\d+章[^\n]*)</code>、<code class="batch-import-code">^\s*(Chapter\s*\d+[^\n]*)</code></div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="locale === 'en' ? '2. Preview' : '2. 预览确认'" name="preview" :disabled="!previewReady">
            <div class="batch-import-panel">
              <template v-if="previewEpisodes.length">
                <div class="batch-import-preview-header">
                  <span>{{ locale === 'en' ? `Identified ${previewChapters.length} chapters, estimated ${previewEpisodes.length} episodes` : `共识别 ${previewChapters.length} 章，预计导入 ${previewEpisodes.length} 集` }}</span>
                </div>
                <el-table :data="previewEpisodes" border stripe height="420" class="batch-import-preview-table">
                  <el-table-column prop="episode_number" :label="locale === 'en' ? 'Ep #' : '集数'" width="80" align="center" />
                  <el-table-column prop="title" :label="locale === 'en' ? 'Title' : '集标题'" min-width="220" show-overflow-tooltip />
                  <el-table-column :label="locale === 'en' ? 'Chapters' : '包含章节'" min-width="260" show-overflow-tooltip>
                    <template #default="scope">
                      {{ scope.row.chapter_titles.join(', ') || (locale === 'en' ? 'Unnamed chapters' : '未识别章节标题') }}
                    </template>
                  </el-table-column>
                  <el-table-column :label="locale === 'en' ? 'Script Preview' : '内容预览'" min-width="320" show-overflow-tooltip>
                    <template #default="scope">
                      <div class="batch-import-preview-cell batch-import-preview-cell--single-line">
                        {{ scope.row.script_content || (locale === 'en' ? 'No content' : '暂无内容') }}
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
              <div v-else class="batch-import-empty">{{ locale === 'en' ? 'Please confirm settings in step 1 first' : '请先在上一步确认导入配置' }}</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
        <el-button v-if="activeTab === 'preview'" @click="activeTab = 'config'">{{ locale === 'en' ? 'Previous' : '上一步' }}</el-button>
        <el-button
          v-if="activeTab === 'config'"
          type="primary"
          :disabled="!rawText.trim()"
          @click="confirmConfig"
        >{{ locale === 'en' ? 'Parse & Preview' : '确认导入配置' }}</el-button>
        <el-button
          v-else
          type="primary"
          :disabled="!previewEpisodes.length"
          :loading="importing"
          @click="confirmImport"
        >{{ locale === 'en' ? 'Confirm Import' : '确认导入集数' }}</el-button>
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
const chapterPattern = ref('^\\s*(第[0-9０-９零一二三四五六七八九十百千万]+[章回节]|Chapter\\s*\\d+)[^\\n\\r]*')
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
  chapterPattern.value = '^\\s*(第[0-9０-９零一二三四五六七八九十百千万]+[章回节]|Chapter\\s*\\d+)[^\\n\\r]*'
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
    ElMessage.error(locale.value === 'en' ? 'Failed to read file' : '读取文件失败')
  }
  reader.readAsText(file, 'utf-8')
}

function createChapterRegex(pattern) {
  const source = String(pattern || '').trim()
  if (!source) throw new Error(locale.value === 'en' ? 'Please enter chapter regex' : '请输入章节正则')
  try {
    return new RegExp(source, 'gm')
  } catch {
    throw new Error(locale.value === 'en' ? 'Invalid regex pattern' : '章节正则格式不正确')
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
    const primaryTitle = titles[0] || (locale.value === 'en' ? `Episode ${currentNum}` : `第 ${currentNum} 集`)
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
    ElMessage.warning(locale.value === 'en' ? 'Please select a text file' : '请先选择待导入的文件')
    return
  }
  try {
    const chapters = splitNovelText(rawText.value, chapterPattern.value)
    if (!chapters.length) {
      ElMessage.warning(locale.value === 'en' ? 'No chapters matched with current regex' : '未按该正则识别到任何章节，请调整正则')
      return
    }
    previewChapters.value = chapters
    previewEpisodes.value = buildPreviewEpisodes(chapters, chaptersPerEpisode.value, props.startEpisodeNumber)
    previewReady.value = true
    activeTab.value = 'preview'
  } catch (err) {
    ElMessage.error(err.message || (locale.value === 'en' ? 'Failed to parse file' : '解析文件失败'))
  }
}

async function confirmImport() {
  if (!previewEpisodes.value.length) return
  importing.value = true
  try {
    emit('import', previewEpisodes.value)
    ElMessage.success(locale.value === 'en' ? `Successfully generated ${previewEpisodes.value.length} episodes` : `已成功生成 ${previewEpisodes.value.length} 集内容`)
    resetState()
  } catch (err) {
    ElMessage.error(err.message || (locale.value === 'en' ? 'Import failed' : '导入失败'))
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
  font-family: monospace;
}
.batch-import-preview-header {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-color-primary);
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
