<template>
  <div class="media-library-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t('common.back') }}
        </el-button>
        <h2 class="page-title">{{ $t('mediaLibrary.title') }}</h2>
      </div>
      <div class="header-actions">
        <LanguageToggle />
        <el-button type="primary" plain @click="triggerUpload">
          <el-icon><Upload /></el-icon>
          {{ $t('mediaLibrary.uploadMedia') }}
        </el-button>
        <input ref="uploadInput" type="file" accept="image/*,video/*" multiple style="display:none" @change="onUpload" />
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="mediaType" class="type-filter" @change="loadMedia">
        <el-radio-button value="all">{{ $t('mediaLibrary.typeAll') }}</el-radio-button>
        <el-radio-button value="image">{{ $t('mediaLibrary.typeImage') }}</el-radio-button>
        <el-radio-button value="video">{{ $t('mediaLibrary.typeVideo') }}</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        :placeholder="$t('mediaLibrary.searchPlaceholder')"
        class="search-input"
        clearable
        @input="debouncedLoad"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-progress">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>{{ $t('mediaLibrary.uploading', { current: uploadProgress.current, total: uploadProgress.total }) }}</span>
    </div>

    <!-- 媒体网格 -->
    <div v-loading="loading" class="media-grid">
      <div
        v-for="item in mediaItems"
        :key="item.id"
        class="media-card"
        :class="{ selected: selectedIds.has(item.id) }"
        @click="toggleSelect(item)"
      >
        <div class="media-thumb">
          <video v-if="item.type === 'video'" :src="itemUrl(item)" class="thumb-video" muted />
          <img v-else :src="itemUrl(item)" class="thumb-img" />
          <div class="media-overlay">
            <el-icon v-if="selectedIds.has(item.id)" class="check-icon"><CircleCheck /></el-icon>
            <div class="overlay-actions" @click.stop>
              <el-button
                size="small"
                plain
                class="preview-btn"
                @click.stop="openPreview(item)"
              >
                <el-icon><ZoomIn /></el-icon>
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                @click.stop="deleteItem(item)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        <div class="media-info">
          <span class="media-name" :title="item.name">{{ item.name || $t('library.unnamed') }}</span>
          <span class="media-meta">{{ formatSize(item.size) }}</span>
        </div>
      </div>

      <div v-if="!loading && mediaItems.length === 0" class="empty-media">
        <el-icon class="empty-icon"><Files /></el-icon>
        <p>{{ locale === 'en' ? 'No media yet, click upload to add' : '暂无素材，点击上传按钮添加' }}</p>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadMedia"
      />
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedIds.size > 0" class="batch-bar">
      <span>{{ locale === 'en' ? `Selected ${selectedIds.size} items` : `已选 ${selectedIds.size} 项` }}</span>
      <el-button size="small" @click="selectedIds.clear()">{{ $t('common.cancel') }}</el-button>
      <el-button size="small" type="danger" plain @click="batchDelete">{{ locale === 'en' ? 'Batch Delete' : '批量删除' }}</el-button>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="showPreview" :title="locale === 'en' ? 'Media Preview' : '素材预览'" width="800px" destroy-on-close>
      <div class="preview-content">
        <video
          v-if="previewItem?.type === 'video'"
          :src="itemUrl(previewItem)"
          controls
          class="preview-video"
          autoplay
        />
        <img v-else-if="previewItem" :src="itemUrl(previewItem)" class="preview-image" />
      </div>
      <div class="preview-meta">
        <div class="meta-row"><span>{{ $t('common.name') }}: </span>{{ previewItem?.name || $t('library.unnamed') }}</div>
        <div class="meta-row"><span>{{ locale === 'en' ? 'Size: ' : '大小：' }}</span>{{ formatSize(previewItem?.size) }}</div>
        <div class="meta-row"><span>{{ locale === 'en' ? 'Created: ' : '创建时间：' }}</span>{{ previewItem?.created_at }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Upload, Search, Loading, CircleCheck,
  ZoomIn, Delete, Files
} from '@element-plus/icons-vue'
import { uploadAPI } from '@/api/upload'
import request from '@/utils/request'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'

const { locale, t } = useI18n()

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref({ current: 0, total: 0 })
const mediaItems = ref([])
const mediaType = ref('all')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(30)
const total = ref(0)
const selectedIds = reactive(new Set())
const showPreview = ref(false)
const previewItem = ref(null)
const uploadInput = ref(null)
let keywordTimer = null

function triggerUpload() {
  uploadInput.value?.click()
}

async function onUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  for (const file of files) {
    try {
      await uploadAPI.uploadImage(file)
      uploadProgress.value.current++
    } catch (err) {
      ElMessage.warning(`${file.name}: ${err.message}`)
    }
  }
  uploading.value = false
  e.target.value = ''
  ElMessage.success(t('mediaLibrary.uploadSuccess'))
  loadMedia()
}

function debouncedLoad() {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(loadMedia, 400)
}

async function loadMedia() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
    }
    if (mediaType.value !== 'all') params.type = mediaType.value
    if (keyword.value) params.keyword = keyword.value
    const res = await request.get('/assets', { params })
    mediaItems.value = (res?.items || []).map(normalizeItem)
    total.value = res?.total || 0
  } catch (err) {
    mediaItems.value = []
  } finally {
    loading.value = false
  }
}

function normalizeItem(item) {
  const url = item.url || item.image_url || item.video_url || ''
  const isVideo = url.match(/\.(mp4|webm|mov)$/i) || item.type === 'video'
  return {
    ...item,
    type: isVideo ? 'video' : 'image',
    name: item.name || item.filename || (url.split('/').pop()),
  }
}

function itemUrl(item) {
  if (!item) return ''
  const lp = item.local_path || item.image_local_path || item.video_local_path
  if (lp) return '/static/' + lp.replace(/^\//, '')
  return item.url || item.image_url || item.video_url || ''
}

function formatSize(size) {
  if (!size) return ''
  if (size > 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB'
  if (size > 1024) return (size / 1024).toFixed(0) + ' KB'
  return size + ' B'
}

function toggleSelect(item) {
  if (selectedIds.has(item.id)) {
    selectedIds.delete(item.id)
  } else {
    selectedIds.add(item.id)
  }
}

function openPreview(item) {
  previewItem.value = item
  showPreview.value = true
}

async function deleteItem(item) {
  await ElMessageBox.confirm(t('mediaLibrary.deleteConfirm'), t('filmList.deleteConfirmTitle'), {
    type: 'warning',
    confirmButtonText: t('common.delete'),
    cancelButtonText: t('common.cancel')
  })
  try {
    await request.delete(`/assets/${item.id}`)
    ElMessage.success(t('mediaLibrary.deleteSuccess'))
    loadMedia()
  } catch (err) {
    ElMessage.error(err.message || t('common.failed'))
  }
}

async function batchDelete() {
  const count = selectedIds.size
  await ElMessageBox.confirm(
    locale.value === 'en' ? `Delete selected ${count} items?` : `确定删除选中的 ${count} 个素材？`,
    t('filmList.deleteConfirmTitle'),
    { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }
  )
  for (const id of selectedIds) {
    try {
      await request.delete(`/assets/${id}`)
    } catch (_) {}
  }
  selectedIds.clear()
  ElMessage.success(t('mediaLibrary.deleteSuccess'))
  loadMedia()
}

onMounted(loadMedia)
</script>

<style scoped>
.media-library-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.search-input {
  max-width: 280px;
  margin-left: auto;
}
.upload-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 6px;
  font-size: 13px;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 200px;
}
.media-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, #e4e7ed);
  background: var(--bg-card, #fff);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.media-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.media-card.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary);
}
.media-thumb {
  position: relative;
  aspect-ratio: 16/9;
  background: #111;
  overflow: hidden;
}
.thumb-img, .thumb-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px;
}
.media-card:hover .media-overlay,
.media-card.selected .media-overlay {
  opacity: 1;
}
.check-icon {
  color: var(--el-color-primary);
  font-size: 20px;
}
.overlay-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.media-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.media-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.media-meta {
  font-size: 11px;
  color: var(--text-secondary, #909399);
}
.empty-media {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-secondary, #909399);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
.batch-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e4e7ed);
  border-radius: 999px;
  padding: 8px 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
  font-size: 14px;
}
.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 60vh;
  overflow: hidden;
  background: #000;
  border-radius: 6px;
}
.preview-video, .preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}
.preview-meta {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #909399);
}
.meta-row span {
  font-weight: 500;
  color: var(--text-primary, #303133);
}
</style>
