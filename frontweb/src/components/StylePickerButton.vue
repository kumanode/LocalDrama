<template>
  <div class="style-picker-wrap">
    <!-- 触发按钮，外观与 el-select 一致 -->
    <div
      class="style-picker-trigger"
      :class="{ 'has-value': !!modelValue }"
      @click="visible = true"
    >
      <template v-if="displayLabel">
        <span class="spt-swatch" :style="triggerSwatchStyle" />
        <span class="spt-label">{{ displayLabel }}</span>
      </template>
      <span v-else class="spt-placeholder">{{ placeholder || t('filmList.stylePlaceholder') }}</span>
      <el-icon class="spt-arrow"><ArrowDown /></el-icon>
      <span v-if="modelValue" class="spt-clear" @click.stop="clearSelection">
        <el-icon><CircleClose /></el-icon>
      </span>
    </div>

    <!-- 选择弹窗 -->
    <el-dialog
      v-model="visible"
      :title="t('filmList.stylePlaceholder')"
      width="90vw"
      style="max-width: 1100px"
      class="style-picker-dialog"
      :append-to-body="true"
      destroy-on-close
      @closed="showCustomEditor = false"
    >
      <div class="spd-search">
        <el-input
          v-model="search"
          :placeholder="t('common.search')"
          clearable
          style="width: 240px"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span v-if="modelValue" class="spd-selected-hint">
          {{ t('common.detail') }}: {{ displayLabel }}
        </span>
      </div>

      <div class="spd-body">
        <template v-for="group in filteredGroups" :key="group.label">
          <div class="spd-group-title">{{ getGroupLabel(group) }}</div>
          <div class="spd-grid">
            <div
              v-for="opt in group.options"
              :key="opt.value"
              class="spd-item"
              :class="{ 'is-active': modelValue === opt.value }"
              @click="select(opt)"
            >
              <div class="spd-thumb" :style="thumbStyle(opt)">
                <img
                  v-if="opt.thumb"
                  :src="opt.thumb"
                  :alt="getOptionLabel(opt)"
                  loading="lazy"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <span v-if="!opt.thumb" class="spd-thumb-text">{{ getOptionLabel(opt).slice(0, 2) }}</span>
              </div>
              <div class="spd-name">{{ getOptionLabel(opt) }}</div>
              <div v-if="modelValue === opt.value" class="spd-check">✓</div>
            </div>
          </div>
        </template>

        <template v-if="showCustomSection">
          <div class="spd-group-title">{{ t('common.more') }}</div>
          <div class="spd-grid">
            <div
              class="spd-item"
              :class="{ 'is-active': modelValue === CUSTOM_STYLE_VALUE }"
              @click="openCustomEditor"
            >
              <div class="spd-thumb" :style="{ background: CUSTOM_SWATCH }">
                <span class="spd-thumb-text">{{ locale === 'en' ? 'Cust' : '自定' }}</span>
              </div>
              <div class="spd-name">{{ t('styleOptions.custom') }}</div>
              <div v-if="modelValue === CUSTOM_STYLE_VALUE" class="spd-check">✓</div>
            </div>
          </div>
        </template>

        <div v-if="showCustomEditor" class="spd-custom-editor">
          <el-input
            v-model="customDraft"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            :placeholder="t('filmList.projectDescPlaceholder')"
          />
          <div class="spd-custom-actions">
            <el-button @click="showCustomEditor = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="confirmCustom">{{ t('common.confirm') }}</el-button>
          </div>
        </div>

        <div v-if="filteredGroups.length === 0 && !showCustomSection" class="spd-empty">{{ t('common.empty') }}</div>
      </div>

      <template #footer>
        <el-button @click="clearAndClose">{{ t('common.reset') }}</el-button>
        <el-button type="primary" @click="visible = false">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowDown, CircleClose, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { CUSTOM_STYLE_VALUE, getStyleLabel } from '@/constants/styleOptions'
import { useI18n } from '@/i18n'

const { locale, t } = useI18n()

const CUSTOM_SWATCH = 'linear-gradient(135deg,#5b8def,#2dd4bf)'

const props = defineProps({
  modelValue: { type: String, default: '' },
  customPrompt: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:customPrompt', 'change'])

const visible = ref(false)
const search = ref('')
const showCustomEditor = ref(false)
const customDraft = ref('')

const allOptions = computed(() => props.options.flatMap((g) => g.options))
const selectedOption = computed(() => allOptions.value.find((o) => o.value === props.modelValue) || null)

const isCustom = computed(() => props.modelValue === CUSTOM_STYLE_VALUE)

function getGroupLabel(group) {
  if (locale.value === 'en' && group.labelEn) return group.labelEn
  return group.label
}

function getOptionLabel(opt) {
  if (!opt) return ''
  if (locale.value === 'en' && opt.labelEn) return opt.labelEn
  return opt.label || ''
}

const displayLabel = computed(() => {
  if (isCustom.value) return t('styleOptions.custom')
  return getOptionLabel(selectedOption.value)
})

const triggerSwatchStyle = computed(() => {
  if (isCustom.value) return { background: CUSTOM_SWATCH }
  return swatchStyle(selectedOption.value)
})

const showCustomSection = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return true
  return '自定义'.includes(kw) || 'custom'.includes(kw) || kw.includes('自定义') || kw.includes('custom')
})

const filteredGroups = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return props.options
  return props.options
    .map((g) => ({
      ...g,
      options: g.options.filter((o) => {
        const lZh = (o.label || '').toLowerCase()
        const lEn = (o.labelEn || '').toLowerCase()
        const val = (o.value || '').toLowerCase()
        return lZh.includes(kw) || lEn.includes(kw) || val.includes(kw)
      }),
    }))
    .filter((g) => g.options.length > 0)
})

function thumbStyle(opt) {
  if (opt.thumb) return {}
  return { background: opt.color || 'linear-gradient(135deg,#667eea,#764ba2)' }
}

function swatchStyle(opt) {
  return { background: opt?.color || 'linear-gradient(135deg,#667eea,#764ba2)' }
}

function openCustomEditor() {
  customDraft.value = props.customPrompt || ''
  showCustomEditor.value = true
}

function confirmCustom() {
  const text = customDraft.value.trim()
  if (!text) {
    ElMessage.warning(t('filmList.projectDescPlaceholder'))
    return
  }
  emit('update:customPrompt', text)
  emit('update:modelValue', CUSTOM_STYLE_VALUE)
  emit('change', CUSTOM_STYLE_VALUE)
  showCustomEditor.value = false
  visible.value = false
}

function select(opt) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  showCustomEditor.value = false
  visible.value = false
}

function clearSelection() {
  emit('update:modelValue', '')
  emit('update:customPrompt', '')
  emit('change', '')
}

function clearAndClose() {
  clearSelection()
  showCustomEditor.value = false
  visible.value = false
}
</script>

<style scoped>
.style-picker-wrap {
  display: inline-block;
}
.style-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  box-sizing: border-box;
  font-size: 13px;
  color: var(--el-text-color-regular);
  min-width: 140px;
}
.style-picker-trigger:hover {
  border-color: var(--el-color-primary);
}
.spt-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  display: inline-block;
}
.spt-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}
.spt-placeholder {
  flex: 1;
  color: var(--el-text-color-placeholder);
}
.spt-arrow {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
.spt-clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  margin-left: 2px;
}
.spt-clear:hover {
  color: var(--el-color-danger);
}
.spd-search {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.spd-selected-hint {
  font-size: 13px;
  color: var(--el-color-primary);
}
.spd-body {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
.spd-group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin: 14px 0 8px;
  padding-left: 4px;
}
.spd-group-title:first-child {
  margin-top: 0;
}
.spd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
  gap: 10px;
}
.spd-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  background: var(--el-fill-color-blank);
  transition: all 0.15s ease;
}
.spd-item:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.spd-item.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.spd-thumb {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-fill-color-dark);
}
.spd-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.spd-thumb-text {
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.spd-name {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.spd-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spd-custom-editor {
  margin-top: 14px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.spd-custom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.spd-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
