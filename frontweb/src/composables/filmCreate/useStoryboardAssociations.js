import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'
import { imagesAPI } from '@/api/images'
import { GEN_RESOURCE } from '@/stores/generationTaskStore'

export function useStoryboardAssociations({
  storyboards,
  characters,
  props,
  scenes,
  dramaId,
  storyboardUseFirstLastFrame,
  isSbUniversalMode,
  ensureProfessionalFramePrompt,
  getSelectedStyle,
  projectAspectRatio,
  pollTask,
  loadSingleStoryboardMedia,
  sbSelectedImgId,
}) {
  const sbCharacterIds = ref({})  // sbId -> number[]
  const sbPropIds = ref({})       // sbId -> number[]
  const sbSceneId = ref({})       // sbId -> number | null
  const regenSbImagesForAsset = reactive(new Set())
  const regenSbImagesProgress = ref({})

  const EMPTY_ARR = []

  function getSbCharacterIds(sbId) {
    const arr = sbCharacterIds.value[sbId]
    return Array.isArray(arr) && arr.length > 0 ? arr : EMPTY_ARR
  }

  function setSbCharacterIds(sbId, v) {
    const next = Array.isArray(v) ? v : []
    sbCharacterIds.value = { ...sbCharacterIds.value, [sbId]: next }
    onStoryboardCharacterChange(sbId)
  }

  function charactersAvailableToAddToSb(sbId) {
    const all = characters.value ?? []
    const cur = new Set((getSbCharacterIds(sbId) || []).map((x) => Number(x)))
    return all.filter((c) => c && !cur.has(Number(c.id)))
  }

  function onSbAddCharacterCommand(sbId, charId) {
    const id = Number(charId)
    if (!Number.isFinite(id)) return
    const cur = [...(getSbCharacterIds(sbId) || [])]
    if (cur.some((x) => Number(x) === id)) return
    cur.push(id)
    setSbCharacterIds(sbId, cur)
  }

  function getSbPropIds(sbId) {
    const arr = sbPropIds.value[sbId]
    return Array.isArray(arr) && arr.length > 0 ? arr : EMPTY_ARR
  }

  function setSbPropIds(sbId, v) {
    sbPropIds.value = { ...sbPropIds.value, [sbId]: Array.isArray(v) ? v : [] }
    onStoryboardPropChange(sbId)
  }

  function onStoryboardPropChange(sbId) {
    const ids = sbPropIds.value[sbId] || []
    storyboardsAPI.update(sbId, { prop_ids: ids }).catch(() => {})
  }

  function getSbSelectedScene(sbId) {
    const sceneId = sbSceneId.value[sbId]
    if (sceneId == null) return null
    const list = scenes.value ?? []
    return list.find((s) => Number(s.id) === Number(sceneId)) || null
  }

  function getSbSelectedCharacters(sbId) {
    const ids = getSbCharacterIds(sbId)
    if (!ids.length) return []
    const list = characters.value ?? []
    return ids.map((id) => list.find((c) => Number(c.id) === Number(id))).filter(Boolean)
  }

  function getSbSelectedProps(sbId) {
    const ids = getSbPropIds(sbId)
    if (!ids.length) return []
    const list = props.value ?? []
    return ids.map((id) => list.find((p) => Number(p.id) === Number(id))).filter(Boolean)
  }

  async function onStoryboardCharacterChange(sbId) {
    const ids = sbCharacterIds.value[sbId] || []
    try {
      await storyboardsAPI.update(sbId, { character_ids: ids })
    } catch (e) {
      console.warn('[storyboard] save character failed', e)
    }
  }

  function onStoryboardSceneChange(sbId) {
    const sceneId = sbSceneId.value[sbId] ?? null
    storyboardsAPI.update(sbId, { scene_id: sceneId }).catch(() => {})
  }

  function dedupeStoryboardsForAssetLink(list) {
    const byNum = new Map()
    const extras = []
    for (const sb of list || []) {
      const n = Number(sb?.storyboard_number)
      if (Number.isFinite(n) && n > 0) {
        const prev = byNum.get(n)
        if (!prev || Number(sb.id) > Number(prev.id)) byNum.set(n, sb)
      } else {
        extras.push(sb)
      }
    }
    return [...byNum.values(), ...extras].sort(
      (a, b) => (Number(a.storyboard_number) || 0) - (Number(b.storyboard_number) || 0)
    )
  }

  function getCharAffectedStoryboards(charId) {
    const matched = (storyboards.value || []).filter((sb) => {
      if (!sb.characters) return false
      const chars = Array.isArray(sb.characters) ? sb.characters : []
      return chars.some((c) => Number(typeof c === 'object' && c != null ? c.id : c) === Number(charId))
    })
    return dedupeStoryboardsForAssetLink(matched)
  }

  function getSceneAffectedStoryboards(sceneId) {
    const matched = (storyboards.value || []).filter(
      (sb) => sb.scene_id != null && Number(sb.scene_id) === Number(sceneId)
    )
    return dedupeStoryboardsForAssetLink(matched)
  }

  function getPropAffectedStoryboards(propId) {
    const matched = (storyboards.value || []).filter((sb) => {
      if (!sb.prop_ids) return false
      const pids = Array.isArray(sb.prop_ids) ? sb.prop_ids : []
      return pids.some((pid) => Number(pid) === Number(propId))
    })
    return dedupeStoryboardsForAssetLink(matched)
  }

  function scrollToStoryboard(sbId) {
    const el = document.getElementById('sb-' + sbId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function onRegenAffectedSbImages(assetKey, affectedBoards) {
    if (!affectedBoards.length || regenSbImagesForAsset.has(assetKey)) return
    try {
      await ElMessageBox.confirm(
        t('filmCreate.regenAffectedImagesConfirm', {
          count: affectedBoards.length,
          boards: affectedBoards.map((s) => s.storyboard_number).join(', #'),
        }),
        t('filmCreate.regenAffectedImagesTitle'),
        { confirmButtonText: t('filmCreate.confirmGenerate'), cancelButtonText: t('common.cancel'), type: 'warning' }
      )
    } catch {
      return
    }
    regenSbImagesForAsset.add(assetKey)
    if (!regenSbImagesProgress.value) regenSbImagesProgress.value = {}
    regenSbImagesProgress.value[assetKey] = { current: 0, total: affectedBoards.length }
    let failed = 0
    try {
      for (let i = 0; i < affectedBoards.length; i++) {
        regenSbImagesProgress.value[assetKey] = { current: i + 1, total: affectedBoards.length }
        const sb = affectedBoards[i]
        try {
          const useFirstLast = storyboardUseFirstLastFrame.value && !isSbUniversalMode(sb.id)
          let prompt = sb.polished_prompt || sb.image_prompt || sb.description || ''
          let frameTypeForCreate = undefined
          if (useFirstLast && ensureProfessionalFramePrompt) {
            prompt = await ensureProfessionalFramePrompt(sb, 'first')
            frameTypeForCreate = 'storyboard_first'
          }
          const res = await imagesAPI.create({
            storyboard_id: sb.id,
            drama_id: dramaId.value,
            prompt,
            style: getSelectedStyle ? getSelectedStyle() : undefined,
            frame_type: frameTypeForCreate,
            aspect_ratio: projectAspectRatio?.value || '16:9',
          })
          if (res?.task_id) {
            const pollRes = await pollTask(res.task_id, () => loadSingleStoryboardMedia(sb.id), {
              resourceType: GEN_RESOURCE.SB_IMAGE,
              resourceId: sb.id,
            })
            if (pollRes?.status !== 'completed') failed++
          } else {
            await loadSingleStoryboardMedia(sb.id)
          }
          if (useFirstLast && sbSelectedImgId) {
            delete sbSelectedImgId.value[sb.id]
          }
        } catch (_) {
          failed++
        }
        if (i < affectedBoards.length - 1) await new Promise((r) => setTimeout(r, 500))
      }
      if (failed === 0) ElMessage.success(t('filmCreate.regenAffectedImagesSuccess', { count: affectedBoards.length }))
      else ElMessage.warning(t('filmCreate.regenAffectedImagesPartial', { failed, total: affectedBoards.length }))
    } finally {
      regenSbImagesForAsset.delete(assetKey)
      if (regenSbImagesProgress.value) delete regenSbImagesProgress.value[assetKey]
    }
  }

  function syncAssociationsFromEpisode(ep) {
    const boards = ep?.storyboards || []
    const nextCharIds = {}
    const nextPropIds = {}
    const nextScene = {}
    for (const sb of boards) {
      nextScene[sb.id] = sb.scene_id ?? null
      const charList = Array.isArray(sb.characters) ? sb.characters : (sb.characters != null ? [sb.characters] : [])
      nextCharIds[sb.id] = charList.map((c) => (typeof c === 'object' && c != null ? Number(c.id) : Number(c))).filter((n) => Number.isFinite(n))
      nextPropIds[sb.id] = Array.isArray(sb.prop_ids) ? sb.prop_ids : []
    }
    sbCharacterIds.value = nextCharIds
    sbPropIds.value = nextPropIds
    sbSceneId.value = nextScene
  }

  return {
    sbCharacterIds,
    sbPropIds,
    sbSceneId,
    regenSbImagesForAsset,
    regenSbImagesProgress,
    getSbCharacterIds,
    setSbCharacterIds,
    charactersAvailableToAddToSb,
    onSbAddCharacterCommand,
    getSbPropIds,
    setSbPropIds,
    onStoryboardPropChange,
    getSbSelectedScene,
    getSbSelectedCharacters,
    getSbSelectedProps,
    onStoryboardCharacterChange,
    onStoryboardSceneChange,
    dedupeStoryboardsForAssetLink,
    getCharAffectedStoryboards,
    getSceneAffectedStoryboards,
    getPropAffectedStoryboards,
    scrollToStoryboard,
    onRegenAffectedSbImages,
    syncAssociationsFromEpisode,
  }
}
