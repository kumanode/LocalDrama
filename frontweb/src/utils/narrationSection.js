export function shouldShowNarration({ enabled = false, draft = '', saved = '' } = {}) {
  return Boolean(enabled || String(draft || '').trim() || String(saved || '').trim())
}
