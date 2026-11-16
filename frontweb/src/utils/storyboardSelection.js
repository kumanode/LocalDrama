export function toggleStoryboardSelection(selectedIds, id) {
  const next = new Set(selectedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function selectAllStoryboards(storyboards, selected) {
  return selected ? new Set(storyboards.map(({ id }) => id)) : new Set()
}

export function getSelectedStoryboards(storyboards, selectedIds) {
  return storyboards.filter(({ id }) => selectedIds.has(id))
}
