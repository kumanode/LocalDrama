<template>
  <div class="scene-model-map-page">
    <div class="page-header">
      <div class="header-left">
        <p class="page-desc">
          {{ t('sceneModelMap.pageDesc') }}
        </p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openAdd">
          <el-icon><Plus /></el-icon>
          {{ t('sceneModelMap.addMapping') }}
        </el-button>
      </div>
    </div>

    <div v-if="loading" v-loading="true" class="loading-wrap" />
    
    <template v-else>
      <el-table
        :data="list"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="key" :label="t('sceneModelMap.sceneKeyCol')" min-width="220">
          <template #default="{ row }">
            <div class="">
              <code class="scene-key">{{ row.key }}</code>
              <span class="scene-key-label">{{ getSceneKeyLabel(row.key) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="service_type" :label="t('sceneModelMap.serviceType')" width="120">
          <template #default="{ row }">
            <el-tag :type="serviceTypeTagType(row.service_type)" size="small">
              {{ serviceTypeLabel(row.service_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="config_name" :label="t('sceneModelMap.aiConfig')" min-width="180">
          <template #default="{ row }">
            <span v-if="row.config_id">{{ row.config_name || t('sceneModelMap.configNumbered', { id: row.config_id }) }}</span>
            <el-tag v-else type="info" size="small">{{ t('sceneModelMap.defaultConfig') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="model_override" :label="t('sceneModelMap.modelOverride')" min-width="180">
          <template #default="{ row }">
            <span v-if="row.model_override" class="model-override">{{ row.model_override }}</span>
            <span v-else class="text-muted">{{ t('sceneModelMap.useConfigDefaultModel') }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" :label="t('common.description')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="$t('common.actions')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">{{ $t('common.edit') }}</el-button>
            <el-button link type="danger" size="small" @click="onDelete(row)">{{ $t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="list.length === 0" :description="t('sceneModelMap.noMappingsConfigured')" />
    </template>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingKey ? t('sceneModelMap.editDialogTitle') : t('sceneModelMap.addDialogTitle')"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item prop="key" :label="t('sceneModelMap.sceneKeyLabel')">
          <el-select
            v-model="form.key"
            filterable
            allow-create
            default-first-option
            :placeholder="t('sceneModelMap.selectOrEnterSceneKey')"
            style="width: 100%"
            :disabled="!!editingKey"
            @change="onKeyChange"
          >
            <el-option
              v-for="k in predefinedKeys"
              :key="k.value"
              :label="k.label"
              :value="k.value"
            />
          </el-select>
          <p class="field-tip">{{ t('sceneModelMap.sceneKeyTip') }}</p>
        </el-form-item>

        <el-form-item prop="service_type" :label="t('sceneModelMap.serviceType')">
          <el-select v-model="form.service_type" :placeholder="t('sceneModelMap.selectServiceType')" style="width: 100%" disabled>
            <el-option :label="t('sceneModelMap.textChat')" value="text" />
            <el-option :label="t('sceneModelMap.textToImage')" value="image" />
            <el-option :label="t('sceneModelMap.storyboardImage')" value="storyboard_image" />
            <el-option :label="t('sceneModelMap.videoGeneration')" value="video" />
            <el-option :label="t('sceneModelMap.speechSynthesisTts')" value="tts" />
          </el-select>
          <p class="field-tip">{{ t('sceneModelMap.serviceTypeTip') }}</p>
        </el-form-item>

        <el-form-item :label="t('sceneModelMap.aiConfig')">
          <el-select
            v-model="form.config_id"
            clearable
            :placeholder="t('sceneModelMap.selectConfigPlaceholder')"
            style="width: 100%"
            @change="onConfigChange"
          >
            <el-option
              v-for="c in filteredConfigs"
              :key="c.id"
              :label="`${c.name} (${c.provider})`"
              :value="c.id"
            />
          </el-select>
          <p class="field-tip">{{ t('sceneModelMap.configTip') }}</p>
        </el-form-item>

        <el-form-item :label="t('sceneModelMap.modelOverride')">
          <el-select
            v-model="form.model_override"
            clearable
            :placeholder="t('sceneModelMap.selectModelPlaceholder')"
            style="width: 100%"
            :disabled="!selectedConfigModels.length"
          >
            <el-option
              v-for="m in selectedConfigModels"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
          <p class="field-tip">
            {{ selectedConfigModels.length ? t('sceneModelMap.selectFromAvailableModels') : t('sceneModelMap.pleaseSelectConfigFirst') }}
          </p>
        </el-form-item>
        <el-form-item prop="description" :label="t('common.description')">
          <el-input
            v-model="form.description"
            :placeholder="t('sceneModelMap.enterDescPlaceholder')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import { sceneModelMapAPI } from '@/api/sceneModelMap'
import { aiAPI } from '@/api/ai'
import { getSelectableModels } from '@/utils/modelSelection'

const { t, locale } = useI18n()
const loading = ref(false)
const saving = ref(false)
const list = ref([])
const configs = ref([])
const dialogVisible = ref(false)
const editingKey = ref(null)
const formRef = ref(null)

const form = ref({
  key: '',
  description: '',
  service_type: 'text',
  config_id: null,
  model_override: ''
})

const rules = computed(() => ({
  key: [{ required: true, message: t('sceneModelMap.pleaseEnterSceneKey'), trigger: 'blur' }],
  service_type: [{ required: true, message: t('sceneModelMap.pleaseSelectServiceType'), trigger: 'change' }]
}))

// 预定义场景键及其对应的服务类型
const predefinedKeys = computed(() => [
  { value: 'image_polish', label: t('sceneModelMap.imagePolishStoryboardImagePromptPolishing'), service_type: 'text' },
  { value: 'role_image_polish', label: t('sceneModelMap.roleImagePolishCharacterImagePromptPolishing'), service_type: 'text' },
  { value: 'prop_image_polish', label: t('sceneModelMap.propImagePolishPropImagePromptPolishing'), service_type: 'text' },
  { value: 'scene_image_polish', label: t('sceneModelMap.sceneImagePolishSceneImagePromptPolishing'), service_type: 'text' },
  { value: 'role_extraction', label: t('sceneModelMap.roleExtractionCharacterExtraction'), service_type: 'text' },
  { value: 'prop_extraction', label: t('sceneModelMap.propExtractionPropExtraction'), service_type: 'text' },
  { value: 'scene_extraction', label: t('sceneModelMap.sceneExtractionSceneExtraction'), service_type: 'text' },
  { value: 'storyboard_extraction', label: t('sceneModelMap.storyboardExtractionStoryboardGeneration'), service_type: 'text' },
  { value: 'identity_anchors', label: t('sceneModelMap.identityAnchorsCharacterVisualAnchors'), service_type: 'text' },
  { value: 'frame_prompt', label: t('sceneModelMap.framePromptFramePromptGeneration'), service_type: 'text' },
  { value: 'novel_import', label: t('sceneModelMap.novelImportNovelImportRewrite'), service_type: 'text' },
  { value: 'story_generation', label: t('sceneModelMap.storyGenerationStoryGeneration'), service_type: 'text' },
])

// 根据服务类型筛选配置
const filteredConfigs = computed(() => {
  const currentServiceType = form.value.service_type
  return configs.value.filter(c => c.service_type === currentServiceType && c.is_active)
})

// 获取选中配置的可用模型列表
const selectedConfigModels = computed(() => {
  return getSelectableModels(configs.value, form.value.service_type, form.value.config_id)
})

function serviceTypeLabel(type) {
  const map = {
    text: t('sceneModelMap.textChat'),
    image: t('sceneModelMap.textToImage'),
    storyboard_image: t('sceneModelMap.storyboardImage'),
    video: t('sceneModelMap.videoGeneration'),
    tts: t('sceneModelMap.speechSynthesisTts')
  }
  return map[type] || type
}

function serviceTypeTagType(type) {
  const map = {
    text: 'primary',
    image: 'success',
    storyboard_image: 'warning',
    video: 'danger',
    tts: 'info'
  }
  return map[type] || ''
}

// 获取场景键的 label
function getSceneKeyLabel(key) {
  const matched = predefinedKeys.value.find(k => k.value === key)
  if (matched) {
    // 从 label 中提取描述部分（去掉 key 前缀）
    return matched.label.replace(matched.value + ' - ', '')
  }
  return ''
}

// 场景键改变时自动设置服务类型
function onKeyChange(key) {
  const matched = predefinedKeys.value.find(k => k.value === key)
  if (matched) {
    form.value.service_type = matched.service_type
  }
  // 重置配置和模型选择
  form.value.config_id = null
  form.value.model_override = ''
}

// 配置改变时重置模型选择
function onConfigChange(configId) {
  form.value.model_override = ''
}

async function load() {
  loading.value = true
  try {
    const [mapsData, configsData] = await Promise.all([
      sceneModelMapAPI.list(),
      aiAPI.list()
    ])
    configs.value = configsData || []
    
    // 合并配置名称
    list.value = (mapsData || []).map(item => {
      const config = configs.value.find(c => c.id === item.config_id)
      return {
        ...item,
        config_name: config?.name || null
      }
    })
  } catch (err) {
    ElMessage.error(t('sceneModelMap.loadFailed', { error: err.message || '' }))
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingKey.value = null
  form.value = {
    key: '',
    description: '',
    service_type: 'text',
    config_id: null,
    model_override: ''
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingKey.value = row.key
  form.value = {
    key: row.key,
    description: row.description || '',
    service_type: row.service_type || 'text',
    config_id: row.config_id || null,
    model_override: row.model_override || ''
  }
  dialogVisible.value = true
}

async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const body = {
      description: form.value.description,
      service_type: form.value.service_type,
      config_id: form.value.config_id || null,
      model_override: form.value.model_override || null
    }
    
    if (editingKey.value) {
      await sceneModelMapAPI.update(editingKey.value, body)
      ElMessage.success(t('sceneModelMap.updateSuccess'))
    } else {
      await sceneModelMapAPI.create({ ...body, key: form.value.key })
      ElMessage.success(t('sceneModelMap.createSuccess'))
    }
    dialogVisible.value = false
    await load()
  } catch (err) {
    ElMessage.error(t('sceneModelMap.saveFailed', { error: err.message || '' }))
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(
      t('sceneModelMap.deleteConfirm', { key: row.key }),
      t('sceneModelMap.deleteConfirmTitle'),
      { type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel') }
    )
    await sceneModelMapAPI.delete(row.key)
    ElMessage.success(t('sceneModelMap.deleteSuccess'))
    await load()
  } catch (err) {
    if (err === 'cancel') return
    ElMessage.error(t('sceneModelMap.deleteFailed', { error: err.message || '' }))
  }
}

function resetForm() {
  formRef.value?.resetFields()
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.scene-model-map-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-desc {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.loading-wrap {
  padding: 40px;
}

.scene-key {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #409eff;
  width: fit-content;
}

.scene-key-label {
  font-size: 12px;
  color: #666;
}

.model-override {
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #096dd9;
}

.text-muted {
  color: #999;
  font-size: 13px;
}

.field-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
</style>
