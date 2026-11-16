import { ref } from 'vue'
import {
  generationStyleOptions,
  stylePromptMetadataForSave,
  CUSTOM_STYLE_VALUE,
} from '@/constants/styleOptions'

/**
 * 画面风格与提示词元数据处理
 */
export function useGenerationStyle() {
  const generationStyle = ref('')
  const customStylePrompt = ref('')

  function _findStyleOption(val) {
    for (const group of generationStyleOptions) {
      const found = group.options.find((o) => o.value === val)
      if (found) return found
    }
    return null
  }

  function getSelectedStylePrompt() {
    const val = (generationStyle.value || '').toString().trim()
    if (!val) return undefined
    if (val === CUSTOM_STYLE_VALUE) {
      const text = (customStylePrompt.value || '').toString().trim()
      return text || undefined
    }
    const opt = _findStyleOption(val)
    if (opt) return opt.promptEn || opt.prompt || val
    return val
  }

  function getSelectedStylePromptZh() {
    const val = (generationStyle.value || '').toString().trim()
    if (!val) return undefined
    if (val === CUSTOM_STYLE_VALUE) {
      const text = (customStylePrompt.value || '').toString().trim()
      return text || undefined
    }
    const opt = _findStyleOption(val)
    if (opt) return opt.prompt || opt.promptEn || val
    return val
  }

  function projectStylePromptMetadata() {
    return stylePromptMetadataForSave(generationStyle.value, customStylePrompt.value)
  }

  function getSelectedStyle() {
    return getSelectedStylePrompt()
  }

  return {
    generationStyle,
    customStylePrompt,
    getSelectedStylePrompt,
    getSelectedStylePromptZh,
    projectStylePromptMetadata,
    getSelectedStyle,
  }
}
