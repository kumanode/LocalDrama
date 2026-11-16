<template>
  <div v-if="showActions" class="provider-presets">
    <div class="actions-left">
      <el-button type="primary" @click="$emit('add')">
        <el-icon><Plus /></el-icon>
        {{ $t('aiConfig.addConfig') }}
      </el-button>
      <el-button plain @click="$emit('export')">
        <el-icon><Download /></el-icon>
        {{ $t('aiConfig.exportConfig') }}
      </el-button>
      <el-button plain @click="$emit('import')">
        <el-icon><Upload /></el-icon>
        {{ $t('aiConfig.importConfig') }}
      </el-button>
      <el-button type="success" plain @click="$emit('preset', 'volc')">
        <el-icon><MagicStick /></el-icon>
        {{ $t('aiConfig.oneKeyVolc') }}
      </el-button>
      <el-button type="success" plain @click="$emit('preset', 'agnes')">
        <el-icon><MagicStick /></el-icon>
        {{ $t('aiConfig.oneKeyAgnes') }}
      </el-button>
      <el-button type="info" plain @click="$emit('preset', 'tongyi')">
        <el-icon><MagicStick /></el-icon>
        {{ $t('aiConfig.oneKeyTongyi') }}
        <span class="one-key-not-recommended">{{ $t('aiConfig.notRecommended') }}</span>
      </el-button>
      <el-button type="warning" plain @click="$emit('preset', 'cheapSeedance2')">
        <el-icon><MagicStick /></el-icon>
        {{ $t('aiConfig.oneKeyCheapSeedance2') }}
      </el-button>
    </div>
    <div class="actions-right">
      <transition name="fade-slide">
        <el-button
          v-if="selectedCount > 0"
          type="danger"
          :loading="batchDeleting"
          @click="$emit('delete-selected')"
        >
          <el-icon><Delete /></el-icon>
          {{ $t('aiConfig.deleteSelected', { count: selectedCount }) }}
        </el-button>
      </transition>
    </div>
  </div>
  <el-dialog
    :model-value="cheapSeedance2Visible"
    :title="$t('aiConfig.oneKeySeedanceTitle')"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:cheapSeedance2Visible', $event)"
    @closed="$emit('update:cheapSeedance2Key', '')"
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
    <el-form label-width="0" class="preset-key-form">
      <el-form-item>
        <el-input :model-value="cheapSeedance2Key" type="password" :placeholder="$t('aiConfig.oneKeySeedancePlaceholder')" show-password-on="click" clearable @update:model-value="$emit('update:cheapSeedance2Key', $event)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:cheapSeedance2Visible', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="success" :loading="cheapSeedance2Saving" :disabled="!cheapSeedance2Key.trim()" @click="$emit('submit-cheap-seedance2')">
        {{ $t('aiConfig.oneKeyConfirmBtn') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    :model-value="tongyiVisible"
    :title="$t('aiConfig.oneKeyTongyiTitle')"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:tongyiVisible', $event)"
    @closed="$emit('update:tongyiKey', '')"
  >
    <div class="one-key-help">
      <div class="one-key-section">
        <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
        <ul class="one-key-list">
          <li v-for="index in 5" :key="index" v-html="$t(`aiConfig.oneKeyTongyiItem${index}`)"></li>
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
    <el-form label-width="0" class="preset-key-form">
      <el-form-item>
        <el-input :model-value="tongyiKey" type="password" :placeholder="$t('aiConfig.oneKeyTongyiPlaceholder')" show-password-on="click" clearable @update:model-value="$emit('update:tongyiKey', $event)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:tongyiVisible', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="success" :loading="tongyiSaving" :disabled="!tongyiKey.trim()" @click="$emit('submit-tongyi')">
        {{ $t('aiConfig.oneKeyConfirmBtn') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    :model-value="volcVisible"
    :title="$t('aiConfig.oneKeyVolcTitle')"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:volcVisible', $event)"
    @closed="$emit('update:volcKey', '')"
  >
    <div class="one-key-help">
      <div class="one-key-section">
        <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
        <ul class="one-key-list">
          <li v-for="index in 4" :key="index" v-html="$t(`aiConfig.oneKeyVolcItem${index}`)"></li>
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
    <el-form label-width="0" class="preset-key-form">
      <el-form-item>
        <el-input :model-value="volcKey" type="password" :placeholder="$t('aiConfig.oneKeyVolcPlaceholder')" show-password-on="click" clearable @update:model-value="$emit('update:volcKey', $event)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:volcVisible', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="success" :loading="volcSaving" :disabled="!volcKey.trim()" @click="$emit('submit-volc')">
        {{ $t('aiConfig.oneKeyConfirmBtn') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    :model-value="agnesVisible"
    :title="$t('aiConfig.oneKeyAgnesTitle')"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:agnesVisible', $event)"
    @closed="$emit('update:agnesKey', '')"
  >
    <div class="one-key-help">
      <div class="one-key-section">
        <div class="one-key-section-title">{{ $t('aiConfig.oneKeyAutoCreateList') }}</div>
        <ul class="one-key-list">
          <li v-for="index in 4" :key="index" v-html="$t(`aiConfig.oneKeyAgnesItem${index}`)"></li>
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
    <el-form label-width="0" class="preset-key-form">
      <el-form-item>
        <el-input :model-value="agnesKey" type="password" :placeholder="$t('aiConfig.oneKeyAgnesPlaceholder')" show-password-on="click" clearable @update:model-value="$emit('update:agnesKey', $event)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:agnesVisible', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="success" :loading="agnesSaving" :disabled="!agnesKey.trim()" @click="$emit('submit-agnes')">
        {{ $t('aiConfig.oneKeyConfirmBtn') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { Delete, Download, MagicStick, Plus, Upload } from '@element-plus/icons-vue'

defineProps({
  showActions: { type: Boolean, default: true },
  selectedCount: { type: Number, default: 0 },
  batchDeleting: { type: Boolean, default: false },
  cheapSeedance2Visible: { type: Boolean, default: false },
  cheapSeedance2Key: { type: String, default: '' },
  cheapSeedance2Saving: { type: Boolean, default: false },
  tongyiVisible: { type: Boolean, default: false },
  tongyiKey: { type: String, default: '' },
  tongyiSaving: { type: Boolean, default: false },
  volcVisible: { type: Boolean, default: false },
  volcKey: { type: String, default: '' },
  volcSaving: { type: Boolean, default: false },
  agnesVisible: { type: Boolean, default: false },
  agnesKey: { type: String, default: '' },
  agnesSaving: { type: Boolean, default: false },
})
defineEmits([
  'add', 'export', 'import', 'preset', 'delete-selected',
  'update:cheapSeedance2Visible', 'update:cheapSeedance2Key', 'submit-cheap-seedance2',
  'update:tongyiVisible', 'update:tongyiKey', 'submit-tongyi',
  'update:volcVisible', 'update:volcKey', 'submit-volc',
  'update:agnesVisible', 'update:agnesKey', 'submit-agnes',
])
</script>

<style scoped>
.provider-presets {
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
.actions-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.one-key-not-recommended {
  margin-left: 4px;
  padding: 0 5px;
  border: 1px solid var(--el-color-warning-light-7, #f5dab1);
  border-radius: 4px;
  background: var(--el-color-warning-light-9, #fdf6ec);
  color: var(--el-color-warning, #e6a23c);
  font-size: 11px;
  line-height: 18px;
  vertical-align: middle;
}
.fade-slide-enter-active,
.fade-slide-leave-active { transition: all .2s ease; }
.fade-slide-enter-from,
.fade-slide-leave-to { opacity: 0; transform: translateX(8px); }
.one-key-help { display: flex; flex-direction: column; gap: 12px; }
.one-key-section { border-radius: 8px; padding: 12px 14px; background: var(--el-fill-color-light, #f5f7fa); }
.one-key-section-title { margin-bottom: 8px; color: var(--el-text-color-primary, #303133); font-size: 13px; font-weight: 600; }
.one-key-list { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.8; }
.one-key-list li { margin-bottom: 2px; }
.one-key-link { color: var(--el-color-primary); text-decoration: none; }
.one-key-link:hover { text-decoration: underline; }
.one-key-note { margin: 6px 0 0; color: var(--text-subtle); font-size: 12px; line-height: 1.5; }
.one-key-note + .one-key-note { margin-top: 4px; }
.preset-key-form { margin-top: 8px; }
@media (max-width: 720px) {
  .provider-presets { align-items: stretch; flex-direction: column; }
  .actions-right { justify-content: flex-start; }
}
</style>
