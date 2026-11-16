const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [role="textbox"]'

export function handleFilmCreateShortcut(event, actions) {
  const target = event.target
  const isEditable = Boolean(target?.matches?.(EDITABLE_SELECTOR))
  const key = String(event.key || '').toLowerCase()

  if ((event.ctrlKey || event.metaKey) && key === 's') {
    event.preventDefault()
    actions.save()
    return true
  }
  if (event.ctrlKey || event.metaKey || event.altKey || isEditable) return false

  if (key === 'j') actions.next()
  else if (key === 'k') actions.previous()
  else if (key === 'g') actions.generate()
  else return false

  event.preventDefault()
  return true
}
