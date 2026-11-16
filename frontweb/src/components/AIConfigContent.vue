<template>
  <div class="ai-config-content">
    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane :label="$t('aiConfig.tabConfigs')" name="configs">
        <div class="tab-content">
          <!-- Normal mode actions -->
          <ProviderPresets
            :show-actions="!vendorLock.enabled"
            :selected-count="selectedRows.length"
            :batch-deleting="batchDeleting"
            :cheap-seedance2-visible="oneKeyCheapSeedance2Visible"
            :cheap-seedance2-key="oneKeyCheapSeedance2Key"
            :cheap-seedance2-saving="oneKeyCheapSeedance2Saving"
            :tongyi-visible="oneKeyTongyiVisible"
            :tongyi-key="oneKeyTongyiKey"
            :tongyi-saving="oneKeyTongyiSaving"
            :volc-visible="oneKeyVolcVisible"
            :volc-key="oneKeyVolcKey"
            :volc-saving="oneKeyVolcSaving"
            :agnes-visible="oneKeyAgnesVisible"
            :agnes-key="oneKeyAgnesKey"
            :agnes-saving="oneKeyAgnesSaving"
            @add="openAdd"
            @export="exportConfigs"
            @import="triggerImport"
            @preset="openProviderPreset"
            @delete-selected="onBatchDelete"
            @update:cheap-seedance2-visible="oneKeyCheapSeedance2Visible = $event"
            @update:cheap-seedance2-key="oneKeyCheapSeedance2Key = $event"
            @submit-cheap-seedance2="submitOneKeyCheapSeedance2"
            @update:tongyi-visible="oneKeyTongyiVisible = $event"
            @update:tongyi-key="oneKeyTongyiKey = $event"
            @submit-tongyi="submitOneKeyTongyi"
            @update:volc-visible="oneKeyVolcVisible = $event"
            @update:volc-key="oneKeyVolcKey = $event"
            @submit-volc="submitOneKeyVolc"
            @update:agnes-visible="oneKeyAgnesVisible = $event"
            @update:agnes-key="oneKeyAgnesKey = $event"
            @submit-agnes="submitOneKeyAgnes"
          />
          <input ref="importFileRef" type="file" accept=".json" hidden @change="importConfigs" />
          <!-- Vendor lock mode tip bar -->
          <VendorLockBanner v-if="vendorLock.enabled" @bulk-key="openBulkKey" />
          <p class="default-tip">{{ $t('aiConfig.defaultTip') }}</p>
          <ConfigTable
            :loading="loading"
            :rows="list"
            :vendor-locked="vendorLock.enabled"
            :service-type-label="serviceTypeLabel"
            @selection-change="onSelectionChange"
            @test="openTest"
            @edit="onRowEdit"
            @delete="onDelete"
          />
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('aiConfig.tabPrompts')" name="prompts">
        <div class="tab-content">
          <PromptEditor />
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('aiConfig.tabSceneModelMap')" name="sceneModelMap">
        <div class="tab-content">
          <SceneModelMap />
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('aiConfig.tabGeneration')" name="generation">
        <GenerationSettings
          :gen-concurrency-input="genConcurrencyInput"
          :gen-video-concurrency-input="genVideoConcurrencyInput"
          :content-language="contentLanguage"
          :content-language-saved="contentLanguageSaved"
          :gen-setting-saving="genSettingSaving"
          :gen-setting-saved="genSettingSaved"
          @update:gen-concurrency-input="genConcurrencyInput = $event"
          @update:gen-video-concurrency-input="genVideoConcurrencyInput = $event"
          @update:content-language="contentLanguage = $event"
          @concurrency-change="onConcurrencyChange"
          @video-concurrency-change="onVideoConcurrencyChange"
          @save-content-language="saveContentLanguage"
          @save-generation-settings="saveGenerationSettings"
        />
      </el-tab-pane>
      <el-tab-pane :label="$t('aiConfig.tabSd2Assets')" name="sd2_assets">
        <div class="tab-content">
          <Sd2AssetManagement :configs="list" @saved="loadList" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <ConfigEditDialog
      ref="editDialogRef"
      :model-value="dialogVisible"
      :title="vendorLock.enabled ? t('aiConfig.editKeyModelTitle') : (editingId ? t('aiConfig.editConfig') : t('aiConfig.addConfig'))"
      :vendor-locked="vendorLock.enabled"
      :form="form"
      :form-model-list="formModelList"
      :rules="rules"
      :is-deep-seek-official-form="isDeepSeekOfficialForm"
      :available-provider-options="availableProviderOptions"
      :available-models="availableModels"
      :endpoint-preview-info="endpointPreviewInfo"
      :service-type-label="serviceTypeLabel"
      :preset-model-pick="presetModelPick"
      :saving="saving"
      :jimeng2-assets-loading="jimeng2AssetsLoading"
      @update:model-value="dialogVisible = $event"
      @update:preset-model-pick="presetModelPick = $event"
      @closed="resetForm"
      @submit="submit"
      @service-type-change="onServiceTypeChange"
      @provider-change="onProviderChange"
      @preset-model-select="onPresetModelSelect"
      @open-jimeng-assets="openJimeng2MaterialAssetsDialog"
    />

    <!-- Jimeng 2 Auth: asset list -->
    <el-dialog
      v-model="jimeng2AssetsDialogVisible"
      :title="$t('aiConfig.jimeng2AssetsTitle')"
      width="720px"
      class="jimeng2-assets-dialog"
      destroy-on-close
      @closed="onJimeng2AssetsDialogClosed"
    >
      <p class="field-tip" style="margin-top: 0">
        {{ $t('aiConfig.docLabel') }}：
        <a href="https://83zi.com/sd2realperson.html" target="_blank" rel="noopener noreferrer">SilvaMux {{ $t('aiConfig.assetManageApiDoc') }}</a>
        {{ $t('aiConfig.jimeng2AssetsNote') }}
      </p>
      <el-table v-loading="jimeng2AssetsLoading" :data="jimeng2AssetsRows" stripe max-height="420" :empty-text="$t('aiConfig.noDataOrNotLoaded')">
        <el-table-column prop="id" :label="$t('aiConfig.assetId')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="name" :label="$t('common.name')" width="100" show-overflow-tooltip />
        <el-table-column prop="asset_type" :label="$t('aiConfig.serviceType')" width="88" />
        <el-table-column prop="status" :label="$t('common.status')" width="96">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'failed' ? 'danger' : 'info'" size="small">
              {{ row.status || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="asset_url" label="asset_url" min-width="160" show-overflow-tooltip />
        <el-table-column prop="url" :label="$t('aiConfig.originUrl')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="created_at" :label="$t('common.createTime')" width="160" show-overflow-tooltip />
      </el-table>
      <div v-if="jimeng2AssetsHasMore" style="margin-top: 12px; text-align: center">
        <el-button :loading="jimeng2AssetsLoading" @click="loadMoreJimeng2MaterialAssets">{{ $t('aiConfig.loadMore') }}</el-button>
      </div>
      <template #footer>
        <el-button @click="jimeng2AssetsDialogVisible = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- Test connection dialog -->
    <el-dialog v-model="testVisible" :title="$t('aiConfig.testConnection')" width="420px">
      <p v-if="testResult === null">{{ $t('aiConfig.testing') }}</p>
      <template v-else-if="testResult">
        <el-alert
          v-if="testServiceType === 'image' || testServiceType === 'storyboard_image' || testServiceType === 'video'"
          type="success"
          :title="$t('aiConfig.testSuccessTitle')"
          :description="$t('aiConfig.testSuccessDescMedia')"
          show-icon
          :closable="false"
        />
        <el-alert
          v-else
          type="success"
          :title="$t('aiConfig.testSuccessTitle')"
          :description="$t('aiConfig.testSuccessDescText')"
          show-icon
          :closable="false"
        />
      </template>
      <el-alert v-else type="error" :title="testError || $t('aiConfig.testFailedTitle')" show-icon :closable="false" />
      <template #footer>
        <el-button @click="testVisible = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- Bulk key dialog -->
    <el-dialog v-model="bulkKeyVisible" :title="$t('aiConfig.bulkKeyBtn')" width="440px" :close-on-click-modal="false">
      <el-alert
        type="warning"
        :closable="false"
        style="margin-bottom: 16px"
        :title="$t('aiConfig.bulkKeyAlert')"
        show-icon
      />
      <el-form label-width="80px">
        <el-form-item :label="$t('aiConfig.newApiKey')">
          <el-input
            v-model="bulkKeyInput"
            type="password"
            show-password
            :placeholder="$t('aiConfig.newApiKeyPlaceholder')"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bulkKeyVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="bulkKeySaving" :disabled="!bulkKeyInput.trim()" @click="submitBulkKey">{{ $t('aiConfig.confirmReplace') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { aiAPI } from '@/api/ai'
import { contentLanguageAPI, generationSettingsAPI } from '@/api/prompts'
import PromptEditor from '@/components/PromptEditor.vue'
import SceneModelMap from '@/components/SceneModelMap.vue'
import Sd2AssetManagement from '@/components/Sd2AssetManagement.vue'
import ConfigTable from '@/components/aiConfig/ConfigTable.vue'
import GenerationSettings from '@/components/aiConfig/GenerationSettings.vue'
import VendorLockBanner from '@/components/aiConfig/VendorLockBanner.vue'
import ProviderPresets from '@/components/aiConfig/ProviderPresets.vue'
import ConfigEditDialog from '@/components/aiConfig/ConfigEditDialog.vue'

const { t, te } = useI18n()

function openProviderPreset(kind) {
  const actions = {
    volc: openOneKeyVolc,
    agnes: openOneKeyAgnes,
    tongyi: openOneKeyTongyi,
    cheapSeedance2: openOneKeyCheapSeedance2,
  }
  actions[kind]?.()
}

const activeTab = ref('configs')
const importFileRef = ref(null)

// ---- Generation settings ----
const genConcurrencyInput = ref(3)
const genVideoConcurrencyInput = ref(3)
const genSettingSaving = ref(false)
const genSettingSaved = ref(false)
const contentLanguage = ref('zh')
const contentLanguageSaved = ref(false)

async function loadGenerationSettings() {
  try {
    const res = await generationSettingsAPI.get()
    genConcurrencyInput.value = res?.concurrency ?? 3
    genVideoConcurrencyInput.value = res?.video_concurrency ?? 3
  } catch (_) {}
  try {
    const res = await contentLanguageAPI.get()
    contentLanguage.value = res?.language || 'zh'
  } catch (_) {}
}

async function saveContentLanguage(language) {
  try {
    await contentLanguageAPI.update(language)
    contentLanguageSaved.value = true
    setTimeout(() => { contentLanguageSaved.value = false }, 2200)
  } catch (e) {
    ElMessage.error(e?.message || t('common.requestFailed'))
    await loadGenerationSettings()
  }
}

function onConcurrencyChange(val) {
  const n = Number(val)
  if (!isNaN(n) && n >= 1) genConcurrencyInput.value = Math.min(20, Math.max(1, Math.round(n)))
}

function onVideoConcurrencyChange(val) {
  const n = Number(val)
  if (!isNaN(n) && n >= 1) genVideoConcurrencyInput.value = Math.min(20, Math.max(1, Math.round(n)))
}

async function saveGenerationSettings() {
  const n = Number(genConcurrencyInput.value)
  const nv = Number(genVideoConcurrencyInput.value)
  if (isNaN(n) || n < 1 || n > 20) {
    ElMessage.warning(t('aiConfig.msgImageConcurrencyLimit'))
    return
  }
  if (isNaN(nv) || nv < 1 || nv > 20) {
    ElMessage.warning(t('aiConfig.msgVideoConcurrencyLimit'))
    return
  }
  genSettingSaving.value = true
  genSettingSaved.value = false
  try {
    await generationSettingsAPI.update({ concurrency: Math.round(n), video_concurrency: Math.round(nv) })
    genSettingSaved.value = true
    setTimeout(() => { genSettingSaved.value = false }, 2000)
  } catch (e) {
    ElMessage.error(t('aiConfig.msgSaveFailedPrefix') + (e?.message || ''))
  } finally {
    genSettingSaving.value = false
  }
}
const loading = ref(false)
const list = ref([])
const selectedRows = ref([])
const batchDeleting = ref(false)
const vendorLock = ref({ enabled: false, config_file: '' })
const dialogVisible = ref(false)
const editingId = ref(null)
const saving = ref(false)
const showProtocolHelp = ref(false)
const bulkKeyVisible = ref(false)
const bulkKeyInput = ref('')
const bulkKeySaving = ref(false)
const jimeng2AssetsDialogVisible = ref(false)
const jimeng2AssetsLoading = ref(false)
const jimeng2AssetsRows = ref([])
const jimeng2AssetsHasMore = ref(false)
const jimeng2AssetsNextCursor = ref(null)
const editDialogRef = ref(null)
const form = ref({
  service_type: 'text',
  name: '',
  provider: '',
  api_protocol: '',
  base_url: '',
  api_key: '',
  endpoint: '',
  query_endpoint: '',
  modelText: '',
  default_model: '',
  deepseek_thinking: 'disabled',
  deepseek_reasoning_effort: 'high',
  priority: 0,
  is_default: false,
  // Confirm video configuration supports omni multi-ref mode (stored in settings.supports_universal_omni)
  supports_universal_omni: false,
  // Kling Omni official AK/SK (stored in settings, JWT generated on backend)
  kling_access_key: '',
  kling_secret_key: '',
  kling_secret_key_base64: false,
  // TTS specific fields
  voice_id: '',
  group_id: '',
})
const presetModelPick = ref('')

const formModelList = computed(() => parseModelText(form.value.modelText))

// Ensure default model dropdown option is valid and in the list
watch(
  () => [formModelList.value, form.value.default_model],
  () => {
    const list = formModelList.value
    if (list.length === 0) return
    const current = form.value.default_model
    if (!current || !list.includes(current)) {
      form.value.default_model = list[0] || ''
    }
  },
  { immediate: true }
)

function onServiceTypeChange() {
  const st = form.value.service_type || 'text'
  if (st === 'jimeng2_character_auth') {
    if (!form.value.provider || form.value.provider === CUSTOM_PROVIDER_SENTINEL) {
      form.value.provider = 'jimeng_material_api'
    }
    const p = form.value.provider
    const pcfg = (providerConfigs.jimeng2_character_auth || []).find((x) => x.id === p)
    if (pcfg) {
      if (!form.value.base_url?.trim()) form.value.base_url = getBaseUrlForProvider(p)
      form.value.modelText = '-'
      form.value.default_model = '-'
      form.value.endpoint = ''
      form.value.query_endpoint = ''
      form.value.api_protocol = ''
    }
    if (!editingId.value && !form.value.name?.trim()) {
      form.value.name = te('aiConfig.types.jimeng2_character_auth') ? t('aiConfig.types.jimeng2_character_auth') : 'Jimeng2 Auth'
    }
    return
  }
  const listByType = providerConfigs[st] || []
  const current = form.value.provider
  if (!current || !listByType.some((p) => p.id === current)) {
    form.value.provider = ''
    form.value.base_url = ''
    form.value.modelText = ''
    form.value.default_model = ''
  }
}

function onPresetModelSelect(value) {
  if (!value) return
  const listParsed = parseModelText(form.value.modelText)
  if (listParsed.includes(value)) {
    presetModelPick.value = ''
    return
  }
  const append = listParsed.length ? '\n' + value : value
  form.value.modelText = (form.value.modelText || '').trim() + append
  presetModelPick.value = ''
}
const rules = computed(() => ({
  service_type: [{ required: true, message: t('aiConfig.rules.serviceType'), trigger: 'change' }],
  name: [{ required: true, message: t('aiConfig.rules.name'), trigger: 'blur' }],
  provider: [{ required: true, message: t('aiConfig.rules.provider'), trigger: 'change' }],
  base_url: [{ required: true, message: t('aiConfig.rules.baseUrl'), trigger: 'blur' }],
  api_key: [
    {
      validator: (_rule, v, cb) => {
        const st = form.value.service_type
        if (st === 'jimeng2_character_auth') {
          if (v != null && String(v).trim()) return cb()
          return cb(new Error(t('aiConfig.rules.tokenRequired')))
        }
        const proto = form.value.api_protocol
        const ak = (form.value.kling_access_key || '').trim()
        const sk = (form.value.kling_secret_key || '').trim()
        if (st === 'video' && proto === 'kling_omni' && ak && sk) return cb()
        if (v != null && String(v).trim()) return cb()
        cb(new Error(t('aiConfig.rules.apiKeyRequired')))
      },
      trigger: 'blur',
    },
  ],
}))
const testVisible = ref(false)
const testResult = ref(null)
const testServiceType = ref('')
const testError = ref('')
const oneKeyTongyiVisible = ref(false)
const oneKeyTongyiKey = ref('')
const oneKeyTongyiSaving = ref(false)
const oneKeyCheapSeedance2Visible = ref(false)
const oneKeyCheapSeedance2Key = ref('')
const oneKeyCheapSeedance2Saving = ref(false)
const oneKeyVolcVisible = ref(false)
const oneKeyVolcKey = ref('')
const oneKeyVolcSaving = ref(false)
const oneKeyAgnesVisible = ref(false)
const oneKeyAgnesKey = ref('')
const oneKeyAgnesSaving = ref(false)

/** Preset providers and models */
const providerConfigs = {
  text: [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'] },
    { id: 'volcengine', name: 'Volcengine', models: ['deepseek-v4-flash-ga-260731', 'deepseek-v4-1-flash-260910', 'doubao-seed-2-1-lite-260915'] },
    // { id: 'chatfire', name: 'Chatfire', models: ['gemini-3-flash-preview', 'claude-sonnet-4-5-20250929', 'doubao-seed-1-8-251228'] },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-pro', 'gemini-3-flash-preview'] },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
    { id: 'qwen', name: 'Qwen', models: ['qwen-plus', 'qwen3.6-plus', 'qwen-flash'] },
    { id: 'agnes', name: 'Agnes AI', models: ['agnes-3.0-flash', 'agnes-2.5-flash', 'agnes-2.5-pro', 'agnes-2.0-flash'] }
  ],
  image: [
    { id: 'volcengine', name: 'Volcengine', models: ['doubao-seedream-5-0-flash-260915', 'doubao-seedream-5-0-pro-260628', 'doubao-seedream-4-5-251128'] },
    { id: 'kling', name: 'Kling', models: ['kling-image', 'kling-omni-image'] },
    { id: 'nano_banana', name: 'NanoBanana', models: ['nano-banana-2', 'nano-banana-pro', 'nano-banana'] },
    // { id: 'chatfire', name: 'Chatfire', models: ['nano-banana-pro', 'doubao-seedream-4-5-251128', 'qwen-image'] },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'] },
    { id: 'flow2api', name: 'flow2api (Local Gemini Proxy)', models: ['gemini-3.1-flash-image', 'gemini-3.0-pro-image', 'imagen-4.0-generate-preview'] },
    { id: 'openai', name: 'OpenAI', models: ['dall-e-3', 'dall-e-2'] },
    { id: 'dashscope', name: 'DashScope', models: ['wan2.6-image', 'qwen-image-edit-plus-2026-01-09', 'qwen-image-edit-plus', 'qwen-image-edit-max'] },
    { id: 'qwen_image', name: 'Qwen', models: ['qwen-image-3.0', 'qwen-image-3.0-pro'] },
    { id: 'agnes', name: 'Agnes AI', models: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash', 'agnes-image-2.0-flash'] }
  ],
  storyboard_image: [
    { id: 'dashscope', name: 'DashScope', models: ['wan2.6-image', 'qwen-image-edit-plus-2026-01-09', 'qwen-image-edit-plus', 'qwen-image-edit-max'] },
    { id: 'volcengine', name: 'Volcengine', models: ['doubao-seedream-5-0-flash-260915', 'doubao-seedream-5-0-pro-260628', 'doubao-seedream-4-5-251128'] },
    { id: 'kling', name: 'Kling', models: ['kling-image', 'kling-omni-image'] },
    { id: 'nano_banana', name: 'NanoBanana', models: ['nano-banana-2', 'nano-banana-pro', 'nano-banana'] },
    // { id: 'chatfire', name: 'Chatfire', models: ['nano-banana-pro', 'doubao-seedream-4-5-251128', 'qwen-image'] },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'] },
    { id: 'flow2api', name: 'flow2api (Local Gemini Proxy)', models: ['gemini-3.1-flash-image', 'gemini-3.0-pro-image', 'imagen-4.0-generate-preview'] },
    { id: 'openai', name: 'OpenAI', models: ['dall-e-3', 'dall-e-2'] },
    { id: 'agnes', name: 'Agnes AI', models: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash', 'agnes-image-2.0-flash'] }
  ],
  video: [
    {
      id: 'cheap_seedance2',
      name: 'Cheap Seedance2',
      models: ['wb-seedance-2-fast', 'yk-seedance-mini', 'yk-seedance2.0-fast', 'yk-seedance2.0', 'minimax-h3-1080p-15s'],
    },
    { id: 'klingai', name: 'Kling Official Omni (api-beijing.klingai.com)', models: ['kling-video-o1', 'kling-v3-omni'] },
    { id: 'ffir', name: 'ffir API / Kling Omni-Video (ffir.cn)', models: ['kling-video-o1', 'kling-v3-omni'] },
    { id: 'kling', name: 'Kling', models: ['kling-omni-video', 'kling-video', 'kling-motion-control'] },
    { id: 'vidu', name: 'Vidu', models: ['viduq2', 'viduq2-pro', 'viduq2-turbo', 'viduq3-pro'] },
    { id: 'volces', name: 'Volcengine', models: ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128', 'doubao-seedance-2-5-260628', 'doubao-seedance-1-0-pro-250528', 'doubao-seedance-1-0-pro-fast-251015'] },
    // { id: 'chatfire', name: 'Chatfire', models: ['doubao-seedance-1-5-pro-251215', 'doubao-seedance-1-0-lite-i2v-250428', 'doubao-seedance-1-0-lite-t2v-250428', 'doubao-seedance-1-0-pro-250528', 'doubao-seedance-1-0-pro-fast-251015', 'sora-2', 'sora-2-pro'] },
    { id: 'minimax_h3', name: 'MiniMax H3', models: ['MiniMax-H3'] },
    { id: 'minimax', name: 'MiniMax Hailuo', models: ['MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-2.3-Fast', 'MiniMax-Hailuo-02'] },
    { id: 'gemini', name: 'Google Gemini (Veo)', models: ['veo-3.1-generate-preview', 'veo-3.0-generate-preview', 'veo-3.0-fast-generate-preview'] },
    { id: 'flow2api', name: 'flow2api (Local Gemini Proxy)', models: ['Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality', 'Omni 1.1 Flash', 'Omni 1.2 Flash'] },
    { id: 'dashscope', name: 'DashScope', models: ['wan2.6-r2v-flash', 'wan2.6-t2v', 'wan2.2-kf2v-flash', 'wan2.6-i2v-flash', 'wanx2.1-vace-plus'] },
    {
      id: 'jimeng_ai_api',
      name: 'Jimeng AI API',
      models: [
        'jimeng-video-seedance-2.0',
        'seedance-2.0',
        'jimeng-video-seedance-2.0-fast',
        'jimeng-video-3.0',
        'jimeng-video-3.0-pro',
        'jimeng-video-3.5-pro',
      ],
    },
    { id: 'openai', name: 'OpenAI', models: ['sora-2', 'sora-2-pro'] },
    { id: 'xai', name: 'xAI Grok Imagine', models: ['grok-imagine-video'] },
    { id: 'agnes', name: 'Agnes AI', models: ['agnes-video-2.5-flash', 'agnes-video-2.5', 'agnes-video-v2.0'] },
  ],
  tts: [
    { id: 'minimax', name: 'MiniMax T2A', models: ['speech-02-hd', 'speech-02-turbo'] },
  ],
  jimeng2_character_auth: [
    { id: 'jimeng_material_api', name: 'Jimeng Material API (/api/business/v1)', models: ['-'] },
  ],
}

/** Provider id -> default api_protocol */
const providerProtocolMap = {
  // image / storyboard_image
  volcengine: 'volcengine',
  volces: 'volcengine',
  volc: 'volcengine',
  nano_banana: 'nano_banana',
  dashscope: 'dashscope',
  qwen_image: 'dashscope',
  gemini: 'gemini',
  google: 'gemini',
  flow2api: 'gemini',
  kling: 'kling',
  ffir: 'kling_omni',
  klingai: 'kling_omni',
  // video
  vidu: 'vidu',
  xai: 'xai',
  grok: 'xai',
  minimax: 'openai',
  minimax_h3: 'minimax_h3',
  openai: 'openai',
  cheap_seedance2: 'sora',
  chatfire: 'openai',
  qwen: 'openai',
  deepseek: 'openai',
  agnes: 'openai',
  jimeng_ai_api: 'jimeng_ai_api',
  jimeng_material_api: '',
}

/** Provider id -> default Base URL */
function getBaseUrlForProvider(provider) {
  if (!provider) return ''
  const p = String(provider).toLowerCase()
  if (p === 'gemini' || p === 'google') return 'https://generativelanguage.googleapis.com'
  if (p === 'flow2api') return 'http://127.0.0.1:8000'
  if (p === 'minimax_h3') return 'https://api.minimaxi.com'
  if (p === 'minimax') return 'https://api.minimaxi.com/v1'
  if (p === 'volces' || p === 'volcengine') return 'https://ark.cn-beijing.volces.com/api/v3'
  if (p === 'openai') return 'https://api.openai.com/v1'
  if (p === 'cheap_seedance2') return 'https://workbench.ohmybb.xyz/api/openai'
  if (p === 'deepseek') return 'https://api.deepseek.com'
  if (p === 'dashscope') return 'https://dashscope.aliyuncs.com'
  if (p === 'qwen_image') return 'https://dashscope.aliyuncs.com'
  if (p === 'qwen') return 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  if (p === 'nano_banana') return 'https://api.nanobananaapi.ai'
  if (p === 'vidu') return 'https://api.vidu.cn'
  if (p === 'kling') return 'https://api.klingai.com'
  if (p === 'klingai') return 'https://api-beijing.klingai.com'
  if (p === 'ffir') return 'https://ffir.cn'
  if (p === 'jimeng_ai_api') return 'http://127.0.0.1:8000'
  if (p === 'jimeng_material_api') return 'https://silvamux.tingyutech.com'
  if (p === 'xai' || p === 'grok') return 'https://api.x.ai'
  if (p === 'agnes') return 'https://apihub.agnes-ai.com/v1'
  return 'https://api.chatfire.site/v1'
}

const CUSTOM_PROVIDER_SENTINEL = '__custom__'

function parseSettings(settings) {
  if (!settings) return {}
  if (typeof settings === 'object') return settings
  try {
    const parsed = JSON.parse(settings)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

function isDeepSeekOfficial(provider, baseUrl) {
  const p = String(provider || '').trim().toLowerCase()
  const base = String(baseUrl || '').trim().toLowerCase()
  return p === 'deepseek' || base.includes('api.deepseek.com')
}

function resolveDeepSeekFormSettings(row) {
  const s = parseSettings(row?.settings)
  const nested = s.deepseek && typeof s.deepseek === 'object' ? s.deepseek : {}
  let thinking = s.deepseek_thinking || s.thinking || nested.thinking || nested.type || ''
  const model = String(row?.default_model || '').toLowerCase()
  if (!thinking && model === 'deepseek-chat') thinking = 'disabled'
  if (!thinking && model === 'deepseek-reasoner') thinking = 'enabled'
  if (thinking !== 'enabled' && thinking !== 'disabled') thinking = 'disabled'

  let effort = s.deepseek_reasoning_effort || s.reasoning_effort || nested.reasoning_effort || nested.effort || 'high'
  effort = String(effort).toLowerCase() === 'max' ? 'max' : 'high'
  return { thinking, effort }
}

const isDeepSeekOfficialForm = computed(() => (
  form.value.service_type === 'text'
  && isDeepSeekOfficial(form.value.provider, form.value.base_url)
))

/** Preset provider options */
const availableProviderOptions = computed(() => {
  const st = form.value.service_type || 'text'
  const listByType = providerConfigs[st] || []
  const current = form.value.provider
  let result = listByType.map((p) => ({
    ...p,
    name: te('aiConfig.providers.' + p.id) ? t('aiConfig.providers.' + p.id) : p.name
  }))
  if (editingId.value && current && current !== CUSTOM_PROVIDER_SENTINEL && !listByType.some((p) => p.id === current)) {
    result = [{ id: current, name: `${current} ${t('aiConfig.currentTag')}`, models: [] }, ...result]
  }
  result.push({ id: CUSTOM_PROVIDER_SENTINEL, name: t('aiConfig.customProviderOption'), models: [] })
  return result
})

/** Preset models for current provider */
const availableModels = computed(() => {
  const st = form.value.service_type
  const provider = form.value.provider
  if (!st || !provider) return []
  const p = (providerConfigs[st] || []).find((x) => x.id === provider)
  return p?.models || []
})

/** Infer actual endpoints for preview */
const endpointPreviewInfo = computed(() => {
  const { provider, api_protocol, base_url, service_type, endpoint, query_endpoint } = form.value
  const p = String(provider || '').toLowerCase()
  const proto = api_protocol || providerProtocolMap[p] || ''
  const base = (base_url || '').replace(/\/$/, '')

  if (service_type === 'jimeng2_character_auth') {
    const root = base || t('aiConfig.endpointPreview.fillGatewayUrl')
    const hasReal = !root.startsWith('(')
    return {
      submit: `${root}/api/business/v1/assets`,
      query: hasReal ? `${root}/api/business/v1/assets/{assetId}` : null,
      isAuto: true,
      isJimeng2Auth: true,
    }
  }

  if (!base && !proto && !p) return null

  let submitPath = '', queryPath = ''

  if (service_type === 'text') {
    submitPath = '/chat/completions'
  } else if (service_type === 'tts') {
    if (p === 'minimax') {
      submitPath = '/t2a_v2?GroupId={group_id}'
    } else {
      submitPath = endpoint || '/tts'
    }
  } else if (service_type === 'image' || service_type === 'storyboard_image') {
    if (endpoint) {
      submitPath = endpoint
    } else if (proto === 'volcengine' || p === 'volcengine' || p === 'volces') {
      submitPath = '/images/generations'
    } else if (proto === 'dashscope' || p === 'dashscope' || p === 'qwen_image') {
      submitPath = '/api/v1/services/aigc/multimodal-generation/generation'
    } else if (proto === 'gemini' || p === 'gemini') {
      const m = form.value.default_model || t('aiConfig.endpointPreview.modelName')
      submitPath = `/v1beta/models/${m}:generateContent?key=***`
      return { submit: base + submitPath, query: null, isAuto: true, isGemini: true }
    } else if (proto === 'nano_banana' || p === 'nano_banana') {
      submitPath = '/v1/images/generations'
    } else if (proto === 'kling' || p === 'kling' || p === 'klingai') {
      submitPath = '/v1/images/generations'
    } else {
      submitPath = '/images/generations'
    }
  } else if (service_type === 'video') {
    if (endpoint) {
      submitPath = endpoint
    } else if (proto === 'volcengine_omni') {
      submitPath = '/contents/generations/tasks'
    } else if (proto === 'volcengine' || p === 'volces' || p === 'volcengine') {
      submitPath = '/videos/generations'
    } else if (proto === 'dashscope' || p === 'dashscope') {
      submitPath = '/api/v1/services/aigc/video-generation/video-synthesis'
    } else if (proto === 'gemini' || p === 'gemini') {
      const m = form.value.default_model || t('aiConfig.endpointPreview.modelName')
      return {
        submit: `${base}/v1beta/models/${m}:predictLongRunning  ${t('aiConfig.endpointPreview.geminiSubmitTip')}`,
        query: `${base}/v1beta/{operationName}  ${t('aiConfig.endpointPreview.geminiQueryTip')}`,
        isAuto: true,
        isGemini: true
      }
    } else if (proto === 'vidu' || p === 'vidu') {
      submitPath = '/ent/v2/img2video'
    } else if (proto === 'sora') {
      submitPath = '/v1/videos'
    } else if (proto === 'agnes' || p === 'agnes') {
      submitPath = '/videos'
    } else if (proto === 'minimax_h3' || p === 'minimax_h3') {
      submitPath = '/v2/video_generation'
    } else if (proto === 'xai') {
      submitPath = '/v1/videos/generations'
    } else if (proto === 'veo3') {
      submitPath = '/v1/video/create'
    } else if (proto === 'jimeng_ai_api' || p === 'jimeng_ai_api') {
      submitPath = endpoint || '/v1/videos/generations'
      return {
        submit: (base || t('aiConfig.endpointPreview.fillBaseUrl')) + submitPath + `  ${t('aiConfig.endpointPreview.jimengSessionTip')}`,
        query: null,
        isAuto: true,
      }
    } else if (proto === 'kling_omni' || p === 'ffir' || p === 'klingai') {
      const omniFfir = p === 'ffir' || /ffir\.cn/i.test(base)
      const omniKlingOfficial = p === 'klingai' || /api(-beijing|-singapore)?\.klingai\.com/i.test(base)
      submitPath = omniFfir ? '/kling/v1/videos/omni-video' : omniKlingOfficial ? '/v1/videos/omni-video' : '/kling/v1/videos/omni-video'
    } else if (proto === 'kling' || p === 'kling' || p === 'klingai') {
      submitPath = '/v1/videos/text2video (T2V) / /v1/videos/image2video (I2V)'
    } else if (p === 'minimax') {
      submitPath = '/video_generation'
    } else {
      submitPath = '/v1/video/create'
    }

    if (query_endpoint) {
      queryPath = query_endpoint
    } else if (proto === 'volcengine_omni') {
      queryPath = '/contents/generations/tasks/{taskId}'
    } else if (proto === 'volcengine' || p === 'volces' || p === 'volcengine') {
      queryPath = '/tasks/{taskId}/info'
    } else if (proto === 'dashscope' || p === 'dashscope') {
      queryPath = '/api/v1/tasks/{taskId}/info'
    } else if (proto === 'vidu' || p === 'vidu') {
      queryPath = '/ent/v2/tasks/{taskId}/creations'
    } else if (proto === 'sora') {
      queryPath = '/v1/videos/{taskId}'
    } else if (proto === 'agnes' || p === 'agnes') {
      const m = String(form.value.default_model || form.value.modelText || '').toLowerCase()
      queryPath = /agnes-video-2\.5/.test(m)
        ? '/agnesapi?video_id={videoId}&model_name={model}'
        : '/videos/{taskId}'
    } else if (proto === 'minimax_h3' || p === 'minimax_h3') {
      queryPath = '/v2/query/video_generation/{taskId}'
    } else if (proto === 'xai') {
      queryPath = '/v1/videos/{taskId}'
    } else if (proto === 'veo3') {
      queryPath = '/v1/video/query?id={taskId}'
    } else if (proto === 'kling_omni' || p === 'ffir' || p === 'klingai') {
      const omniFfirQ = p === 'ffir' || /ffir\.cn/i.test(base)
      const omniKlingOfficialQ = p === 'klingai' || /api(-beijing|-singapore)?\.klingai\.com/i.test(base)
      queryPath = omniFfirQ
        ? '/kling/v1/images/omni-image/{taskId}'
        : omniKlingOfficialQ
          ? '/v1/videos/omni-video/{taskId}'
          : '/kling/v1/images/omni-image/{taskId}'
    } else if (proto === 'kling' || p === 'kling' || p === 'klingai') {
      queryPath = `/v1/videos/{videoType}/{taskId}${t('aiConfig.endpointPreview.klingTaskTypeAuto')}`
    } else if (p === 'minimax') {
      queryPath = '/query/video_generation?task_id={taskId}'
    } else if (proto !== 'gemini' && p !== 'gemini') {
      queryPath = '/v1/video/query?id={taskId}'
    }
  }

  const submitUrl = base ? (base + submitPath) : (`${t('aiConfig.endpointPreview.noBaseUrl')}${submitPath}`)
  const queryUrl = queryPath ? (base ? base + queryPath : `${t('aiConfig.endpointPreview.noBaseUrl')}${queryPath}`) : null

  if (!submitPath) return null
  return {
    submit: submitUrl,
    query: queryUrl,
    isAuto: !endpoint
  }
})

function onProviderChange(providerId) {
  if (providerId === CUSTOM_PROVIDER_SENTINEL) {
    form.value.provider = ''
    form.value.api_protocol = ''
    form.value.base_url = ''
    form.value.modelText = ''
    form.value.default_model = ''
    return
  }
  const st = form.value.service_type || 'text'
  const p = (providerConfigs[st] || []).find((x) => x.id === providerId)
  if (!p) {
    form.value.base_url = ''
    form.value.modelText = ''
    form.value.default_model = ''
    return
  }
  form.value.base_url = getBaseUrlForProvider(providerId)
  form.value.modelText = (p.models || []).join('\n')
  form.value.default_model = (p.models && p.models[0]) || ''
  if (providerId === 'deepseek') {
    form.value.deepseek_thinking = 'disabled'
    form.value.deepseek_reasoning_effort = 'high'
  }
  // Auto-fill API protocol
  form.value.api_protocol = providerProtocolMap[providerId] || (st === 'text' ? '' : 'openai')
  if (st === 'video' && providerId === 'jimeng_ai_api') {
    form.value.endpoint = ''
    form.value.query_endpoint = ''
  }
  if (st === 'video' && providerId === 'cheap_seedance2') {
    form.value.api_protocol = 'sora'
    form.value.endpoint = '/v1/videos'
    form.value.query_endpoint = '/v1/videos/{taskId}'
    form.value.supports_universal_omni = true
  }
  if (st === 'video' && (providerId === 'ffir' || providerId === 'klingai')) {
    if (providerId === 'ffir') {
      form.value.endpoint = '/kling/v1/videos/omni-video'
      form.value.query_endpoint = '/kling/v1/images/omni-image/{taskId}'
    } else {
      form.value.endpoint = '/v1/videos/omni-video'
      form.value.query_endpoint = '/v1/videos/omni-video/{taskId}'
    }
  }
  if (st === 'video' && providerId === 'agnes') {
    form.value.api_protocol = 'agnes'
    form.value.endpoint = '/videos'
    form.value.query_endpoint = '/agnesapi'
  }
  if (st === 'video' && providerId === 'minimax_h3') {
    form.value.api_protocol = 'minimax_h3'
    form.value.endpoint = '/v2/video_generation'
    form.value.query_endpoint = '/v2/query/video_generation/{taskId}'
  }
  if (st === 'video' && providerId === 'minimax') {
    form.value.api_protocol = 'openai'
    form.value.endpoint = '/video_generation'
    form.value.query_endpoint = '/query/video_generation?task_id={taskId}'
  }
  if (!editingId.value) {
    const provName = te('aiConfig.providers.' + providerId) ? t('aiConfig.providers.' + providerId) : (p.name || providerId)
    form.value.name = provName + ' ' + serviceTypeLabel(st)
  }
}

/** One-key configs */
function getTongyiConfigs() {
  return [
    { service_type: 'text', name: `${t('aiConfig.providers.qwen')} ${t('aiConfig.types.text')}`, base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', provider: 'qwen', model: ['qwen-plus'] },
    { service_type: 'image', name: `${t('aiConfig.providers.dashscope')} ${t('aiConfig.types.image')}`, base_url: 'https://dashscope.aliyuncs.com', provider: 'dashscope', model: ['wan2.6-image'] },
    { service_type: 'image', name: `${t('aiConfig.providers.qwen_image')} ${t('aiConfig.types.image')}`, base_url: 'https://dashscope.aliyuncs.com', provider: 'qwen_image', model: ['qwen-image-3.0', 'qwen-image-3.0-pro'], is_default: false },
    { service_type: 'storyboard_image', name: `${t('aiConfig.providers.dashscope')} ${t('aiConfig.types.storyboard_image')}`, base_url: 'https://dashscope.aliyuncs.com', provider: 'dashscope', model: ['wan2.6-image'] },
    { service_type: 'video', name: `${t('aiConfig.providers.dashscope')} ${t('aiConfig.types.video')}`, base_url: 'https://dashscope.aliyuncs.com', provider: 'dashscope', model: ['wan2.2-kf2v-flash'] }
  ]
}

function getCheapSeedance2Configs() {
  return [
    {
      service_type: 'video',
      name: `${t('aiConfig.providers.cheap_seedance2')} ${t('aiConfig.types.video')}`,
      provider: 'cheap_seedance2',
      api_protocol: 'sora',
      base_url: 'https://workbench.ohmybb.xyz/api/openai',
      endpoint: '/v1/videos',
      query_endpoint: '/v1/videos/{taskId}',
      model: ['wb-seedance-2-fast', 'yk-seedance-mini', 'yk-seedance2.0-fast', 'yk-seedance2.0', 'minimax-h3-1080p-15s'],
      settings: JSON.stringify({ supports_universal_omni: true }),
    },
  ]
}

function getVolcengineConfigs() {
  return [
    { service_type: 'text', name: `${t('aiConfig.providers.volcengine')} ${t('aiConfig.types.text')}`, base_url: 'https://ark.cn-beijing.volces.com/api/v3', provider: 'volcengine', model: ['deepseek-v4-flash-ga-260731', 'doubao-seed-2-1-lite-260915'] },
    { service_type: 'image', name: `${t('aiConfig.providers.volcengine')} ${t('aiConfig.types.image')}`, base_url: 'https://ark.cn-beijing.volces.com/api/v3', provider: 'volcengine', model: ['doubao-seedream-5-0-flash-260915', 'doubao-seedream-5-0-pro-260628'] },
    { service_type: 'storyboard_image', name: `${t('aiConfig.providers.volcengine')} ${t('aiConfig.types.storyboard_image')}`, base_url: 'https://ark.cn-beijing.volces.com/api/v3', provider: 'volcengine', model: ['doubao-seedream-5-0-flash-260915', 'doubao-seedream-5-0-pro-260628'] },
    { service_type: 'video', name: `${t('aiConfig.providers.volcengine')} ${t('aiConfig.types.video')}`, base_url: 'https://ark.cn-beijing.volces.com/api/v3', provider: 'volces', model: ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128'] }
  ]
}

function getAgnesConfigs() {
  return [
    { service_type: 'text', name: `${t('aiConfig.providers.agnes')} ${t('aiConfig.types.text')}`, base_url: 'https://apihub.agnes-ai.com/v1', provider: 'agnes', api_protocol: 'openai', model: ['agnes-3.0-flash', 'agnes-2.5-flash'] },
    { service_type: 'image', name: `${t('aiConfig.providers.agnes')} ${t('aiConfig.types.image')}`, base_url: 'https://apihub.agnes-ai.com/v1', provider: 'agnes', api_protocol: 'openai', model: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash'] },
    { service_type: 'storyboard_image', name: `${t('aiConfig.providers.agnes')} ${t('aiConfig.types.storyboard_image')}`, base_url: 'https://apihub.agnes-ai.com/v1', provider: 'agnes', api_protocol: 'openai', model: ['agnes-image-2.5-flash', 'agnes-image-2.1-flash'] },
    { service_type: 'video', name: `${t('aiConfig.providers.agnes')} ${t('aiConfig.types.video')}`, base_url: 'https://apihub.agnes-ai.com/v1', provider: 'agnes', api_protocol: 'agnes', endpoint: '/videos', query_endpoint: '/agnesapi', model: ['agnes-video-2.5-flash', 'agnes-video-2.5', 'agnes-video-v2.0'] },
  ]
}

function serviceTypeLabel(val) {
  if (val && te('aiConfig.types.' + val)) {
    return t('aiConfig.types.' + val)
  }
  return val
}

function onRowEdit(row) {
  if (row.service_type === 'model_ark_asset') {
    activeTab.value = 'sd2_assets'
    ElMessage.info(t('aiConfig.msgEditInSd2Tab'))
    return
  }
  openEdit(row)
}

async function loadList() {
  loading.value = true
  try {
    list.value = await aiAPI.list()
  } catch (_) {
    list.value = []
  } finally {
    loading.value = false
  }
}

function parseModelText(text) {
  if (!text || !String(text).trim()) return []
  return String(text)
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function resetForm() {
  editingId.value = null
  presetModelPick.value = ''
  form.value = {
    service_type: 'text',
    name: '',
    provider: '',
    api_protocol: '',
    base_url: '',
    api_key: '',
    endpoint: '',
    query_endpoint: '',
    modelText: '',
    default_model: '',
    cost_per_call: 0,
    deepseek_thinking: 'disabled',
    deepseek_reasoning_effort: 'high',
    priority: 0,
    is_default: true,
    supports_universal_omni: false,
    voice_id: '',
    group_id: '',
    kling_access_key: '',
    kling_secret_key: '',
    kling_secret_key_base64: false,
  }
  editDialogRef.value?.resetFields?.()
}

function openAdd() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  const model = Array.isArray(row.model) ? row.model : (row.model ? [row.model] : [])
  const modelList = model.map((m) => String(m).trim()).filter(Boolean)
  const defaultInList = row.default_model && modelList.includes(row.default_model)
  // TTS / Kling Omni resolved from settings
  let voice_id = row.voice_id || ''
  let group_id = row.group_id || ''
  let kling_access_key = ''
  let kling_secret_key = ''
  let kling_secret_key_base64 = false
  let supports_universal_omni = false
  const deepseekSettings = resolveDeepSeekFormSettings(row)
  const parsedSettings = parseSettings(row.settings)
  let cost_per_call = Number(parsedSettings.cost_per_call) || 0
  if (row.settings) {
    try {
      const s = parsedSettings
      if (row.service_type === 'tts') {
        voice_id = s.voice_id || voice_id
        group_id = s.group_id || group_id
      }
      if (row.service_type === 'video' && row.api_protocol === 'kling_omni') {
        kling_access_key = s.kling_access_key || ''
        kling_secret_key = s.kling_secret_key || ''
        kling_secret_key_base64 = !!s.kling_secret_key_base64
      }
      if (row.service_type === 'video') {
        supports_universal_omni = !!(s.supports_universal_omni === true || s.supports_universal_omni === 1 || s.supports_universal_omni === 'true')
        if (String(row.provider || '').toLowerCase() === 'cheap_seedance2' && s.supports_universal_omni == null) {
          supports_universal_omni = true
        }
      }
    } catch (_) {}
  } else if (row.service_type === 'video' && String(row.provider || '').toLowerCase() === 'cheap_seedance2') {
    supports_universal_omni = true
  }
  form.value = {
    service_type: row.service_type,
    name: row.name,
    provider: row.provider,
    api_protocol: row.api_protocol || '',
    base_url: row.base_url,
    api_key: row.api_key,
    endpoint: row.endpoint || '',
    query_endpoint: row.query_endpoint || '',
    modelText: modelList.join('\n'),
    default_model: defaultInList ? row.default_model : (modelList[0] || ''),
    cost_per_call,
    deepseek_thinking: deepseekSettings.thinking,
    deepseek_reasoning_effort: deepseekSettings.effort,
    priority: row.priority ?? 0,
    is_default: !!row.is_default,
    supports_universal_omni,
    voice_id,
    group_id,
    kling_access_key,
    kling_secret_key,
    kling_secret_key_base64,
  }
  dialogVisible.value = true
}

async function submit() {
  await editDialogRef.value?.validate?.().catch(() => {})
  saving.value = true
  try {
    let modelList = parseModelText(form.value.modelText)
    if (form.value.service_type === 'jimeng2_character_auth' && modelList.length === 0) {
      modelList = ['-']
    }
    const defaultModel = form.value.default_model && modelList.includes(form.value.default_model)
      ? form.value.default_model
      : modelList[0] || null
    // Settings mapping for cost / TTS / Kling Omni / DeepSeek V4 / Video Omni multi-ref
    const prev = editingId.value ? list.value.find((r) => r.id === editingId.value) : null
    const baseS = parseSettings(prev?.settings)
    if (form.value.cost_per_call != null && Number(form.value.cost_per_call) > 0) {
      baseS.cost_per_call = Number(form.value.cost_per_call)
    } else {
      delete baseS.cost_per_call
    }
    if (form.value.service_type === 'tts') {
      if (form.value.voice_id) baseS.voice_id = form.value.voice_id
      else delete baseS.voice_id
      if (form.value.group_id) baseS.group_id = form.value.group_id
      else delete baseS.group_id
    } else if (form.value.service_type === 'video') {
      if (form.value.api_protocol === 'kling_omni') {
        if ((form.value.kling_access_key || '').trim()) baseS.kling_access_key = form.value.kling_access_key.trim()
        else delete baseS.kling_access_key
        if ((form.value.kling_secret_key || '').trim()) baseS.kling_secret_key = form.value.kling_secret_key.trim()
        else delete baseS.kling_secret_key
        if (form.value.kling_secret_key_base64) baseS.kling_secret_key_base64 = true
        else delete baseS.kling_secret_key_base64
      }
      if (form.value.supports_universal_omni) baseS.supports_universal_omni = true
      else delete baseS.supports_universal_omni
    } else if (isDeepSeekOfficialForm.value) {
      baseS.deepseek_thinking = form.value.deepseek_thinking === 'enabled' ? 'enabled' : 'disabled'
      if (baseS.deepseek_thinking === 'enabled') {
        baseS.deepseek_reasoning_effort = form.value.deepseek_reasoning_effort === 'max' ? 'max' : 'high'
      } else {
        delete baseS.deepseek_reasoning_effort
      }
    }
    const settings = Object.keys(baseS).length ? JSON.stringify(baseS) : null
    const payload = {
      service_type: form.value.service_type,
      name: form.value.name,
      provider: form.value.provider,
      api_protocol: form.value.api_protocol || '',
      base_url: form.value.base_url,
      api_key: form.value.api_key,
      endpoint: form.value.endpoint || '',
      query_endpoint: form.value.query_endpoint || '',
      model: modelList,
      default_model: defaultModel,
      priority: form.value.priority,
      is_default: form.value.is_default,
      ...(settings !== undefined ? { settings } : {}),
    }
    if (editingId.value) {
      await aiAPI.update(editingId.value, payload)
      ElMessage.success(t('common.saved'))
    } else {
      await aiAPI.create(payload)
      ElMessage.success(t('aiConfig.msgAddSuccess'))
    }
    dialogVisible.value = false
    await loadList()
  } catch (e) {
    // Errors handled by request interceptor
  } finally {
    saving.value = false
  }
}

function openBulkKey() {
  bulkKeyInput.value = ''
  bulkKeyVisible.value = true
}

async function submitBulkKey() {
  const key = bulkKeyInput.value.trim()
  if (!key) return
  bulkKeySaving.value = true
  try {
    const res = await aiAPI.bulkUpdateKey(key)
    ElMessage.success(res?.message || t('aiConfig.msgAllKeysUpdated'))
    bulkKeyVisible.value = false
    await loadList()
  } catch (_) {
  } finally {
    bulkKeySaving.value = false
  }
}

function onJimeng2AssetsDialogClosed() {
  jimeng2AssetsRows.value = []
  jimeng2AssetsNextCursor.value = null
  jimeng2AssetsHasMore.value = false
}

async function fetchJimeng2MaterialAssets(firstPage) {
  if (!form.value.base_url?.trim() || !form.value.api_key?.trim()) {
    ElMessage.warning(t('aiConfig.msgFillGatewayAndTokenFirst'))
    return
  }
  if (firstPage) {
    jimeng2AssetsRows.value = []
    jimeng2AssetsNextCursor.value = null
    jimeng2AssetsHasMore.value = false
    jimeng2AssetsDialogVisible.value = true
  }
  jimeng2AssetsLoading.value = true
  try {
    const data = await aiAPI.listJimeng2MaterialAssets({
      base_url: form.value.base_url.trim(),
      api_key: form.value.api_key,
      limit: 20,
      cursor: firstPage ? undefined : jimeng2AssetsNextCursor.value || undefined,
    })
    const items = Array.isArray(data?.items) ? data.items : []
    if (firstPage) {
      jimeng2AssetsRows.value = items
    } else {
      jimeng2AssetsRows.value = [...jimeng2AssetsRows.value, ...items]
    }
    jimeng2AssetsNextCursor.value = data?.next_cursor ?? null
    jimeng2AssetsHasMore.value = !!data?.has_more
  } catch (_) {
    // Error notification handled by request interceptor
  } finally {
    jimeng2AssetsLoading.value = false
  }
}

function openJimeng2MaterialAssetsDialog() {
  fetchJimeng2MaterialAssets(true)
}

function loadMoreJimeng2MaterialAssets() {
  if (!jimeng2AssetsHasMore.value || !jimeng2AssetsNextCursor.value) return
  fetchJimeng2MaterialAssets(false)
}

async function openTest(row) {
  if (row.service_type === 'jimeng2_character_auth') {
    ElMessage.info(t('aiConfig.msgJimeng2NoTestNeeded'))
    return
  }
  if (row.service_type === 'model_ark_asset') {
    ElMessage.info(t('aiConfig.msgSd2AssetUseRefresh'))
    return
  }
  testVisible.value = true
  testResult.value = null
  testError.value = ''
  testServiceType.value = row.service_type || 'text'
  try {
    await aiAPI.testConnection({
      base_url: row.base_url,
      api_key: row.api_key,
      model: Array.isArray(row.model) ? row.model[0] : row.model,
      provider: row.provider,
      endpoint: row.endpoint,
      service_type: row.service_type,
      settings: row.settings
    })
    testResult.value = true
  } catch (e) {
    testResult.value = false
    testError.value = e?.message || t('aiConfig.msgRequestFailed')
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(t('aiConfig.confirmDeleteConfig', { name: row.name }), t('aiConfig.deleteConfirmTitle'), {
    type: 'warning'
  })
  try {
    await aiAPI.delete(row.id)
    ElMessage.success(t('aiConfig.deleted'))
    await loadList()
  } catch (_) {}
}

function onSelectionChange(rows) {
  selectedRows.value = rows
}

async function onBatchDelete() {
  if (!selectedRows.value.length) return
  await ElMessageBox.confirm(
    t('aiConfig.confirmBatchDelete', { count: selectedRows.value.length }),
    t('aiConfig.batchDeleteTitle'),
    { type: 'warning', confirmButtonText: t('common.delete'), confirmButtonClass: 'el-button--danger' }
  )
  batchDeleting.value = true
  let success = 0, failed = 0
  for (const row of selectedRows.value) {
    try {
      await aiAPI.delete(row.id)
      success++
    } catch (_) { failed++ }
  }
  batchDeleting.value = false
  selectedRows.value = []
  const failedPart = failed ? t('aiConfig.batchDeleteFailedPart', { count: failed }) : ''
  ElMessage.success(t('aiConfig.batchDeleteSuccess', { success, failed: failedPart }))
  await loadList()
}

function openOneKeyTongyi() {
  oneKeyTongyiKey.value = ''
  oneKeyTongyiVisible.value = true
}

async function submitOneKeyTongyi() {
  const apiKey = oneKeyTongyiKey.value.trim()
  if (!apiKey) return
  oneKeyTongyiSaving.value = true
  try {
    for (const cfg of getTongyiConfigs()) {
      const models = cfg.model || []
      await aiAPI.create({
        service_type: cfg.service_type,
        name: cfg.name,
        provider: cfg.provider,
        base_url: cfg.base_url,
        api_key: apiKey,
        model: models,
        default_model: models[0] || null,
        priority: 10,
        is_default: cfg.is_default !== false
      })
    }
    ElMessage.success(t('aiConfig.oneKeyTongyiSuccess'))
    oneKeyTongyiVisible.value = false
    await loadList()
  } catch (_) {
    // Error notification handled by request interceptor
  } finally {
    oneKeyTongyiSaving.value = false
  }
}

function openOneKeyCheapSeedance2() {
  oneKeyCheapSeedance2Key.value = ''
  oneKeyCheapSeedance2Visible.value = true
}

async function submitOneKeyCheapSeedance2() {
  const apiKey = oneKeyCheapSeedance2Key.value.trim()
  if (!apiKey) return
  oneKeyCheapSeedance2Saving.value = true
  try {
    for (const cfg of getCheapSeedance2Configs()) {
      const models = cfg.model || []
      await aiAPI.create({
        service_type: cfg.service_type,
        name: cfg.name,
        provider: cfg.provider,
        api_protocol: cfg.api_protocol || '',
        base_url: cfg.base_url,
        api_key: apiKey,
        model: models,
        default_model: models[0] || null,
        endpoint: cfg.endpoint || '',
        query_endpoint: cfg.query_endpoint || '',
        priority: 10,
        is_default: true,
        settings: cfg.settings || undefined,
      })
    }
    ElMessage.success(t('aiConfig.oneKeyCheapSeedance2Success'))
    oneKeyCheapSeedance2Visible.value = false
    await loadList()
  } catch (_) {
    // Error notification handled by request interceptor
  } finally {
    oneKeyCheapSeedance2Saving.value = false
  }
}

function openOneKeyVolc() {
  oneKeyVolcKey.value = ''
  oneKeyVolcVisible.value = true
}

async function submitOneKeyVolc() {
  const apiKey = oneKeyVolcKey.value.trim()
  if (!apiKey) return
  oneKeyVolcSaving.value = true
  try {
    for (const cfg of getVolcengineConfigs()) {
      const models = cfg.model || []
      await aiAPI.create({
        service_type: cfg.service_type,
        name: cfg.name,
        provider: cfg.provider,
        base_url: cfg.base_url,
        api_key: apiKey,
        model: models,
        default_model: models[0] || null,
        priority: 10,
        is_default: true
      })
    }
    ElMessage.success(t('aiConfig.oneKeyVolcSuccess'))
    oneKeyVolcVisible.value = false
    await loadList()
  } catch (_) {
    // Error notification handled by request interceptor
  } finally {
    oneKeyVolcSaving.value = false
  }
}

function openOneKeyAgnes() {
  oneKeyAgnesKey.value = ''
  oneKeyAgnesVisible.value = true
}

async function submitOneKeyAgnes() {
  const apiKey = oneKeyAgnesKey.value.trim()
  if (!apiKey) return
  oneKeyAgnesSaving.value = true
  try {
    for (const cfg of getAgnesConfigs()) {
      const models = cfg.model || []
      await aiAPI.create({
        service_type: cfg.service_type,
        name: cfg.name,
        provider: cfg.provider,
        api_protocol: cfg.api_protocol || '',
        base_url: cfg.base_url,
        api_key: apiKey,
        model: models,
        default_model: models[0] || null,
        endpoint: cfg.endpoint || '',
        query_endpoint: cfg.query_endpoint || '',
        priority: 10,
        is_default: true
      })
    }
    ElMessage.success(t('aiConfig.oneKeyAgnesSuccess'))
    oneKeyAgnesVisible.value = false
    await loadList()
  } catch (_) {
    // Error notification handled by request interceptor
  } finally {
    oneKeyAgnesSaving.value = false
  }
}

async function exportConfigs() {
  try {
    const configs = await aiAPI.list()
    const exportData = configs.map(({ id, created_at, updated_at, ...rest }) => rest)
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-configs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(t('aiConfig.exportSuccess', { count: exportData.length }))
  } catch (e) {
    ElMessage.error(t('aiConfig.exportFailed'))
  }
}

function triggerImport() {
  importFileRef.value?.click()
}

async function importConfigs(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const configs = JSON.parse(text)
    if (!Array.isArray(configs)) {
      ElMessage.error(t('aiConfig.importInvalidFormat'))
      return
    }
    let success = 0
    let failed = 0
    for (const cfg of configs) {
      try {
        const models = Array.isArray(cfg.model) ? cfg.model : (cfg.model ? [cfg.model] : [])
        await aiAPI.create({
          service_type: cfg.service_type,
          name: cfg.name,
          provider: cfg.provider,
          api_protocol: cfg.api_protocol || null,
          base_url: cfg.base_url,
          api_key: cfg.api_key || '',
          endpoint: cfg.endpoint || null,
          query_endpoint: cfg.query_endpoint || null,
          model: models,
          default_model: cfg.default_model || null,
          priority: cfg.priority ?? 0,
          is_default: !!cfg.is_default,
          settings: cfg.settings || null
        })
        success++
      } catch (_) {
        failed++
      }
    }
    const failedPart = failed ? t('aiConfig.importFailedPart', { count: failed }) : ''
    ElMessage.success(t('aiConfig.importSuccess', { success, failed: failedPart }))
    await loadList()
  } catch (e) {
    ElMessage.error(t('aiConfig.importFailed', { error: e.message || t('aiConfig.fileParseError') }))
  } finally {
    event.target.value = ''
  }
}

async function loadVendorLock() {
  try {
    vendorLock.value = await aiAPI.getVendorLock()
  } catch (_) {
    vendorLock.value = { enabled: false, config_file: '' }
  }
}

onMounted(() => {
  loadVendorLock()
  loadList()
  loadGenerationSettings()
})
</script>

<style>
.provider-custom-option {
  border-top: 1px solid var(--el-border-color-light, #e4e7ed);
  margin-top: 4px;
  padding-top: 4px;
  color: var(--el-color-primary) !important;
  font-style: italic;
}
</style>

<style scoped>
.ai-config-content {
  padding: 0;
}
.config-tabs {
  margin-top: -4px;
}
.tab-content {
  padding-top: 16px;
  max-height: calc(100vh - 320px);
  overflow-y: auto;
}
.content-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}
.actions-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Transition animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

/* Type badge */
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.type-icon {
  font-size: 13px;
  flex-shrink: 0;
}

/* Text/chat - blue */
.type-text {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.25);
}
/* Text-to-image - green */
.type-image {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.25);
}
/* Storyboard image - purple */
.type-storyboard_image {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.25);
}
/* Video - orange */
.type-video {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
  border-color: rgba(249, 115, 22, 0.25);
}
.jimeng2-assets-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
}
.jimeng2-assets-tip {
  flex: 1;
  min-width: 200px;
  margin: 0;
  line-height: 1.5;
}

.type-jimeng2_character_auth {
  background: rgba(20, 184, 166, 0.14);
  color: #0d9488;
  border-color: rgba(20, 184, 166, 0.28);
}

.type-model_ark_asset {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  border-color: rgba(99, 102, 241, 0.25);
}

.no-default {
  color: #9ca3af;
  font-size: 13px;
}
.one-key-tip {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.one-key-not-recommended {
  margin-left: 4px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 4px;
  color: var(--el-color-warning, #e6a23c);
  background: var(--el-color-warning-light-9, #fdf6ec);
  border: 1px solid var(--el-color-warning-light-7, #f5dab1);
  vertical-align: middle;
}
.one-key-help {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.one-key-section {
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 8px;
  padding: 12px 14px;
}
.one-key-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin-bottom: 8px;
}
.one-key-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
}
.one-key-list li {
  margin-bottom: 2px;
}
.one-key-link {
  color: var(--el-color-primary);
  text-decoration: none;
}
.one-key-link:hover {
  text-decoration: underline;
}
.one-key-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-subtle);
  line-height: 1.5;
}
.one-key-note + .one-key-note {
  margin-top: 4px;
}
code {
  background: var(--el-fill-color, #f0f2f5);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
}
.cfg-tip-content code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
  font-family: monospace;
}
.default-tip {
  margin: 0 0 16px;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.5;
}
.vendor-lock-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.vendor-lock-bar .vendor-lock-tip {
  flex: 1;
  margin-bottom: 0;
}
.vendor-bulk-key-btn {
  white-space: nowrap;
  flex-shrink: 0;
  color: #fff !important;
}
.vendor-lock-tip {
  margin-bottom: 16px;
}
.model-row { margin-bottom: 4px; }
.deepseek-settings {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.field-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-subtle);
  line-height: 1.4;
}
.form-label-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.ph-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 0 6px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 4px;
}
.ph-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  margin-right: 6px;
  font-weight: 600;
  vertical-align: middle;
}
.ph-tag-img {
  background: #ecf5ff;
  color: var(--el-color-primary);
  border: 1px solid #b3d8ff;
}
.ph-tag-vid {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #b3e19d;
}
.cheap-seedance2-tip {
  margin: 0 0 16px;
}
.cheap-seedance2-link {
  color: var(--el-color-primary);
  text-decoration: underline;
  font-weight: 600;
}
.cheap-seedance2-link:hover {
  color: #337ecc;
}
.protocol-help .ph-body {
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
}
.protocol-help .ph-body pre {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  margin: 6px 0 2px;
  white-space: pre-wrap;
  word-break: break-all;
}
.protocol-help .ph-body code {
  background: #f0f2f5;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.tip-icon {
  font-size: 13px;
  color: var(--text-subtle);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
}
.tip-icon:hover {
  color: var(--el-color-primary);
}
.endpoint-preview-box {
  background: #f0f7ff;
  border: 1px solid #c6e0ff;
  border-radius: 6px;
  padding: 10px 14px;
  margin: -4px 0 14px;
  font-size: 12px;
}
.ep-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 8px;
  font-size: 12px;
}
.ep-auto-badge {
  background: #e6f1ff;
  color: var(--el-color-primary);
  border: 1px solid #b3d8ff;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 400;
}
.ep-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 5px;
  gap: 6px;
  line-height: 1.5;
}
.ep-row:last-of-type {
  margin-bottom: 0;
}
.ep-label {
  flex-shrink: 0;
  color: var(--text-secondary);
  min-width: 68px;
}
.ep-url {
  word-break: break-all;
  color: #303133;
  background: rgba(255,255,255,0.7);
  border: 1px solid #dce8fa;
  border-radius: 3px;
  padding: 1px 6px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 11.5px;
  line-height: 1.6;
}
.ep-tip {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--text-subtle);
  line-height: 1.4;
}
.ep-tip-warn {
  color: #e6a23c;
}
.ep-box-gemini {
  background: #fffbf0;
  border-color: #f5dfa0;
}
.ep-box-gemini .ep-preview-header {
  color: #b8860b;
}
.ep-badge-gemini {
  background: #fef6e0;
  color: #b8860b;
  border-color: #f0d080;
}
.generation-settings {
  max-width: 600px;
}
.content-language-title { margin-top: 28px; }
.content-language-select { width: min(240px, 48vw); min-width: 150px; }
.gs-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.gs-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}
.gs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.gs-label {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
}
.gs-unit {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.gs-tip-box {
  margin-top: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 13px;
}
.gs-tip-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.gs-tip-list {
  margin: 0 0 8px 16px;
  padding: 0;
  color: var(--text-secondary);
  line-height: 1.8;
}
.gs-tip-note {
  color: var(--text-subtle);
  font-size: 12px;
}
</style>
