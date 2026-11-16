<template>
    <el-dialog
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :title="title"
      width="520px"
      :close-on-click-modal="false"
      @closed="$emit('closed')"
    >
      <!-- Lock mode: only show api_key and default_model -->
      <template v-if="vendorLocked">
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
          <el-select v-model="form.service_type" :placeholder="$t('aiConfig.selectTypePlaceholder')" style="width: 100%" @change="$emit('service-type-change')">
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
            @change="$emit('provider-change', $event)"
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
        <el-alert
          v-if="form.provider === 'flow2api'"
          type="info"
          :closable="false"
          show-icon
          class="flow2api-tip"
        >
          <template #title>
            <span>{{ $t('aiConfig.flow2apiTip') }}</span>
          </template>
        </el-alert>
        <!-- Protocol: only shown for image/storyboard/video -->
        <el-form-item v-if="form.service_type !== 'text' && form.service_type !== 'tts' && form.service_type !== 'jimeng2_character_auth'">
          <template #label>
            <span class="form-label-tip">{{ $t('aiConfig.apiProtocol') }}
              <el-icon class="tip-icon tip-icon--help" @click="showProtocolHelp = true"><QuestionFilled /></el-icon>
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
            <el-button type="primary" plain :loading="jimeng2AssetsLoading" @click="$emit('open-jimeng-assets')">
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
              :model-value="presetModelPick"
              :placeholder="$t('aiConfig.appendPresetModel')"
              clearable
              filterable
              style="width: 220px; margin-bottom: 8px"
              @update:model-value="$emit('update:presetModelPick', $event)"
              @change="$emit('preset-model-select', $event)"
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
            <span class="form-label-tip">{{ $t('aiConfig.costPerCall') }}
              <el-tooltip :content="$t('aiConfig.costPerCallTooltip')" placement="top" popper-class="cfg-tip-popper">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input-number v-model="form.cost_per_call" :min="0" :step="0.01" :precision="3" />
        </el-form-item>
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
        <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="$emit('submit')">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>


</template>

<script setup>
import { ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  vendorLocked: { type: Boolean, default: false },
  form: { type: Object, required: true },
  formModelList: { type: Array, default: () => [] },
  rules: { type: Object, default: () => ({}) },
  isDeepSeekOfficialForm: { type: Boolean, default: false },
  availableProviderOptions: { type: Array, default: () => [] },
  availableModels: { type: Array, default: () => [] },
  endpointPreviewInfo: { type: Object, default: null },
  serviceTypeLabel: { type: Function, required: true },
  presetModelPick: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  jimeng2AssetsLoading: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'update:presetModelPick', 'closed', 'submit', 'service-type-change', 'provider-change', 'preset-model-select', 'open-jimeng-assets'])
const formRef = ref(null)
const showProtocolHelp = ref(false)
function validate() { return formRef.value?.validate?.() }
function resetFields() { formRef.value?.resetFields?.() }
defineExpose({ validate, resetFields })
</script>
