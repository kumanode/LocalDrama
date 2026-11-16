import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'

export function useStoryboardPromptDialog({ loadDrama }) {
  /** 正在编辑视频提示词的分镜 id；编辑中显示文本框与保存/取消 */
  const editingSbVideoPromptId = ref(null)
  const editingSbVideoPromptText = ref('')
  /** 正在编辑图片提示词的分镜 id（行内编辑，保留供内部 onSaveSbImagePrompt 使用） */
  const editingSbImagePromptId = ref(null)
  const editingSbImagePromptText = ref('')

  /** 分镜提示词弹窗 */
  const showSbPromptDialog = ref(false)
  const sbPromptTarget = ref(null)
  const sbPromptImageText = ref('')       // 原始 image_prompt
  const sbPromptPolishedText = ref('')    // AI 优化后 polished_prompt
  const sbPromptVideoText = ref('')       // video_prompt
  const sbPromptSaving = ref(false)
  const sbPromptPolishing = ref(false)

  function formatVideoPromptForEdit(text) {
    if (!text) return ''
    // 按「主体：」「运动：」等分段做换行，方便阅读
    return text
      .replace(/([。；])\s*(主体|运动|环境|运镜|美学|声音|时长)：/g, '$1\n$2：') // i18n-scan-ignore: regex
      .replace(/^\s+|\s+$/g, '')
  }

  function onEditSbImagePrompt(sb) {
    if (!sb?.id) return
    editingSbImagePromptId.value = sb.id
    editingSbImagePromptText.value = (sb.image_prompt || '').toString()
  }

  async function onOpenSbPromptDialog(sb) {
    if (!sb?.id) return
    sbPromptTarget.value = sb
    sbPromptImageText.value = (sb.image_prompt || '').toString()
    sbPromptPolishedText.value = (sb.polished_prompt || '').toString()
    const rawVideo = (sb.video_prompt || '').toString()
    sbPromptVideoText.value = formatVideoPromptForEdit(rawVideo)
    showSbPromptDialog.value = true
    try {
      const fresh = await storyboardsAPI.get(sb.id)
      if (fresh?.id) {
        sbPromptTarget.value = fresh
        sbPromptImageText.value = (fresh.image_prompt || '').toString()
        sbPromptPolishedText.value = (fresh.polished_prompt || '').toString()
        sbPromptVideoText.value = formatVideoPromptForEdit((fresh.video_prompt || '').toString())
      }
    } catch (_) {}
  }

  async function onPolishSbPrompt() {
    const sb = sbPromptTarget.value
    if (!sb?.id) return
    sbPromptPolishing.value = true
    try {
      const res = await storyboardsAPI.polishPrompt(sb.id)
      if (res?.polished_prompt) {
        sbPromptPolishedText.value = res.polished_prompt
        ElMessage.success(t('filmCreate.genericOptimizedPromptGen'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.genFailedCheckModel'))
    } finally {
      sbPromptPolishing.value = false
    }
  }

  async function onSaveSbPromptDialog() {
    const sb = sbPromptTarget.value
    if (!sb?.id) return
    sbPromptSaving.value = true
    try {
      const normalizedVideo = (sbPromptVideoText.value || '').replace(/\s+/g, ' ').trim()
      await storyboardsAPI.update(sb.id, {
        image_prompt: sbPromptImageText.value.trim() || null,
        polished_prompt: sbPromptPolishedText.value.trim() || null,
        video_prompt: normalizedVideo || null,
      })
      if (loadDrama) await loadDrama()
      showSbPromptDialog.value = false
      ElMessage.success(t('filmCreate.promptSaved'))
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    } finally {
      sbPromptSaving.value = false
    }
  }

  async function onSaveSbImagePrompt(sb) {
    if (!sb?.id) return
    try {
      await storyboardsAPI.update(sb.id, { image_prompt: (editingSbImagePromptText.value || '').toString().trim() || null })
      if (loadDrama) await loadDrama()
      editingSbImagePromptId.value = null
      ElMessage.success(t('filmCreate.imagePromptSaved'))
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    }
  }

  function onEditSbVideoPrompt(sb) {
    if (!sb?.id) return
    editingSbVideoPromptId.value = sb.id
    editingSbVideoPromptText.value = (sb.video_prompt || '').toString()
  }

  async function onSaveSbVideoPrompt(sb) {
    if (!sb?.id) return
    try {
      await storyboardsAPI.update(sb.id, { video_prompt: (editingSbVideoPromptText.value || '').toString().trim() || null })
      if (loadDrama) await loadDrama()
      editingSbVideoPromptId.value = null
      ElMessage.success(t('filmCreate.videoPromptSaved'))
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    }
  }

  return {
    editingSbVideoPromptId,
    editingSbVideoPromptText,
    editingSbImagePromptId,
    editingSbImagePromptText,
    showSbPromptDialog,
    sbPromptTarget,
    sbPromptImageText,
    sbPromptPolishedText,
    sbPromptVideoText,
    sbPromptSaving,
    sbPromptPolishing,
    formatVideoPromptForEdit,
    onEditSbImagePrompt,
    onOpenSbPromptDialog,
    onPolishSbPrompt,
    onSaveSbPromptDialog,
    onSaveSbImagePrompt,
    onEditSbVideoPrompt,
    onSaveSbVideoPrompt,
  }
}
