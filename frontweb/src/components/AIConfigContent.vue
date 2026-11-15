<template>
  <div class="ai-config-content">
    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane :label="$t('aiConfig.tabConfigs')" name="configs">
        <div class="tab-content">
          <!-- Normal mode actions -->
          <div v-if="!vendorLock.enabled" class="content-actions">
            <div class="actions-left">
              <el-button type="primary" @click="openAdd">
                <el-icon><Plus /></el-icon>
                {{ $t('aiConfig.addConfig') }}
              </el-button>
              <el-button plain @click="exportConfigs">
                <el-icon><Download /></el-icon>
                {{ $t('aiConfig.exportConfig') }}
              </el-button>
              <el-button plain @click="triggerImport">
                <el-icon><Upload /></el-icon>
                {{ $t('aiConfig.importConfig') }}
              </el-button>
              <input ref="importFileRef" type="file" accept=".json" style="display:none" @change="importConfigs" />
              <el-button type="success" plain @click="openOneKeyVolc">
                <el-icon><MagicStick /></el-icon>
                {{ $t('aiConfig.oneKeyVolc') }}
              </el-button>
              <el-button type="success" plain @click="openOneKeyAgnes">
                <el-icon><MagicStick /></el-icon>
                {{ $t('aiConfig.oneKeyAgnes') }}
              </el-button>
              <el-button type="info" plain @click="openOneKeyTongyi">
                <el-icon><MagicStick /></el-icon>
                {{ $t('aiConfig.oneKeyTongyi') }}
                <span class="one-key-not-recommended">{{ $t('aiConfig.notRecommended') }}</span>
              </el-button>
              <el-button type="warning" plain @click="openOneKeyCheapSeedance2">
                <el-icon><MagicStick /></el-icon>
                {{ $t('aiConfig.oneKeyCheapSeedance2') }}
              </el-button>
            </div>
            <div class="actions-right">
              <transition name="fade-slide">
                <el-button
                  v-if="selectedRows.length > 0"
                  type="danger"
                  :loading="batchDeleting"
                  @click="onBatchDelete"
                >
                  <el-icon><Delete /></el-icon>
                  {{ $t('aiConfig.deleteSelected', { count: selectedRows.length }) }}
                </el-button>
              </transition>
            </div>
          </div>
          <!-- Vendor lock mode tip bar -->
          <div v-else class="vendor-lock-bar">
            <el-alert
              type="info"
              :closable="false"
              class="vendor-lock-tip"
            >
              <template #title>
                <span v-html="$t('aiConfig.vendorLockTip')"></span>
              </template>
            </el-alert>
            <el-button type="primary" size="small" class="vendor-bulk-key-btn" @click="openBulkKey">
              <el-icon><Key /></el-icon>
              {{ $t('aiConfig.bulkKeyBtn') }}
            </el-button>
          </div>
          <p class="default-tip">{{ $t('aiConfig.defaultTip') }}</p>
          <el-table
            v-loading="loading"
            :data="list"
            stripe
            style="width: 100%"
            @selection-change="onSelectionChange"
          >
            <el-table-column v-if="!vendorLock.enabled" type="selection" width="46" />
            <el-table-column prop="name" :label="$t('common.name')" min-width="130" />
            <el-table-column prop="provider" :label="$t('aiConfig.provider')" width="96" />
            <el-table-column prop="base_url" label="Base URL" min-width="170" show-overflow-tooltip />
            <el-table-column prop="default_model" :label="$t('aiConfig.defaultModel')" min-width="130" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.default_model || (Array.isArray(row.model) && row.model[0]) || '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="service_type" :label="$t('aiConfig.serviceType')" width="148">
              <template #default="{ row }">
                <span :class="['type-badge', 'type-' + row.service_type]">
                  <el-icon class="type-icon">
                    <ChatDotRound v-if="row.service_type === 'text'" />
                    <Picture v-else-if="row.service_type === 'image'" />
                    <Film v-else-if="row.service_type === 'storyboard_image'" />
                    <VideoCamera v-else-if="row.service_type === 'video'" />
                    <Microphone v-else-if="row.service_type === 'tts'" />
                    <Key v-else-if="row.service_type === 'jimeng2_character_auth'" />
                    <Folder v-else-if="row.service_type === 'model_ark_asset'" />
                  </el-icon>
                  {{ serviceTypeLabel(row.service_type) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="is_default" :label="$t('aiConfig.isDefault')" width="60">
              <template #default="{ row }">
                <el-tag v-if="row.is_default" type="success" size="small">✓</el-tag>
                <span v-else class="no-default">—</span>
              </template>
            </el-table-column>
            <el-table-column :label="$t('aiConfig.actions')" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openTest(row)">{{ $t('aiConfig.testConnection') }}</el-button>
                <el-button link type="primary" size="small" @click="onRowEdit(row)">{{ vendorLock.enabled ? $t('aiConfig.modifyKey') : $t('common.edit') }}</el-button>
                <el-button v-if="!vendorLock.enabled" link type="danger" size="small" @click="onDelete(row)">{{ $t('common.delete') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
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
        <div class="tab-content generation-settings">
          <div class="gs-section-title">{{ $t('aiConfig.genConcurrencyTitle') }}</div>
          <p class="gs-desc">{{ $t('aiConfig.genConcurrencyDesc') }}</p>

          <div class="gs-row">
            <span class="gs-label">{{ $t('aiConfig.imageConcurrency') }}</span>
            <el-select
              v-model="genConcurrencyInput"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('aiConfig.concurrencyPlaceholder')"
              style="width: 180px"
              @change="onConcurrencyChange"
            >
              <el-option :label="$t('aiConfig.concurrencySerial')" :value="1" />
              <el-option label="2" :value="2" />
              <el-option :label="$t('aiConfig.concurrencyDefault')" :value="3" />
              <el-option label="5" :value="5" />
              <el-option label="8" :value="8" />
              <el-option label="10" :value="10" />
            </el-select>
            <span class="gs-unit">{{ $t('aiConfig.tasksAtSameTime') }}</span>
          </div>

          <div class="gs-row" style="margin-top: 10px">
            <span class="gs-label">{{ $t('aiConfig.videoConcurrency') }}</span>
            <el-select
              v-model="genVideoConcurrencyInput"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('aiConfig.concurrencyPlaceholder')"
              style="width: 180px"
              @change="onVideoConcurrencyChange"
            >
              <el-option :label="$t('aiConfig.concurrencySerial')" :value="1" />
              <el-option label="2" :value="2" />
              <el-option :label="$t('aiConfig.concurrencyDefault')" :value="3" />
              <el-option label="5" :value="5" />
              <el-option label="8" :value="8" />
              <el-option label="10" :value="10" />
            </el-select>
            <span class="gs-unit">{{ $t('aiConfig.tasksAtSameTime') }}</span>
          </div>

          <div style="margin-top: 14px">
            <el-button
              type="primary"
              size="small"
              :loading="genSettingSaving"
              @click="saveGenerationSettings"
            >{{ $t('common.save') }}</el-button>
          </div>
          <el-alert
            v-if="genSettingSaved"
            type="success"
            :title="$t('aiConfig.saved')"
            :closable="false"
            show-icon
            style="margin-top: 12px; width: fit-content"
          />
          <div class="gs-tip-box">
            <div class="gs-tip-title">{{ $t('aiConfig.scopeTitle') }}</div>
            <ul class="gs-tip-list">
              <li>{{ $t('aiConfig.imageConcurrencyScope') }}</li>
              <li>{{ $t('aiConfig.videoConcurrencyScope') }}</li>
            </ul>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('aiConfig.tabSd2Assets')" name="sd2_assets">
        <div class="tab-content">
          <Sd2AssetManagement :configs="list" @saved="loadList" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Add / Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="vendorLock.enabled ? $t('aiConfig.editKeyModelTitle') : (editingId ? $t('aiConfig.editConfig') : $t('aiConfig.addConfig'))"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <!-- Lock mode: only show api_key and default_model -->
      <template v-if="vendorLock.enabled">
        <el-descriptions :column="1" border style="margin-bottom: 16px">
          <el-descriptions-item :label="$t('common.name')">{{ form.name }}</el-descriptions-item>
          <el-descriptions-item :label="$t('aiConfig.serviceType')">{{ serviceTypeLabel(form.service_type) }}</el-descriptions-item>
          <el-descriptions-item :label="$t('aiConfig.provider')">{{ form.provider }}</el-descriptions-item>
        </el-descriptions>
        <el-form ref="formRef" :model="form" label-width="100px">
          <el-form-item prop="api_key" :rules="[{ required: true, message: $t('aiConfig.rules.apiKeyRequired'), trigger: 'blur' }]">
            <template #label><span class="form-label-tip">API Key</span></template>
            <el-input
              v-model="form.api_key"
              type="password"
              :placeholder="form.provider === 'jimeng_ai_api' ? $t('aiConfig.jimengSessionPlaceholder') : $t('aiConfig.apiKeyPlaceholder')"
              show-password
            />
          </el-form-item>
          <el-form-item>
            <template #label><span class="form-label-tip">{{ $t('aiConfig.defaultModel') }}</span></template>
            <el-select v-model="form.default_model" clearable style="width: 100%">
              <el-option v-for="m in formModelList" :key="m" :label="m" :value="m" />
            </el-select>
            <p class="field-tip">{{ $t('aiConfig.defaultModelTip') }}</p>
          </el-form-item>
          <el-form-item>
            <template #label>
              <span class="form-label-tip">{{ $t('aiConfig.setDefault') }}
                <el-tooltip placement="top" popper-class="cfg-tip-popper">
                  <template #content>
                    <div class="cfg-tip-content" v-html="$t('aiConfig.setDefaultTip')"></div>
                  </template>
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-switch v-model="form.is_default" />
          </el-form-item>
        </el-form>
      </template>

      <!-- Normal mode: full form -->
      <el-form v-else ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item prop="service_type">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.serviceType') }}
              <el-tooltip placement="top" :show-arrow="true" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.serviceTypeTooltip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select v-model="form.service_type" :placeholder="$t('aiConfig.selectTypePlaceholder')" style="width: 100%" @change="onServiceTypeChange">
            <el-option :label="$t('aiConfig.types.text')" value="text" />
            <el-option :label="$t('aiConfig.types.image')" value="image" />
            <el-option :label="$t('aiConfig.types.storyboard_image')" value="storyboard_image" />
            <el-option :label="$t('aiConfig.types.video')" value="video" />
            <el-option :label="$t('aiConfig.types.tts')" value="tts" />
            <el-option :label="$t('aiConfig.types.jimeng2_character_auth')" value="jimeng2_character_auth" />
          </el-select>
        </el-form-item>
        <el-form-item prop="provider">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.provider') }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.providerTooltip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="form.provider"
            :placeholder="$t('aiConfig.presetProviderPlaceholder')"
            clearable
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            @change="onProviderChange"
          >
            <el-option
              v-for="p in availableProviderOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
              :class="p.id === '__custom__' ? 'provider-custom-option' : ''"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.service_type === 'video'">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.omniMultiRef') }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.omniMultiRefTooltip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-switch
            v-model="form.supports_universal_omni"
            :active-text="$t('aiConfig.omniSupportActive')"
            :inactive-text="$t('aiConfig.omniSupportInactive')"
          />
        </el-form-item>
        <el-alert
          v-if="form.provider === 'cheap_seedance2'"
          type="success"
          :closable="false"
          show-icon
          class="cheap-seedance2-tip"
        >
          <template #title>
            <span>
              {{ $t('aiConfig.cheapSeedance2Tip') }}
              <a href="https://workbench.ohmybb.xyz/" target="_blank" rel="noopener noreferrer" class="cheap-seedance2-link">workbench.ohmybb.xyz</a>
            </span>
          </template>
        </el-alert>
        <!-- Protocol: only shown for image/storyboard/video -->
        <el-form-item v-if="form.service_type !== 'text' && form.service_type !== 'tts' && form.service_type !== 'jimeng2_character_auth'">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.apiProtocol') }}
              <el-icon class="tip-icon" style="cursor:pointer;color:#409eff" @click="showProtocolHelp = true"><QuestionFilled /></el-icon>
            </span>
          </template>
          <el-select v-model="form.api_protocol" style="width: 100%" :placeholder="$t('aiConfig.apiProtocolPlaceholder')" clearable>
            <el-option :label="$t('aiConfig.protocols.openai')" value="openai" />
            <el-option :label="$t('aiConfig.protocols.volcengine')" value="volcengine" />
            <el-option :label="$t('aiConfig.protocols.volcengine_omni')" value="volcengine_omni" />
            <el-option :label="$t('aiConfig.protocols.dashscope')" value="dashscope" />
            <el-option :label="$t('aiConfig.protocols.gemini')" value="gemini" />
            <el-option :label="$t('aiConfig.protocols.sora')" value="sora" />
            <el-option :label="$t('aiConfig.protocols.veo3')" value="veo3" />
            <el-option :label="$t('aiConfig.protocols.vidu')" value="vidu" />
            <el-option :label="$t('aiConfig.protocols.kling_omni')" value="kling_omni" />
            <el-option :label="$t('aiConfig.protocols.xai')" value="xai" />
            <el-option :label="$t('aiConfig.protocols.minimax_h3')" value="minimax_h3" />
            <el-option label="NanoBanana" value="nano_banana" />
          </el-select>
        </el-form-item>

        <!-- Protocol help dialog -->
        <el-dialog v-model="showProtocolHelp" :title="$t('aiConfig.protoHelp.title')" width="700px" top="5vh">
          <div class="protocol-help">
            <div class="ph-section-title">{{ $t('aiConfig.protoHelp.imgSection') }}</div>
            <el-collapse accordion>
              <el-collapse-item name="openai-img">
                <template #title><span class="ph-tag ph-tag-img">{{ $t('aiConfig.protoHelp.tagImg') }}</span> {{ $t('aiConfig.protoHelp.openaiImgTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.openaiImgScenario') }}<br>
                  <b>Endpoint：</b><code>POST /v1/images/generations</code><br>
                  <pre>{ "model": "dall-e-3", "prompt": "...", "n": 1, "size": "1024x1024" }</pre>
                </div>
              </el-collapse-item>
              <el-collapse-item name="volcengine-img">
                <template #title><span class="ph-tag ph-tag-img">{{ $t('aiConfig.protoHelp.tagImg') }}</span> {{ $t('aiConfig.protoHelp.volcengineImgTitle') }}</template>
                <div class="ph-body">
                  <b>Endpoint：</b><code>POST /api/v3/images/generations</code><br>
                  <b>Base URL：</b><code>https://ark.cn-beijing.volces.com/api/v3</code><br>
                  <pre>{ "model": "doubao-seedream-5-0-flash-260915", "prompt": "...", "size": "1024x1024" }</pre>
                </div>
              </el-collapse-item>
              <el-collapse-item name="dashscope-img">
                <template #title><span class="ph-tag ph-tag-img">{{ $t('aiConfig.protoHelp.tagImg') }}</span> {{ $t('aiConfig.protoHelp.dashscopeImgTitle') }}</template>
                <div class="ph-body">
                  <b>Base URL：</b><code>https://dashscope.aliyuncs.com</code><br>
                  <b>Endpoint：</b><code>POST /api/v1/services/aigc/text2image/image-synthesis</code>
                </div>
              </el-collapse-item>
              <el-collapse-item name="gemini-img">
                <template #title><span class="ph-tag ph-tag-img">{{ $t('aiConfig.protoHelp.tagImg') }}</span> {{ $t('aiConfig.protoHelp.geminiImgTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.auth') }}：</b>{{ $t('aiConfig.protoHelp.geminiAuth') }}<br>
                  <b>Endpoint：</b><code>POST /v1beta/models/{model}:generateContent</code>
                </div>
              </el-collapse-item>
            </el-collapse>

            <div class="ph-section-title" style="margin-top:16px">{{ $t('aiConfig.protoHelp.videoSection') }}</div>
            <el-collapse accordion>
              <el-collapse-item name="cheap-seedance2-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.cheapSeedance2VidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidScenario') }}<br>
                  <b>{{ $t('aiConfig.provider') }}：</b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidProvider') }}<br>
                  <b>Base URL：</b><code>https://workbench.ohmybb.xyz/api/openai</code><br>
                  <b>{{ $t('aiConfig.apiProtocol') }}：</b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidProto') }}<br>
                  <b>Endpoint：</b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidEndpoint') }}<br>
                  <b>{{ $t('aiConfig.defaultModel') }}：</b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidModels') }}<br>
                  <b>{{ $t('aiConfig.protoHelp.cheapSeedance2VidWebsite') }}</b><a href="https://workbench.ohmybb.xyz/" target="_blank" rel="noopener noreferrer">https://workbench.ohmybb.xyz/</a>
                </div>
              </el-collapse-item>
              <el-collapse-item name="openai-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.openaiVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.openaiVidScenario') }}<br>
                  <b>Endpoint：</b>Custom, e.g. <code>POST /v1/video/create</code><br>
                  <pre>{ "model": "sora-2-pro",
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image_url", "image_url": { "url": "https://..." }, "role": "reference_image" }
  ],
  "ratio": "9:16", "duration": 5, "watermark": false, "resolution": "720p" }</pre>
                </div>
              </el-collapse-item>
              <el-collapse-item name="sora-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.soraVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.soraVidScenario') }}<br>
                  <b>{{ $t('aiConfig.protoHelp.soraVidDefaultEndpoint') }}</b><br>
                  <b>{{ $t('aiConfig.protoHelp.soraVidReqFormat') }}</b><br>
                  <pre>model       = "sora-2"
prompt      = "..."
seconds     = "4" | "8" | "12"
size        = "720x1280" | "1280x720" | "1024x1792" | "1792x1024"
watermark   = "false"
private     = "false"
input_reference = (image file, optional)</pre>
                  <b>{{ $t('aiConfig.protoHelp.notice') }}：</b>{{ $t('aiConfig.protoHelp.soraVidNotice') }}
                </div>
              </el-collapse-item>
              <el-collapse-item name="veo3-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.veo3VidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.veo3VidScenario') }}<br>
                  <b>{{ $t('aiConfig.protoHelp.veo3VidDefaultEndpoint') }}</b><br>
                  <pre>{ "model": "veo3.1",
  "prompt": "...",
  "enhance_prompt": true,
  "images": ["data:image/jpeg;base64,..."]
}</pre>
                  <b>{{ $t('aiConfig.protoHelp.notice') }}：</b>{{ $t('aiConfig.protoHelp.veo3VidNotice') }}
                </div>
              </el-collapse-item>
              <el-collapse-item name="volcengine-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.volcengineVidTitle') }}</template>
                <div class="ph-body">
                  <b>Endpoint：</b><code>POST …/contents/generations/tasks</code><br>
                  <b>Base URL：</b><code>https://ark.cn-beijing.volces.com/api/v3</code><br>
                  <pre>{ "model": "doubao-seedance-2-0-fast-260128",
  "content": [{ "type": "text", "text": "..." }],
  "ratio": "9:16", "duration": 5,
  "watermark": false, "resolution": "720p" }</pre>
                </div>
              </el-collapse-item>
              <el-collapse-item name="volcengine-omni-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.volcengineOmniVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.volcengineOmniVidScenario') }}<br>
                  <b>Endpoint：</b><code>POST {base}/contents/generations/tasks</code>, <code>GET {base}/contents/generations/tasks/{taskId}</code><br>
                  <b>{{ $t('aiConfig.provider') }}：</b>{{ $t('aiConfig.protoHelp.volcengineOmniVidProvider') }}<br>
                  <pre>{ "model": "doubao-seedance-2-0-260128",
  "task_type": "i2v",
  "content": [
    { "type": "text", "text": "… @图片1 … @图片2 …" }, // i18n-scan-ignore: omni prompt token protocol
    { "type": "image_url", "image_url": { "url": "https://..." } },
    { "type": "image_url", "image_url": { "url": "https://..." }, "role": "reference_image" }
  ],
  "ratio": "9:16", "duration": 8, "watermark": false }</pre>
                  <b>{{ $t('aiConfig.protoHelp.desc') }}：</b>{{ $t('aiConfig.protoHelp.volcengineOmniVidDesc') }}
                </div>
              </el-collapse-item>
              <el-collapse-item name="dashscope-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.dashscopeVidTitle') }}</template>
                <div class="ph-body">
                  <b>Base URL：</b><code>https://dashscope.aliyuncs.com</code><br>
                  <b>Endpoint：</b><code>POST /api/v1/services/aigc/video-generation/video-synthesis</code><br>
                  <pre>{ "model": "wan2.2-kf2v-flash",
  "input": { "prompt": "...", "img_url": "https://..." },
  "parameters": { "size": "1280*720", "duration": 5 } }</pre>
                </div>
              </el-collapse-item>
              <el-collapse-item name="gemini-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.geminiVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.auth') }}：</b>{{ $t('aiConfig.protoHelp.geminiAuth') }}<br>
                  <b>Endpoint：</b><code>POST /v1beta/models/{model}:generateVideo</code>
                </div>
              </el-collapse-item>
              <el-collapse-item name="vidu-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.viduVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.scenario') }}：</b>{{ $t('aiConfig.protoHelp.viduVidScenario') }}<br>
                  <b>{{ $t('aiConfig.protoHelp.auth') }}：</b><code>Authorization: Token {api_key}</code><br>
                  <b>Endpoint：</b>{{ $t('aiConfig.protoHelp.viduVidDefaultEndpoint') }}<br>
                  <pre>{ "model": "viduq3-pro",
  "images": ["https://..."],
  "prompt": "...",
  "duration": 5,
  "resolution": "720p",
  "movement_amplitude": "auto",
  "audio": false,
  "watermark": false
}</pre>
                  <b>{{ $t('aiConfig.protoHelp.notice') }}：</b>{{ $t('aiConfig.protoHelp.viduVidNotice') }}
                </div>
              </el-collapse-item>
              <el-collapse-item name="jimeng-ai-api-vid">
                <template #title><span class="ph-tag ph-tag-vid">{{ $t('aiConfig.protoHelp.tagVid') }}</span> {{ $t('aiConfig.protoHelp.jimengAiApiVidTitle') }}</template>
                <div class="ph-body">
                  <b>{{ $t('aiConfig.protoHelp.desc') }}：</b>{{ $t('aiConfig.protoHelp.jimengAiApiVidDesc') }}<br>
                  <b>Base URL：</b>{{ $t('aiConfig.protoHelp.jimengAiApiVidBaseUrl') }}<br>
                  <b>API Key：</b>{{ $t('aiConfig.protoHelp.jimengAiApiVidApiKey') }}<br>
                  <b>Endpoint：</b>{{ $t('aiConfig.protoHelp.jimengAiApiVidDefaultPath') }}
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
          <template #footer>
            <el-button @click="showProtocolHelp = false">{{ $t('common.close') }}</el-button>
          </template>
        </el-dialog>
        <el-form-item prop="name">
          <template #label>
            <span class="form-label-tip">{{ $t('common.name') }}
              <el-tooltip :content="$t('aiConfig.nameTooltip')" placement="top" popper-class="cfg-tip-popper">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="form.name" :placeholder="$t('aiConfig.namePlaceholder')" />
        </el-form-item>
        <el-form-item prop="base_url">
          <template #label>
            <span class="form-label-tip">{{ form.service_type === 'jimeng2_character_auth' ? $t('aiConfig.gatewayUrl') : 'Base URL' }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content">
                    <template v-if="form.service_type === 'jimeng2_character_auth'">
                      <span v-html="$t('aiConfig.gatewayRootTip')"></span>
                    </template>
                    <template v-else>
                      <span v-html="$t('aiConfig.baseUrlTip')"></span>
                    </template>
                  </div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="form.base_url"
            :placeholder="form.service_type === 'jimeng2_character_auth' ? $t('aiConfig.gatewayUrlPlaceholder') : $t('aiConfig.baseUrlPlaceholderModifiable')"
          />
        </el-form-item>
        <el-form-item prop="api_key">
          <template #label>
            <span class="form-label-tip">{{ form.service_type === 'jimeng2_character_auth' ? 'Token' : 'API Key' }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content">
                    <template v-if="form.service_type === 'jimeng2_character_auth'">
                      <span v-html="$t('aiConfig.tokenTip')"></span>
                    </template>
                    <template v-else>
                      <span v-html="$t('aiConfig.apiKeyTip')"></span>
                    </template>
                  </div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            v-model="form.api_key"
            type="password"
            :placeholder="form.service_type === 'jimeng2_character_auth' ? $t('aiConfig.bearerTokenPlaceholder') : (form.provider === 'jimeng_ai_api' ? $t('aiConfig.jimengSessionPlaceholder') : $t('aiConfig.apiKeyShortPlaceholder'))"
            show-password
          />
        </el-form-item>
        <el-form-item v-if="form.service_type === 'jimeng2_character_auth'">
          <template #label><span class="form-label-tip">{{ $t('aiConfig.materialList') }}</span></template>
          <div class="jimeng2-assets-actions">
            <el-button type="primary" plain :loading="jimeng2AssetsLoading" @click="openJimeng2MaterialAssetsDialog">
              {{ $t('aiConfig.listMaterialsBtn') }}
            </el-button>
            <span class="field-tip jimeng2-assets-tip">
              {{ $t('aiConfig.callGateway') }}
              <code>GET /api/business/v1/assets</code>
              {{ $t('aiConfig.sameAs') }}
              <a href="https://83zi.com/sd2realperson.html" target="_blank" rel="noopener noreferrer">{{ $t('aiConfig.materialApiDoc') }}</a>
              {{ $t('aiConfig.consistentWith') }}
            </span>
          </div>
        </el-form-item>
        <el-alert
          v-if="form.service_type === 'jimeng2_character_auth'"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
          :title="$t('aiConfig.sd2AuthCardTitle')"
          :description="$t('aiConfig.sd2AuthCardDesc')"
        />
        <template v-if="form.service_type === 'video' && form.api_protocol === 'kling_omni'">
          <el-form-item>
            <template #label><span class="form-label-tip">AccessKey</span></template>
            <el-input
              v-model="form.kling_access_key"
              type="password"
              show-password
              :placeholder="$t('aiConfig.klingAkPlaceholder')"
              autocomplete="off"
            />
            <p class="field-tip">
              {{ $t('aiConfig.officialJwtRules') }}
              <a href="https://klingai.com/document-api/apiReference/commonInfo" target="_blank" rel="noopener noreferrer">commonInfo</a>
              （<a href="https://app.klingai.com/cn/dev/document-api/apiReference/commonInfo" target="_blank" rel="noopener noreferrer">{{ $t('aiConfig.chineseVersion') }}</a>）。
              <span v-html="$t('aiConfig.klingTokenGenDesc')"></span>
            </p>
          </el-form-item>
          <el-form-item>
            <template #label><span class="form-label-tip">SecretKey</span></template>
            <el-input
              v-model="form.kling_secret_key"
              type="password"
              show-password
              :placeholder="$t('aiConfig.klingSkPlaceholder')"
              autocomplete="off"
            />
            <el-checkbox v-model="form.kling_secret_key_base64" style="margin-top: 8px; display: block">
              {{ $t('aiConfig.klingSkBase64Label') }}
            </el-checkbox>
            <p class="field-tip">
              <span v-html="$t('aiConfig.klingDomainTip')"></span>
              <a href="https://klingai.com/document-api/apiReference/model/OmniVideo" target="_blank" rel="noopener noreferrer">OmniVideo</a>。
            </p>
          </el-form-item>
        </template>
        <!-- TTS specific fields -->
        <template v-if="form.service_type === 'tts'">
          <el-form-item>
            <template #label>
              <span class="form-label-tip">{{ $t('aiConfig.voiceId') }}
                <el-tooltip placement="top" popper-class="cfg-tip-popper">
                  <template #content>
                    <div class="cfg-tip-content" v-html="$t('aiConfig.voiceIdTooltip')"></div>
                  </template>
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-select
              v-model="form.voice_id"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('aiConfig.voiceIdPlaceholder')"
              style="width: 100%"
            >
              <el-option-group :label="$t('aiConfig.voiceOptions.minimaxFemale')">
                <el-option :label="$t('aiConfig.voiceOptions.femaleShaonv')" value="female-shaonv" />
                <el-option :label="$t('aiConfig.voiceOptions.femaleChengshu')" value="female-chengshu" />
                <el-option :label="$t('aiConfig.voiceOptions.femaleTianmei')" value="female-tianmei" />
                <el-option :label="$t('aiConfig.voiceOptions.audiobookFemale2')" value="audiobook_female_2" />
              </el-option-group>
              <el-option-group :label="$t('aiConfig.voiceOptions.minimaxMale')">
                <el-option :label="$t('aiConfig.voiceOptions.maleQingxin')" value="male-qingxin" />
                <el-option :label="$t('aiConfig.voiceOptions.maleZhicheng')" value="male-zhicheng" />
                <el-option :label="$t('aiConfig.voiceOptions.audiobookMale1')" value="audiobook_male_1" />
              </el-option-group>
            </el-select>
            <p class="field-tip">{{ $t('aiConfig.minimaxVoiceTip') }}</p>
          </el-form-item>
          <el-form-item>
            <template #label>
              <span class="form-label-tip">Group ID
                <el-tooltip placement="top" popper-class="cfg-tip-popper">
                  <template #content>
                    <div class="cfg-tip-content" v-html="$t('aiConfig.groupIdTooltip')"></div>
                  </template>
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-input v-model="form.group_id" :placeholder="$t('aiConfig.groupIdPlaceholder')" />
            <p class="field-tip">{{ $t('aiConfig.minimaxGroupIdTip') }}</p>
          </el-form-item>
        </template>

        <!-- Custom video endpoint config -->
        <template v-if="form.service_type !== 'text' && form.service_type !== 'tts' && form.service_type !== 'jimeng2_character_auth'">
          <el-form-item>
            <template #label>
              <span class="form-label-tip">{{ $t('aiConfig.submitEndpoint') }}
                <el-tooltip placement="top" popper-class="cfg-tip-popper">
                  <template #content>
                    <div class="cfg-tip-content" v-html="$t('aiConfig.submitEndpointTooltip')"></div>
                  </template>
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-input v-model="form.endpoint" :placeholder="form.service_type === 'video' ? $t('aiConfig.submitEndpointPlaceholderVideo') : $t('aiConfig.submitEndpointPlaceholderOther')" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <span class="form-label-tip">{{ $t('aiConfig.queryEndpoint') }}
                <el-tooltip placement="top" popper-class="cfg-tip-popper">
                  <template #content>
                    <div class="cfg-tip-content" v-html="$t('aiConfig.queryEndpointTooltip')"></div>
                  </template>
                  <el-icon class="tip-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </span>
            </template>
            <el-input v-model="form.query_endpoint" :placeholder="$t('aiConfig.queryEndpointPlaceholder')" />
          </el-form-item>
        </template>

        <!-- Endpoint preview -->
        <div v-if="endpointPreviewInfo" class="endpoint-preview-box" :class="{ 'ep-box-gemini': endpointPreviewInfo.isGemini }">
          <div class="ep-preview-header">
            <span>{{ $t('aiConfig.previewEndpointTitle') }}</span>
            <span v-if="endpointPreviewInfo.isGemini" class="ep-auto-badge ep-badge-gemini">{{ $t('aiConfig.previewGeminiBadge') }}</span>
            <span v-else-if="endpointPreviewInfo.isJimeng2Auth" class="ep-auto-badge">{{ $t('aiConfig.previewJimeng2AuthBadge') }}</span>
            <span v-else-if="endpointPreviewInfo.isAuto && form.service_type !== 'text'" class="ep-auto-badge">{{ $t('aiConfig.previewAutoBadge') }}</span>
          </div>
          <div class="ep-row">
            <span class="ep-label">{{ $t('aiConfig.submitUrlLabel') }}</span>
            <code class="ep-url">{{ endpointPreviewInfo.submit }}</code>
          </div>
          <div v-if="endpointPreviewInfo.query" class="ep-row">
            <span class="ep-label">{{ $t('aiConfig.queryUrlLabel') }}</span>
            <code class="ep-url">{{ endpointPreviewInfo.query }}</code>
          </div>
          <p v-if="endpointPreviewInfo.isGemini" class="ep-tip ep-tip-warn">
            {{ $t('aiConfig.geminiEndpointWarn') }}
          </p>
          <p v-else-if="endpointPreviewInfo.isJimeng2Auth" class="ep-tip">{{ $t('aiConfig.jimeng2EndpointTip') }}</p>
          <p v-else class="ep-tip">{{ $t('aiConfig.autoEndpointTip') }}</p>
        </div>

        <template v-if="form.service_type !== 'jimeng2_character_auth'">
        <el-form-item>
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.modelList') }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.modelListTooltip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <div class="model-row">
            <el-select
              v-model="presetModelPick"
              :placeholder="$t('aiConfig.appendPresetModel')"
              clearable
              filterable
              style="width: 220px; margin-bottom: 8px"
              @change="onPresetModelSelect"
            >
              <el-option v-for="m in availableModels" :key="m" :label="m" :value="m" />
            </el-select>
          </div>
          <el-input v-model="form.modelText" type="textarea" :rows="2" :placeholder="$t('aiConfig.modelTextPlaceholder')" />
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.defaultModel') }}
              <el-tooltip :content="$t('aiConfig.defaultModelTooltip')" placement="top" popper-class="cfg-tip-popper">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-select
            v-model="form.default_model"
            :placeholder="formModelList.length ? $t('aiConfig.defaultModelPlaceholder') : $t('aiConfig.defaultModelEmptyPlaceholder')"
            clearable
            style="width: 100%"
          >
            <el-option v-for="m in formModelList" :key="m" :label="m" :value="m" />
          </el-select>
          <p class="field-tip">{{ $t('aiConfig.defaultModelFieldTip') }}</p>
        </el-form-item>
        <el-form-item v-if="isDeepSeekOfficialForm">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.thinkingMode') }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.thinkingModeTooltip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <div class="deepseek-settings">
            <el-radio-group v-model="form.deepseek_thinking">
              <el-radio-button label="disabled">{{ $t('aiConfig.deepseekThinkingDisabled') }}</el-radio-button>
              <el-radio-button label="enabled">{{ $t('aiConfig.deepseekThinkingEnabled') }}</el-radio-button>
            </el-radio-group>
            <el-select
              v-if="form.deepseek_thinking === 'enabled'"
              v-model="form.deepseek_reasoning_effort"
              style="width: 140px"
            >
              <el-option label="high" value="high" />
              <el-option label="max" value="max" />
            </el-select>
          </div>
          <p class="field-tip">{{ $t('aiConfig.deepseekModelTip') }}</p>
        </el-form-item>
        </template>
        <el-form-item>
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.priority') }}
              <el-tooltip :content="$t('aiConfig.priorityTooltip')" placement="top" popper-class="cfg-tip-popper">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number v-model="form.priority" :min="0" :max="999" />
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.setDefault') }}
              <el-tooltip placement="top" popper-class="cfg-tip-popper">
                <template #content>
                  <div class="cfg-tip-content" v-html="$t('aiConfig.setDefaultTip')"></div>
                </template>
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-switch v-model="form.is_default" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- Quick setup Cheap Seedance2 -->
    <el-dialog
      v-model="oneKeyCheapSeedance2Visible"
      :title="$t('aiConfig.oneKeySeedanceTitle')"
      width="520px"
      :close-on-click-modal="false"
      @closed="oneKeyCheapSeedance2Key = ''"
    >
      <div class="one-key-help">
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
          <ul class="one-key-list">
            <li>{{ $t('aiConfig.oneKeySeedanceDesc') }}</li>
          </ul>
          <p class="one-key-note">{{ $t('aiConfig.oneKeySeedanceNote') }}</p>
        </div>
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyHowToApply') }}</div>
          <ol class="one-key-list">
            <li>{{ $t('aiConfig.oneKeySeedanceStep1') }}<a href="https://workbench.ohmybb.xyz/" target="_blank" rel="noopener noreferrer" class="one-key-link">workbench.ohmybb.xyz</a></li>
            <li><span v-html="$t('aiConfig.oneKeySeedanceStep2')"></span></li>
            <li>{{ $t('aiConfig.oneKeySeedanceStep3') }}</li>
          </ol>
          <p class="one-key-note">{{ $t('aiConfig.oneKeySeedanceDoc') }}<a href="https://workbench.ohmybb.xyz/docs/api" target="_blank" rel="noopener noreferrer" class="one-key-link">workbench.ohmybb.xyz/docs/api</a></p>
        </div>
      </div>
      <el-form label-width="0" style="margin-top: 8px">
        <el-form-item>
          <el-input
            v-model="oneKeyCheapSeedance2Key"
            type="password"
            :placeholder="$t('aiConfig.oneKeySeedancePlaceholder')"
            show-password-on="click"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oneKeyCheapSeedance2Visible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="success" :loading="oneKeyCheapSeedance2Saving" :disabled="!oneKeyCheapSeedance2Key.trim()" @click="submitOneKeyCheapSeedance2">
          {{ $t('aiConfig.oneKeyConfirmBtn') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Quick setup Tongyi -->
    <el-dialog
      v-model="oneKeyTongyiVisible"
      :title="$t('aiConfig.oneKeyTongyiTitle')"
      width="520px"
      :close-on-click-modal="false"
      @closed="oneKeyTongyiKey = ''"
    >
      <div class="one-key-help">
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
          <ul class="one-key-list">
            <li v-html="$t('aiConfig.oneKeyTongyiItem1')"></li>
            <li v-html="$t('aiConfig.oneKeyTongyiItem2')"></li>
            <li v-html="$t('aiConfig.oneKeyTongyiItem3')"></li>
            <li v-html="$t('aiConfig.oneKeyTongyiItem4')"></li>
            <li v-html="$t('aiConfig.oneKeyTongyiItem5')"></li>
          </ul>
        </div>
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyHowToApply') }}</div>
          <ol class="one-key-list">
            <li>{{ $t('aiConfig.oneKeyTongyiStep1') }}<a href="https://bailian.console.aliyun.com/" target="_blank" class="one-key-link">bailian.console.aliyun.com</a></li>
            <li>{{ $t('aiConfig.oneKeyTongyiStep2') }}</li>
            <li>{{ $t('aiConfig.oneKeyTongyiStep3') }}</li>
            <li><span v-html="$t('aiConfig.oneKeyTongyiStep4')"></span></li>
          </ol>
          <p class="one-key-note">{{ $t('aiConfig.oneKeyTongyiNote') }}</p>
        </div>
      </div>
      <el-form label-width="0" style="margin-top: 8px">
        <el-form-item>
          <el-input
            v-model="oneKeyTongyiKey"
            type="password"
            :placeholder="$t('aiConfig.oneKeyTongyiPlaceholder')"
            show-password-on="click"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oneKeyTongyiVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="success" :loading="oneKeyTongyiSaving" :disabled="!oneKeyTongyiKey.trim()" @click="submitOneKeyTongyi">
          {{ $t('aiConfig.oneKeyConfirmBtn') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Quick setup Volcengine -->
    <el-dialog
      v-model="oneKeyVolcVisible"
      :title="$t('aiConfig.oneKeyVolcTitle')"
      width="520px"
      :close-on-click-modal="false"
      @closed="oneKeyVolcKey = ''"
    >
      <div class="one-key-help">
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
          <ul class="one-key-list">
            <li v-html="$t('aiConfig.oneKeyVolcItem1')"></li>
            <li v-html="$t('aiConfig.oneKeyVolcItem2')"></li>
            <li v-html="$t('aiConfig.oneKeyVolcItem3')"></li>
            <li v-html="$t('aiConfig.oneKeyVolcItem4')"></li>
          </ul>
        </div>
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyHowToApply') }}</div>
          <ol class="one-key-list">
            <li>{{ $t('aiConfig.oneKeyVolcStep1') }}<a href="https://console.volcengine.com/ark" target="_blank" class="one-key-link">console.volcengine.com/ark</a></li>
            <li>{{ $t('aiConfig.oneKeyVolcStep2') }}</li>
            <li>{{ $t('aiConfig.oneKeyVolcStep3') }}</li>
            <li>{{ $t('aiConfig.oneKeyVolcStep4') }}</li>
          </ol>
          <p class="one-key-note">{{ $t('aiConfig.oneKeyVolcNote') }}</p>
          <p class="one-key-note">{{ $t('aiConfig.oneKeyVolcWarning') }}</p>
        </div>
      </div>
      <el-form label-width="0" style="margin-top: 8px">
        <el-form-item>
          <el-input
            v-model="oneKeyVolcKey"
            type="password"
            :placeholder="$t('aiConfig.oneKeyVolcPlaceholder')"
            show-password-on="click"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oneKeyVolcVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="success" :loading="oneKeyVolcSaving" :disabled="!oneKeyVolcKey.trim()" @click="submitOneKeyVolc">
          {{ $t('aiConfig.oneKeyConfirmBtn') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Quick setup Agnes -->
    <el-dialog
      v-model="oneKeyAgnesVisible"
      :title="$t('aiConfig.oneKeyAgnesTitle')"
      width="520px"
      :close-on-click-modal="false"
      @closed="oneKeyAgnesKey = ''"
    >
      <div class="one-key-help">
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
          <ul class="one-key-list">
            <li v-html="$t('aiConfig.oneKeyAgnesItem1')"></li>
            <li v-html="$t('aiConfig.oneKeyAgnesItem2')"></li>
            <li v-html="$t('aiConfig.oneKeyAgnesItem3')"></li>
            <li v-html="$t('aiConfig.oneKeyAgnesItem4')"></li>
          </ul>
        </div>
        <div class="one-key-section">
          <div class="one-key-section-title">{{ $t('aiConfig.oneKeyHowToApply') }}</div>
          <ol class="one-key-list">
            <li>{{ $t('aiConfig.oneKeyAgnesStep1') }}<a href="https://platform.agnes-ai.com/settings/apiKeys" target="_blank" class="one-key-link">platform.agnes-ai.com/settings/apiKeys</a></li>
            <li>{{ $t('aiConfig.oneKeyAgnesStep2') }}</li>
            <li>{{ $t('aiConfig.oneKeyAgnesStep3') }}</li>
            <li>{{ $t('aiConfig.oneKeyAgnesStep4') }}</li>
          </ol>
          <p class="one-key-note"><span v-html="$t('aiConfig.oneKeyAgnesNote')"></span></p>
        </div>
      </div>
      <el-form label-width="0" style="margin-top: 8px">
        <el-form-item>
          <el-input
            v-model="oneKeyAgnesKey"
            type="password"
            :placeholder="$t('aiConfig.oneKeyAgnesPlaceholder')"
            show-password-on="click"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oneKeyAgnesVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="success" :loading="oneKeyAgnesSaving" :disabled="!oneKeyAgnesKey.trim()" @click="submitOneKeyAgnes">
          {{ $t('aiConfig.oneKeyConfirmBtn') }}
        </el-button>
      </template>
    </el-dialog>

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
import { Plus, MagicStick, QuestionFilled, Download, Upload, Delete, ChatDotRound, Picture, Film, VideoCamera, Key, Microphone, Folder } from '@element-plus/icons-vue'
import { aiAPI } from '@/api/ai'
import { generationSettingsAPI } from '@/api/prompts'
import PromptEditor from '@/components/PromptEditor.vue'
import SceneModelMap from '@/components/SceneModelMap.vue'
import Sd2AssetManagement from '@/components/Sd2AssetManagement.vue'

const { t, te } = useI18n()

const activeTab = ref('configs')
const importFileRef = ref(null)

// ---- Generation settings ----
const genConcurrencyInput = ref(3)
const genVideoConcurrencyInput = ref(3)
const genSettingSaving = ref(false)
const genSettingSaved = ref(false)

async function loadGenerationSettings() {
  try {
    const res = await generationSettingsAPI.get()
    genConcurrencyInput.value = res?.concurrency ?? 3
    genVideoConcurrencyInput.value = res?.video_concurrency ?? 3
  } catch (_) {}
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
const formRef = ref(null)
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
  formRef.value?.resetFields?.()
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
  if (row.settings) {
    try {
      const s = JSON.parse(row.settings)
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
  await formRef.value?.validate?.().catch(() => {})
  saving.value = true
  try {
    let modelList = parseModelText(form.value.modelText)
    if (form.value.service_type === 'jimeng2_character_auth' && modelList.length === 0) {
      modelList = ['-']
    }
    const defaultModel = form.value.default_model && modelList.includes(form.value.default_model)
      ? form.value.default_model
      : modelList[0] || null
    // Settings mapping for TTS / Kling Omni / DeepSeek V4 / Video Omni multi-ref
    let settings = undefined
    if (form.value.service_type === 'tts') {
      const s = {}
      if (form.value.voice_id) s.voice_id = form.value.voice_id
      if (form.value.group_id) s.group_id = form.value.group_id
      settings = Object.keys(s).length ? JSON.stringify(s) : null
    } else if (form.value.service_type === 'video') {
      let baseS = {}
      if (editingId.value) {
        const prev = list.value.find((r) => r.id === editingId.value)
        if (prev?.settings) {
          try {
            baseS = JSON.parse(prev.settings)
          } catch (_) {}
        }
      }
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
      settings = Object.keys(baseS).length ? JSON.stringify(baseS) : null
    } else if (isDeepSeekOfficialForm.value) {
      const prev = editingId.value ? list.value.find((r) => r.id === editingId.value) : null
      const baseS = parseSettings(prev?.settings)
      baseS.deepseek_thinking = form.value.deepseek_thinking === 'enabled' ? 'enabled' : 'disabled'
      if (baseS.deepseek_thinking === 'enabled') {
        baseS.deepseek_reasoning_effort = form.value.deepseek_reasoning_effort === 'max' ? 'max' : 'high'
      } else {
        delete baseS.deepseek_reasoning_effort
      }
      settings = Object.keys(baseS).length ? JSON.stringify(baseS) : null
    }
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
  color: var(--el-color-primary, #409eff) !important;
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
  color: #606266;
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
  color: var(--el-text-color-regular, #606266);
  line-height: 1.8;
}
.one-key-list li {
  margin-bottom: 2px;
}
.one-key-link {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
}
.one-key-link:hover {
  text-decoration: underline;
}
.one-key-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
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
  color: #909399;
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
  color: #606266;
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
  color: #409eff;
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
  color: #409eff;
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
  color: #909399;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
}
.tip-icon:hover {
  color: #409eff;
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
  color: #409eff;
  margin-bottom: 8px;
  font-size: 12px;
}
.ep-auto-badge {
  background: #e6f1ff;
  color: #409eff;
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
  color: #606266;
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
  color: #909399;
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
.gs-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.gs-desc {
  font-size: 13px;
  color: #606266;
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
  color: #606266;
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
  color: #606266;
  line-height: 1.8;
}
.gs-tip-note {
  color: #909399;
  font-size: 12px;
}
</style>
