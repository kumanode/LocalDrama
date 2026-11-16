import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { dramaAPI } from '@/api/drama'
import { handleFilmCreateShortcut } from '@/utils/filmCreateShortcuts'
import { updateEpisodeScript } from '@/utils/episodeScriptUpdate'

const UNSAVED_STATES = new Set(['unsaved', 'saving', 'saveError'])

export function useFilmCreateProductivity({
  t,
  store,
  dramaId,
  currentEpisode,
  currentEpisodeId,
  scriptContent,
  saveScriptToBackend,
  storyboards,
  generateStoryboardImage,
}) {
  const scriptSaveState = ref('saved')
  const scriptSavedAt = ref(Date.now())
  const saveClock = ref(Date.now())
  const savedScriptValue = ref('')
  let scriptSaveTimer
  let saveAgeTimer
  let scriptSaveRevision = 0
  let hasLoadedInitialScript = false

  watch(currentEpisode, async () => {
    clearTimeout(scriptSaveTimer)
    await nextTick()
    savedScriptValue.value = String(scriptContent.value || '')
    scriptSaveState.value = 'saved'
    scriptSavedAt.value = Date.now()
    hasLoadedInitialScript = true
  }, { immediate: true })

  watch(scriptContent, (value) => {
    if (!hasLoadedInitialScript || String(value || '') === savedScriptValue.value) return
    scriptSaveState.value = 'unsaved'
    const revision = ++scriptSaveRevision
    const episodeId = currentEpisodeId.value
    clearTimeout(scriptSaveTimer)
    if (!dramaId.value || !episodeId) return
    scriptSaveTimer = setTimeout(async () => {
      if (episodeId !== currentEpisodeId.value || revision !== scriptSaveRevision) return
      scriptSaveState.value = 'saving'
      try {
        await persistScript(value, episodeId)
        if (revision === scriptSaveRevision && episodeId === currentEpisodeId.value) {
          savedScriptValue.value = String(value || '')
          markSaved()
        }
      } catch (_) {
        if (revision === scriptSaveRevision) scriptSaveState.value = 'saveError'
      }
    }, 1000)
  })

  async function persistScript(value, episodeId = currentEpisodeId.value) {
    if (!dramaId.value || !episodeId) return saveScriptToBackend(value)
    const episodes = updateEpisodeScript(
      store.drama?.episodes || [],
      episodeId,
      String(value || ''),
    )
    await dramaAPI.saveEpisodes(dramaId.value, episodes)
    store.setDrama({ ...store.drama, episodes })
  }

  function markSaved() {
    scriptSaveState.value = 'saved'
    scriptSavedAt.value = Date.now()
  }

  async function saveScriptFromShortcut() {
    clearTimeout(scriptSaveTimer)
    const value = String(scriptContent.value || '')
    if (!value.trim()) return
    const revision = ++scriptSaveRevision
    scriptSaveState.value = 'saving'
    try {
      await persistScript(value)
      if (revision === scriptSaveRevision) {
        savedScriptValue.value = value
        markSaved()
      }
    } catch (_) {
      scriptSaveState.value = 'saveError'
    }
  }

  function activeStoryboardIndex() {
    const nodes = storyboards.value.map((sb) => document.getElementById(`sb-${sb.id}`)).filter(Boolean)
    if (!nodes.length) return -1
    let nearest = 0
    let distance = Infinity
    nodes.forEach((node, index) => {
      const nextDistance = Math.abs(node.getBoundingClientRect().top - 120)
      if (nextDistance < distance) {
        nearest = index
        distance = nextDistance
      }
    })
    return nearest
  }

  function moveActiveStoryboard(delta) {
    const current = activeStoryboardIndex()
    const next = Math.max(0, Math.min(storyboards.value.length - 1, (current < 0 ? 0 : current) + delta))
    document.getElementById(`sb-${storyboards.value[next]?.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleEditorKeydown(event) {
    handleFilmCreateShortcut(event, {
      save: saveScriptFromShortcut,
      next: () => moveActiveStoryboard(1),
      previous: () => moveActiveStoryboard(-1),
      generate: () => {
        const active = storyboards.value[activeStoryboardIndex()]
        if (active) generateStoryboardImage(active)
      },
    })
  }

  function warnBeforeUnload(event) {
    if (!UNSAVED_STATES.has(scriptSaveState.value)) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (!UNSAVED_STATES.has(scriptSaveState.value)) return true
    return window.confirm(t('filmCreate.leaveWithUnsavedChanges'))
  })
  window.addEventListener('keydown', handleEditorKeydown)
  window.addEventListener('beforeunload', warnBeforeUnload)
  saveAgeTimer = setInterval(() => { saveClock.value = Date.now() }, 1000)
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEditorKeydown)
    window.removeEventListener('beforeunload', warnBeforeUnload)
    clearTimeout(scriptSaveTimer)
    clearInterval(saveAgeTimer)
  })

  return { scriptSaveState, scriptSavedAt, saveClock }
}
