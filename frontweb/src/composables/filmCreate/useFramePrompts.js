import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'

export function useFramePrompts({
  store,
  sbLocation,
  sbTime,
  sbShotType,
  sbAngleH,
  sbAngleV,
  sbAngleS,
  sbResult,
  sbAction,
  sbAtmosphere,
  angleToPromptFragment,
  getSelectedStylePromptZh,
  getSelectedStylePrompt,
  pollTask,
}) {
  const showFramePromptEditor = ref(false)
  const editingFramePromptSb = ref(null)
  const editingFramePromptSlot = ref('first') // 'first' | 'last'
  const editingFramePromptText = ref('')
  const editingFramePromptSaving = ref(false)
  const editingFramePromptRegenerating = ref(false)

  /** 首帧图生提示词（与 onGenerateSbFrameImage 首帧分支一致） */
  function buildFirstFrameImagePrompt(sbId) {
    const sbRow = (store.storyboards || []).find((b) => b.id === sbId)
    return (sbRow?.polished_prompt || sbRow?.image_prompt || sbRow?.description || '').toString().trim()
  }

  function buildLastFrameImagePrompt(sbId) {
    const parts = []
    const loc = (sbLocation?.value?.[sbId] || '').toString().trim()
    const time = (sbTime?.value?.[sbId] || '').toString().trim()
    if (loc) parts.push(time ? loc + '，' + time : loc)
    const shotType = (sbShotType?.value?.[sbId] || '').toString().trim()
    if (shotType) parts.push(shotType)
    const angleH = sbAngleH?.value?.[sbId] || ''
    const angleV = sbAngleV?.value?.[sbId] || ''
    const angleS = sbAngleS?.value?.[sbId] || ''
    if (angleH && angleV && angleS && angleToPromptFragment) {
      const { label } = angleToPromptFragment(angleH, angleV, angleS)
      if (label) parts.push(label)
    }
    const result = (sbResult?.value?.[sbId] || '').toString().trim()
    const action = (sbAction?.value?.[sbId] || '').toString().trim()
    if (result) parts.push(result)
    else if (action) parts.push(action)
    const atmosphere = (sbAtmosphere?.value?.[sbId] || '').toString().trim()
    if (atmosphere) parts.push(atmosphere)
    const style = (getSelectedStylePromptZh && getSelectedStylePromptZh()) || (getSelectedStylePrompt && getSelectedStylePrompt()) || ''
    if (style) parts.push(style)
    parts.push(t('filmCreate.lastFrameStillPrompt'))
    return parts.join('，')
  }

  /** 从 frame_prompts 表读取已生成的专业帧提示词 */
  async function getCachedFramePromptFromDb(sbId, slot) {
    const frameType = slot === 'last' ? 'last' : 'first'
    try {
      const res = await storyboardsAPI.getFramePrompts(sbId)
      const row = (res?.frame_prompts || []).find((r) => r.frame_type === frameType)
      return row?.prompt?.trim() || ''
    } catch (_) {
      return ''
    }
  }

  /**
   * 首尾帧模式：优先走 framePromptService（专用系统提示词 + 文本 AI），失败则回退字段拼接。
   */
  async function ensureProfessionalFramePrompt(sb, slot, { forceRegenerate = false } = {}) {
    const frameType = slot === 'last' ? 'last' : 'first'
    if (!forceRegenerate) {
      const cached = await getCachedFramePromptFromDb(sb.id, slot)
      if (cached) return cached
    }
    try {
      const genRes = await storyboardsAPI.generateFramePrompt(sb.id, { frame_type: frameType })
      if (!genRes?.task_id) throw new Error(t('filmCreate.framePromptTaskNotCreated'))
      const pollRes = await pollTask(genRes.task_id)
      if (pollRes?.status !== 'completed') {
        throw new Error(pollRes?.error || t('filmCreate.framePromptGenFailed'))
      }
      const fromTask = pollRes.result?.response?.single_frame?.prompt
      if (fromTask && String(fromTask).trim()) return String(fromTask).trim()
      const cached2 = await getCachedFramePromptFromDb(sb.id, slot)
      if (cached2) return cached2
    } catch (e) {
      console.warn('[firstLastFrame] frame prompt gen failed, fallback to concat', e?.message)
    }
    return slot === 'last' ? buildLastFrameImagePrompt(sb.id) : buildFirstFrameImagePrompt(sb.id)
  }

  /** 打开首尾帧提示词编辑器（显示最终发给AI生图的完整提示词，支持编辑保存） */
  async function openFramePromptEditor(sb, slot) {
    if (!sb?.id) return
    editingFramePromptSb.value = sb
    editingFramePromptSlot.value = slot
    editingFramePromptText.value = ''
    showFramePromptEditor.value = true
    try {
      const pro = await ensureProfessionalFramePrompt(sb, slot)
      editingFramePromptText.value = pro || ''
    } catch (e) {
      editingFramePromptText.value = slot === 'last' ? buildLastFrameImagePrompt(sb.id) : buildFirstFrameImagePrompt(sb.id)
    }
  }

  /** 保存编辑后的帧提示词到 frame_prompts 表 */
  async function saveEditingFramePrompt() {
    const sb = editingFramePromptSb.value
    const slot = editingFramePromptSlot.value
    if (!sb?.id || !slot) return
    const text = (editingFramePromptText.value || '').trim()
    if (!text) {
      ElMessage.warning(t('filmCreate.promptEmptyWarning'))
      return
    }
    editingFramePromptSaving.value = true
    try {
      const frameType = slot === 'last' ? 'last' : 'first'
      await storyboardsAPI.saveFramePrompt(sb.id, frameType, { prompt: text })
      ElMessage.success(t('filmCreate.promptSavedFutureGenTip'))
      showFramePromptEditor.value = false
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.msgSaveFailed'))
    } finally {
      editingFramePromptSaving.value = false
    }
  }

  /** 重新生成专业帧提示词 */
  async function regenerateEditingFramePrompt() {
    const sb = editingFramePromptSb.value
    const slot = editingFramePromptSlot.value
    if (!sb?.id || !slot) return
    editingFramePromptRegenerating.value = true
    try {
      ElMessage.info(t('filmCreate.regeneratingFramePrompt'))
      const fresh = await ensureProfessionalFramePrompt(sb, slot, { forceRegenerate: true })
      editingFramePromptText.value = fresh || ''
      ElMessage.success(t('filmCreate.framePromptRegeneratedTip'))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.generationFailed'))
    } finally {
      editingFramePromptRegenerating.value = false
    }
  }

  // 兼容旧调用
  const showSbFramePromptPreview = openFramePromptEditor

  return {
    showFramePromptEditor,
    editingFramePromptSb,
    editingFramePromptSlot,
    editingFramePromptText,
    editingFramePromptSaving,
    editingFramePromptRegenerating,
    buildFirstFrameImagePrompt,
    buildLastFrameImagePrompt,
    getCachedFramePromptFromDb,
    ensureProfessionalFramePrompt,
    openFramePromptEditor,
    saveEditingFramePrompt,
    regenerateEditingFramePrompt,
    showSbFramePromptPreview,
  }
}
