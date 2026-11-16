import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'

export function useVideoParams({ store, dramaId, currentEpisodeId, loadDrama, refreshStoryboardsOnly }) {
  const showVideoParamsDialog = ref(false)
  const videoParamsTarget = ref(null)
  const videoParamsSaving = ref(false)
  const regeneratingLayoutSbIds = ref(new Set())
  const splitByAudioLoading = ref(false)
  const inferringParams = ref(false)

  // Fields mapping by storyboard ID
  const sbTitle = ref({})
  const sbLocation = ref({})
  const sbTime = ref({})
  const sbDuration = ref({})
  const sbAction = ref({})
  const sbDialogue = ref({})
  const sbNarration = ref({})
  const sbAtmosphere = ref({})
  const sbResult = ref({})
  const sbAngle = ref({})
  const sbAngleH = ref({})
  const sbAngleV = ref({})
  const sbAngleS = ref({})
  const sbMovement = ref({})
  const sbLighting = ref({})
  const sbDof = ref({})
  const sbShotType = ref({})
  const sbLayoutDescription = ref({})
  const sbCreationMode = ref({})
  const sbUniversalSegmentText = ref({})
  const sbSeed = ref({})

  function getMovementLabel(m) {
    if (!m) return ''
    const movementMap = {
      static: () => t('filmCreate.movements.static'),
      push: () => t('filmCreate.movements.push'),
      pull: () => t('filmCreate.movements.pull'),
      pan: () => t('filmCreate.movements.pan'),
      tilt: () => t('filmCreate.movements.tilt'),
      tracking: () => t('filmCreate.movements.tracking'),
      crane_up: () => t('filmCreate.movements.crane_up'),
      crane_dn: () => t('filmCreate.movements.crane_dn'),
      orbit: () => t('filmCreate.movements.orbit'),
      handheld: () => t('filmCreate.movements.handheld'),
      zoom: () => t('filmCreate.movements.zoom'),
      roll: () => t('filmCreate.movements.roll'),
      whip_pan: () => t('filmCreate.movements.whip_pan'),
      spiral: () => t('filmCreate.movements.spiral'),
      hitchcock_zoom: () => t('filmCreate.movements.hitchcock_zoom'),
      bullet_time: () => t('filmCreate.movements.bullet_time'),
      dutch_angle_move: () => t('filmCreate.movements.dutch_angle_move'),
      dolly_track: () => t('filmCreate.movements.dolly_track'),
      slowmo_orbit: () => t('filmCreate.movements.slowmo_orbit'),
    }
    return movementMap[m] ? movementMap[m]() : m
  }

  function angleToPromptFragment(h, v, s) {
    const hDesc = { front: 'shooting from the front', front_left: 'shooting from front-left at 45-degree angle', left: 'shooting from the left side, profile view', back_left: 'shooting from back-left at 135-degree angle', back: "shooting from behind, character's back to camera", back_right: 'shooting from back-right at 135-degree angle', right: 'shooting from the right side, profile view', front_right: 'shooting from front-right at 45-degree angle' }
    const vDesc = { worm: "extreme low-angle worm's eye view, camera near ground pointing sharply upward, strong upward perspective distortion, background shows sky/ceiling", low: 'low-angle upward shot, camera below eye-line, slight upward tilt, empowering perspective', eye_level: 'eye-level shot, neutral perspective, natural horizontal framing', high: "high-angle bird's eye view, camera above looking down, background shows floor/ground with downward perspective distortion" }
    const sDesc = { close_up: 'close-up shot (face/bust framing), subject fills most of frame, shallow depth of field, background softly blurred', medium: 'medium shot (waist-up to full body), character and immediate surroundings visible, moderate depth of field', wide: 'wide shot (full body with environment), subject small relative to scene, deep depth of field, environment context prominent' }
    const hLabel = {
      front: () => t('filmCreate.angleFront'),
      front_left: () => t('filmCreate.angleFrontLeft'),
      left: () => t('filmCreate.angleLeft'),
      back_left: () => t('filmCreate.angleBackLeft'),
      back: () => t('filmCreate.angleBack'),
      back_right: () => t('filmCreate.angleBackRight'),
      right: () => t('filmCreate.angleRight'),
      front_right: () => t('filmCreate.angleFrontRight'),
    }
    const vLabel = {
      worm: () => t('filmCreate.angleWorm'),
      low: () => t('filmCreate.angleLow'),
      eye_level: () => t('filmCreate.angleEyeLevel'),
      high: () => t('filmCreate.angleHigh'),
    }
    const sLabel = {
      close_up: () => t('filmCreate.angleCloseUp'),
      medium: () => t('filmCreate.angleMedium'),
      wide: () => t('filmCreate.angleWide'),
    }
    const fragment = [sDesc[s] || sDesc.medium, vDesc[v] || vDesc.eye_level, hDesc[h] || hDesc.front].join(', ')
    const sText = sLabel[s] ? sLabel[s]() : t('filmCreate.angleMedium')
    const vText = vLabel[v] ? vLabel[v]() : t('filmCreate.angleEyeLevel')
    const hText = hLabel[h] ? hLabel[h]() : t('filmCreate.angleFront')
    const label = `${sText} · ${vText} · ${hText}`
    return { fragment, label }
  }

  function syncVideoParamsFromStoryboards(boards = []) {
    const nextDialogue = {}
    const nextNarration = {}
    const nextShot = {}
    const nextTitle = {}
    const nextLocation = {}
    const nextTime = {}
    const nextDuration = {}
    const nextAction = {}
    const nextResult = {}
    const nextAtmosphere = {}
    const nextAngle = {}
    const nextAngleH = {}
    const nextAngleV = {}
    const nextAngleS = {}
    const nextMovement = {}
    const nextLighting = {}
    const nextDof = {}
    const nextLayoutDescription = {}
    const nextCreationMode = {}
    const nextUniversalSegment = {}
    const nextSeed = {}
    for (const sb of boards) {
      nextDialogue[sb.id] = sb.dialogue ?? ''
      nextNarration[sb.id] = sb.narration ?? ''
      nextShot[sb.id] = (sb.shot_type ?? '').toString() || ''
      nextTitle[sb.id] = (sb.title ?? '').toString()
      nextLocation[sb.id] = (sb.location ?? '').toString()
      nextTime[sb.id] = (sb.time ?? '').toString()
      nextDuration[sb.id] = sb.duration != null ? Number(sb.duration) : 5
      nextAction[sb.id] = (sb.action ?? '').toString()
      nextResult[sb.id] = (sb.result ?? '').toString()
      nextAtmosphere[sb.id] = (sb.atmosphere ?? '').toString()
      nextAngle[sb.id] = (sb.angle ?? '').toString()
      nextAngleH[sb.id] = sb.angle_h || ''
      nextAngleV[sb.id] = sb.angle_v || ''
      nextAngleS[sb.id] = sb.angle_s || ''
      nextMovement[sb.id] = (sb.movement ?? '').toString()
      nextLighting[sb.id] = sb.lighting_style || ''
      nextDof[sb.id] = sb.depth_of_field || ''
      nextLayoutDescription[sb.id] = (sb.layout_description ?? '').toString()
      nextCreationMode[sb.id] = sb.creation_mode === 'universal' ? 'universal' : 'classic'
      nextUniversalSegment[sb.id] = (sb.universal_segment_text ?? '').toString()
      nextSeed[sb.id] = sb.seed != null ? Number(sb.seed) : null
    }
    sbDialogue.value = nextDialogue
    sbNarration.value = nextNarration
    sbShotType.value = nextShot
    sbTitle.value = nextTitle
    sbLocation.value = nextLocation
    sbTime.value = nextTime
    sbDuration.value = nextDuration
    sbAction.value = nextAction
    sbResult.value = nextResult
    sbAtmosphere.value = nextAtmosphere
    sbAngle.value = nextAngle
    sbAngleH.value = nextAngleH
    sbAngleV.value = nextAngleV
    sbAngleS.value = nextAngleS
    sbMovement.value = nextMovement
    sbLighting.value = nextLighting
    sbDof.value = nextDof
    sbLayoutDescription.value = nextLayoutDescription
    sbCreationMode.value = nextCreationMode
    sbUniversalSegmentText.value = nextUniversalSegment
    sbSeed.value = nextSeed
  }

  function setSbCreationModeId(sbId, v) {
    sbCreationMode.value = {
      ...sbCreationMode.value,
      [sbId]: v === 'universal' ? 'universal' : 'classic',
    }
  }

  function onOpenVideoParamsDialog(sb) {
    videoParamsTarget.value = sb
    showVideoParamsDialog.value = true
  }

  function onVideoParamsDialogClosed() {
    const sb = videoParamsTarget.value
    if (!sb?.id) return
    const row = (store.storyboards || []).find((x) => Number(x.id) === Number(sb.id))
    if (!row) return
    sbCreationMode.value = { ...sbCreationMode.value, [sb.id]: row.creation_mode === 'universal' ? 'universal' : 'classic' }
    sbUniversalSegmentText.value = { ...sbUniversalSegmentText.value, [sb.id]: (row.universal_segment_text ?? '').toString() }
  }

  async function onSaveSbVideoFields(sb) {
    if (!sb?.id) return
    try {
      await storyboardsAPI.update(sb.id, {
        title: (sbTitle.value[sb.id] || '').toString().trim() || null,
        location: (sbLocation.value[sb.id] || '').toString().trim() || null,
        time: (sbTime.value[sb.id] || '').toString().trim() || null,
        duration: Number(sbDuration.value[sb.id]) || 5,
        action: (sbAction.value[sb.id] || '').toString().trim() || null,
        dialogue: (sbDialogue.value[sb.id] || '').toString().trim() || null,
        narration: (sbNarration.value[sb.id] || '').toString().trim() || null,
        atmosphere: (sbAtmosphere.value[sb.id] || '').toString().trim() || null,
        result: (sbResult.value[sb.id] || '').toString().trim() || null,
        angle: (sbAngle.value[sb.id] || '').toString().trim() || null,
        angle_h: sbAngleH.value[sb.id] || null,
        angle_v: sbAngleV.value[sb.id] || null,
        angle_s: sbAngleS.value[sb.id] || null,
        movement: (sbMovement.value[sb.id] || '').toString().trim() || null,
        lighting_style: sbLighting.value[sb.id] || null,
        depth_of_field: sbDof.value[sb.id] || null,
        shot_type: (sbShotType.value[sb.id] || '').toString().trim() || null,
        layout_description: (sbLayoutDescription.value[sb.id] || '').toString().trim() || null,
        creation_mode: sbCreationMode.value[sb.id] === 'universal' ? 'universal' : 'classic',
        universal_segment_text: (sbUniversalSegmentText.value[sb.id] || '').toString().trim() || null,
        seed: sbSeed.value[sb.id] != null && !Number.isNaN(Number(sbSeed.value[sb.id])) ? Number(sbSeed.value[sb.id]) : null,
      })
      const rebuilt = await storyboardsAPI.rebuildVideoPrompt(sb.id)
      const newVp = (rebuilt?.video_prompt && String(rebuilt.video_prompt).trim()) || ''
      if (newVp) {
        videoParamsTarget.value = { ...sb, video_prompt: newVp }
      }
      await loadDrama()
      ElMessage.success(t('filmCreate.savedVideoPromptAutoGenerated'))
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    }
  }

  async function onSaveVideoParams() {
    const sb = videoParamsTarget.value
    if (!sb?.id) return
    videoParamsSaving.value = true
    try {
      await onSaveSbVideoFields(sb)
      showVideoParamsDialog.value = false
    } catch (e) {
      ElMessage.error(e.message || t('common.saveFailed'))
    } finally {
      videoParamsSaving.value = false
    }
  }

  function countDialogueLinesInSb(sb) {
    const raw = ((sbDialogue.value[sb.id] ?? sb.dialogue) || '').toString().trim()
    if (!raw) return 0
    const matches = raw.match(/[\u4e00-\u9fa5A-Za-z0-9·]{1,16}[：:]/g)
    return matches?.length || (raw ? 1 : 0)
  }

  function canSplitSbByAudio(sb) {
    if (!sb?.id) return false
    const dialogueCount = countDialogueLinesInSb(sb)
    const hasNarration = !!((sbNarration.value[sb.id] ?? sb.narration) || '').toString().trim()
    return dialogueCount + (hasNarration ? 1 : 0) >= 2
  }

  async function onSplitSbByAudio(sb) {
    if (!sb?.id) return
    try {
      await ElMessageBox.confirm(
        t('filmCreate.splitByDialogueConfirmMsg'),
        t('filmCreate.splitByDialogueConfirmTitle'),
        { type: 'warning', confirmButtonText: t('filmCreate.splitShot'), cancelButtonText: t('common.cancel') }
      )
    } catch {
      return
    }
    splitByAudioLoading.value = true
    try {
      if (showVideoParamsDialog.value && videoParamsTarget.value?.id === sb.id) {
        await onSaveSbVideoFields(sb)
      }
      const res = await storyboardsAPI.splitByAudio(sb.id)
      const n = res?.storyboard_ids?.length ?? 0
      await loadDrama()
      showVideoParamsDialog.value = false
      ElMessage.success(t('filmCreate.splitShotCount', { count: n }))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.splitShotFailed'))
    } finally {
      splitByAudioLoading.value = false
    }
  }

  async function onRegenerateLayoutDescription(sb) {
    if (sb && typeof sb === 'object' && sb.__v_isRef) sb = sb.value
    if (!sb?.id) return
    regeneratingLayoutSbIds.value.add(sb.id)
    try {
      const res = await storyboardsAPI.regenerateLayoutDescription(sb.id)
      const newText = res?.layout_description || res?.data?.layout_description
      if (newText) {
        sbLayoutDescription.value = { ...sbLayoutDescription.value, [sb.id]: newText }
        try { if (refreshStoryboardsOnly) await refreshStoryboardsOnly() } catch (_) {}
        ElMessage.success(t('filmCreate.layoutDescOptimizedSaved'))
      } else {
        ElMessage.warning(t('filmCreate.noValidLayoutDescWarning'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.regenLayoutDescFailed'))
    } finally {
      regeneratingLayoutSbIds.value.delete(sb.id)
    }
  }

  function isSbUniversalMode(sbId) {
    return (sbCreationMode.value[sbId] || '').toString() === 'universal'
  }

  async function onToggleSbUniversalMode(sb) {
    if (!sb?.id) return
    const cur = isSbUniversalMode(sb.id) ? 'universal' : 'classic'
    const next = cur === 'universal' ? 'classic' : 'universal'
    sbCreationMode.value = { ...sbCreationMode.value, [sb.id]: next }
    try {
      await storyboardsAPI.update(sb.id, { creation_mode: next })
      const list = store.currentEpisode?.storyboards
      if (Array.isArray(list)) {
        const row = list.find((x) => Number(x.id) === Number(sb.id))
        if (row) row.creation_mode = next
      }
    } catch (e) {
      sbCreationMode.value = { ...sbCreationMode.value, [sb.id]: cur }
      ElMessage.error(e.message || t('common.saveFailed'))
    }
  }

  async function onSaveUniversalSegmentField(sb) {
    if (!sb?.id) return
    const next = (sbUniversalSegmentText.value[sb.id] || '').toString()
    const prev = (sb.universal_segment_text || '').toString()
    if (next === prev) return
    try {
      await storyboardsAPI.update(sb.id, { universal_segment_text: next.trim() || null })
      const list = store.currentEpisode?.storyboards
      if (Array.isArray(list)) {
        const row = list.find((x) => Number(x.id) === Number(sb.id))
        if (row) row.universal_segment_text = next.trim() || null
      }
    } catch (_) { /* ignore */ }
  }

  async function onBatchInferParams(episodeId) {
    const epId = episodeId || currentEpisodeId?.value
    if (!epId) return
    inferringParams.value = true
    try {
      const res = await storyboardsAPI.batchInferParams(epId, false)
      await loadDrama()
      ElMessage.success(t('filmCreate.cameraParamInferredSuccess', { count: res?.updated ?? 0 }))
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.inferenceFailed'))
    } finally {
      inferringParams.value = false
    }
  }

  return {
    showVideoParamsDialog,
    videoParamsTarget,
    videoParamsSaving,
    regeneratingLayoutSbIds,
    splitByAudioLoading,
    inferringParams,
    sbTitle,
    sbLocation,
    sbTime,
    sbDuration,
    sbAction,
    sbDialogue,
    sbNarration,
    sbAtmosphere,
    sbResult,
    sbAngle,
    sbAngleH,
    sbAngleV,
    sbAngleS,
    sbMovement,
    sbLighting,
    sbDof,
    sbShotType,
    sbLayoutDescription,
    sbCreationMode,
    sbUniversalSegmentText,
    sbSeed,
    isSbUniversalMode,
    onToggleSbUniversalMode,
    onSaveUniversalSegmentField,
    onBatchInferParams,
    getMovementLabel,
    angleToPromptFragment,
    syncVideoParamsFromStoryboards,
    setSbCreationModeId,
    onOpenVideoParamsDialog,
    onVideoParamsDialogClosed,
    onSaveSbVideoFields,
    onSaveVideoParams,
    canSplitSbByAudio,
    onSplitSbByAudio,
    onRegenerateLayoutDescription,
  }
}
