const SCROLL_KEY_PREFIX = 'film-create-scroll:'

export function createFilmCreateExportStep(translate) {
  return {
    key: 'export',
    label: translate('filmCreate.stepExport'),
    anchor: 'anchor-export',
    status: 'pending',
    count: 0,
  }
}

export function filmCreateScrollStorageKey(dramaId) {
  return `${SCROLL_KEY_PREFIX}${dramaId || 'new'}`
}

export function saveFilmCreateScrollPosition(storage, key, position) {
  if (!storage || !key || !Number.isFinite(Number(position))) return
  try {
    storage.setItem(key, String(Math.max(0, Number(position))))
  } catch (_) {}
}

export function loadFilmCreateScrollPosition(storage, key) {
  if (!storage || !key) return null
  try {
    const value = storage.getItem(key)
    if (value == null || String(value).trim() === '') return null
    const position = Number(value)
    return Number.isFinite(position) && position >= 0 ? position : null
  } catch (_) {
    return null
  }
}
