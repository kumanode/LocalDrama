import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { storyboardsAPI } from '@/api/storyboards'

export function useNarration({
  store,
  currentEpisodeId,
  storyboards,
  sbDuration,
  sbNarration,
}) {
  const ttsSbIds = reactive(new Set())
  const ttsSbNarrationIds = reactive(new Set())
  const sbDialogueAudioPaths = ref({})
  const sbNarrationAudioPaths = ref({})
  let sbTtsPreviewAudio = null

  function normalizeAudioRelPath(raw) {
    return String(raw != null ? raw : '').trim().replace(/^\//, '')
  }

  function sbDialogueAudioRelPath(sb) {
    if (!sb?.id) return ''
    const fromCache = sbDialogueAudioPaths.value[sb.id]
    const fromRow = sb.audio_local_path
    const raw = (fromCache != null && String(fromCache).trim() !== '') ? fromCache : (fromRow != null ? fromRow : '')
    return normalizeAudioRelPath(raw)
  }

  function sbNarrationAudioRelPath(sb) {
    if (!sb?.id) return ''
    const fromCache = sbNarrationAudioPaths.value[sb.id]
    const fromRow = sb.narration_audio_local_path
    const raw = (fromCache != null && String(fromCache).trim() !== '') ? fromCache : (fromRow != null ? fromRow : '')
    return normalizeAudioRelPath(raw)
  }

  function playSbTtsFromRel(rel) {
    if (!rel) return
    const url = `/static/${rel}`
    try {
      if (sbTtsPreviewAudio) {
        sbTtsPreviewAudio.pause()
        sbTtsPreviewAudio = null
      }
      const a = new Audio(url)
      sbTtsPreviewAudio = a
      a.addEventListener('ended', () => {
        if (sbTtsPreviewAudio === a) sbTtsPreviewAudio = null
      })
      a.play().catch(() => {
        ElMessage.warning(t('filmCreate.audioFileNotFoundWarning'))
        if (sbTtsPreviewAudio === a) sbTtsPreviewAudio = null
      })
    } catch (_) {
      ElMessage.warning(t('filmCreate.cannotPlayAudioWarning'))
    }
  }

  function playSbDialogueTts(sb) {
    playSbTtsFromRel(sbDialogueAudioRelPath(sb))
  }

  function playSbNarrationTts(sb) {
    playSbTtsFromRel(sbNarrationAudioRelPath(sb))
  }

  async function onTtsSbDialogue(sb) {
    if (!sb?.id || ttsSbIds.has(sb.id)) return
    if (!sb.dialogue?.trim()) {
      ElMessage.warning(t('filmCreate.noDialogueWarning'))
      return
    }
    ttsSbIds.add(sb.id)
    try {
      const res = await fetch('/api/v1/audio/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboard_id: sb.id, text: sb.dialogue, tts_kind: 'dialogue' }),
      })
      const data = await res.json()
      const businessOk = data.success === true || Number(data.code) === 200
      if (!res.ok || !businessOk) {
        throw new Error(data.error?.message || data.message || t('filmCreate.dubbingFailed'))
      }
      if (data.data?.local_path) {
        sbDialogueAudioPaths.value = { ...sbDialogueAudioPaths.value, [sb.id]: data.data.local_path }
        sb.audio_local_path = data.data.local_path
        ElMessage.success(t('filmCreate.dubbingGenerated'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.dubbingFailed'))
    } finally {
      ttsSbIds.delete(sb.id)
    }
  }

  async function onTtsSbNarration(sb) {
    if (!sb?.id || ttsSbNarrationIds.has(sb.id)) return
    const text = ((sbNarration.value[sb.id] ?? sb.narration) || '').toString().trim()
    if (!text) {
      ElMessage.warning(t('filmCreate.noNarrationWarning'))
      return
    }
    ttsSbNarrationIds.add(sb.id)
    try {
      const res = await fetch('/api/v1/audio/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboard_id: sb.id, text, tts_kind: 'narration' }),
      })
      const data = await res.json()
      const businessOk = data.success === true || Number(data.code) === 200
      if (!res.ok || !businessOk) {
        throw new Error(data.error?.message || data.message || t('filmCreate.narrationDubbingFailed'))
      }
      if (data.data?.local_path) {
        sbNarrationAudioPaths.value = { ...sbNarrationAudioPaths.value, [sb.id]: data.data.local_path }
        sb.narration_audio_local_path = data.data.local_path
        ElMessage.success(t('filmCreate.narrationDubbingGenerated'))
      }
    } catch (e) {
      ElMessage.error(e.message || t('filmCreate.narrationDubbingFailed'))
    } finally {
      ttsSbNarrationIds.delete(sb.id)
    }
  }

  function formatSrtTimestamp(ms) {
    if (!Number.isFinite(ms) || ms < 0) ms = 0
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const z = Math.floor(ms % 1000)
    const p2 = (n) => String(n).padStart(2, '0')
    return `${p2(h)}:${p2(m)}:${p2(s)},${String(z).padStart(3, '0')}`
  }

  async function onExportNarrationSrt() {
    const boards = storyboards.value || []
    if (!boards.length) {
      ElMessage.warning(t('filmCreate.noStoryboardsWarning'))
      return
    }
    let tMs = 0
    const lines = []
    let idx = 1
    for (const sb of boards) {
      const durSec = Number(sbDuration.value[sb.id] ?? sb.duration)
      const sec = Number.isFinite(durSec) && durSec > 0 ? durSec : 5
      const durMs = Math.round(sec * 1000)
      const text = ((sbNarration.value[sb.id] ?? sb.narration) || '').toString().trim()
      if (text) {
        const start = formatSrtTimestamp(tMs)
        const end = formatSrtTimestamp(tMs + durMs)
        lines.push(String(idx++), `${start} --> ${end}`, text, '')
      }
      tMs += durMs
    }
    if (!lines.length) {
      ElMessage.warning(t('filmCreate.noNarrationToExportWarning'))
      return
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `narration-${currentEpisodeId.value || 'episode'}.srt`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success(t('filmCreate.downloadedNarrationSrt'))
  }

  async function onSaveSbNarrationField(sb) {
    if (!sb?.id) return
    const next = (sbNarration.value[sb.id] || '').toString().trim()
    const prev = (sb.narration || '').toString().trim()
    if (next === prev) return
    try {
      await storyboardsAPI.update(sb.id, { narration: next || null })
      const list = store.currentEpisode?.storyboards
      if (Array.isArray(list)) {
        const row = list.find((x) => Number(x.id) === Number(sb.id))
        if (row) row.narration = next || null
      }
    } catch (_) { /* ignore */ }
  }

  return {
    ttsSbIds,
    ttsSbNarrationIds,
    sbDialogueAudioPaths,
    sbNarrationAudioPaths,
    normalizeAudioRelPath,
    sbDialogueAudioRelPath,
    sbNarrationAudioRelPath,
    playSbTtsFromRel,
    playSbDialogueTts,
    playSbNarrationTts,
    onTtsSbDialogue,
    onTtsSbNarration,
    formatSrtTimestamp,
    onExportNarrationSrt,
    onSaveSbNarrationField,
  }
}
