import { t } from '@/i18n'

/**
 * Returns column header labels localized for the active language.
 */
export function getStoryboardSheetColumns() {
  return [
    t('exportStoryboard.colIndex'),
    t('exportStoryboard.colShotNumber'),
    t('exportStoryboard.colTitle'),
    t('exportStoryboard.colSegment'),
    t('exportStoryboard.colDuration'),
    t('exportStoryboard.colShotType'),
    t('exportStoryboard.colMovement'),
    t('exportStoryboard.colScene'),
    t('exportStoryboard.colCharacter'),
    t('exportStoryboard.colProp'),
    t('exportStoryboard.colLocation'),
    t('exportStoryboard.colTime'),
    t('exportStoryboard.colDescription'),
    t('exportStoryboard.colDialogue'),
    t('exportStoryboard.colNarration'),
    t('exportStoryboard.colAction'),
    t('exportStoryboard.colResult'),
    t('exportStoryboard.colAtmosphere'),
    t('exportStoryboard.colLayout'),
    t('exportStoryboard.colFirstFramePrompt'),
    t('exportStoryboard.colLastFramePrompt'),
    t('exportStoryboard.colImagePrompt'),
    t('exportStoryboard.colVideoPrompt'),
    t('exportStoryboard.colUniversalSegment'),
  ]
}

function cellText(v) {
  if (v == null) return ''
  return String(v).replace(/\r\n/g, '\n').trim()
}

function escapeHtml(s) {
  return cellText(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsvCell(s) {
  const text = cellText(s)
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function charBlock(char) {
  const name = cellText(char.name) || t('exportStoryboard.unnamedCharacter')
  const parts = [
    char.appearance && t('exportStoryboard.charAppearance', { val: char.appearance }),
    char.personality && t('exportStoryboard.charPersonality', { val: char.personality }),
    char.description && t('exportStoryboard.charDescription', { val: char.description }),
    char.polished_prompt && t('exportStoryboard.charPrompt', { val: char.polished_prompt }),
  ].filter(Boolean)
  return parts.length ? `${name}\n${parts.join('\n')}` : name
}

function sceneBlock(scene) {
  const head = cellText(scene.location) || t('exportStoryboard.unnamedScene')
  const parts = [
    scene.time && t('exportStoryboard.sceneTime', { val: scene.time }),
    scene.prompt && t('exportStoryboard.scenePrompt', { val: scene.prompt }),
    scene.polished_prompt && t('exportStoryboard.scenePolishedPrompt', { val: scene.polished_prompt }),
  ].filter(Boolean)
  return parts.length ? `${head}\n${parts.join('\n')}` : head
}

function propBlock(prop) {
  const name = cellText(prop.name) || t('exportStoryboard.unnamedProp')
  const parts = [
    prop.type && t('exportStoryboard.propType', { val: prop.type }),
    prop.description && t('exportStoryboard.propDescription', { val: prop.description }),
    prop.prompt && t('exportStoryboard.propPrompt', { val: prop.prompt }),
  ].filter(Boolean)
  return parts.length ? `${name}\n${parts.join('\n')}` : name
}

function joinBlocks(blocks) {
  return blocks.filter((b) => cellText(b)).join('\n\n')
}

function field(getField, sb, key) {
  const v = getField?.(sb, key)
  if (v != null && v !== '') return cellText(v)
  return cellText(sb[key])
}

/**
 * Builds storyboard spreadsheet rows: strictly 1 row per storyboard.
 */
export function buildStoryboardSheetRows(ctx) {
  const {
    storyboards = [],
    getScene,
    getCharacters,
    getProps,
    getMovementLabel,
    getField,
    getFirstFramePrompt,
    getLastFramePrompt,
  } = ctx

  const rows = []
  for (let i = 0; i < storyboards.length; i++) {
    const sb = storyboards[i]
    const sbId = sb.id
    const segmentTitle = cellText(sb.segment_title)
    const segmentIndex = sb.segment_index != null ? Number(sb.segment_index) + 1 : ''
    const segment = segmentTitle
      ? (segmentIndex ? t('exportStoryboard.actWithTitle', { index: segmentIndex, title: segmentTitle }) : segmentTitle)
      : (segmentIndex ? t('exportStoryboard.actWithoutTitle', { index: segmentIndex }) : '')

    const scene = getScene?.(sbId)
    const chars = getCharacters?.(sbId) || []
    const propList = getProps?.(sbId) || []

    rows.push([
      i + 1,
      sb.storyboard_number ?? i + 1,
      cellText(field(getField, sb, 'title')) || t('exportStoryboard.defaultShotTitle', { num: i + 1 }),
      segment,
      field(getField, sb, 'duration') || sb.duration || '',
      field(getField, sb, 'shot_type'),
      getMovementLabel?.(field(getField, sb, 'movement')) || field(getField, sb, 'movement'),
      scene ? sceneBlock(scene) : '',
      joinBlocks(chars.map(charBlock)),
      joinBlocks(propList.map(propBlock)),
      field(getField, sb, 'location'),
      field(getField, sb, 'time'),
      cellText(sb.description),
      field(getField, sb, 'dialogue'),
      field(getField, sb, 'narration'),
      field(getField, sb, 'action'),
      field(getField, sb, 'result'),
      field(getField, sb, 'atmosphere'),
      field(getField, sb, 'layout_description'),
      cellText(getFirstFramePrompt?.(sbId) ?? field(getField, sb, 'first_frame_prompt')),
      cellText(getLastFramePrompt?.(sbId) ?? field(getField, sb, 'last_frame_prompt')),
      field(getField, sb, 'polished_prompt') || cellText(sb.polished_prompt || sb.image_prompt),
      field(getField, sb, 'video_prompt') || cellText(sb.video_prompt),
      field(getField, sb, 'universal_segment_text'),
    ])
  }
  return rows
}

function formatExcelCellContent(s) {
  return escapeHtml(s).replace(/\n/g, '&#10;')
}

/**
 * Downloads storyboard data as Excel-compatible HTML (.xls).
 */
export function downloadStoryboardExcel(rows, filename) {
  const tdStyle = 'style="white-space:normal;vertical-align:top;mso-data-placement:same-cell;"'
  const columns = getStoryboardSheetColumns()
  const header = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const body = rows.map((row) => {
    const cells = row.map((c) => `<td ${tdStyle}>${formatExcelCellContent(c)}</td>`).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const sheetName = escapeHtml(t('exportStoryboard.sheetName'))
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${sheetName}</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Downloads storyboard data as CSV fallback.
 */
export function downloadStoryboardCsv(rows, filename) {
  const columns = getStoryboardSheetColumns()
  const lines = [
    columns.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportStoryboardSheet(ctx, filenameBase) {
  const rows = buildStoryboardSheetRows(ctx)
  if (!rows.length) return { ok: false, reason: 'empty' }
  const name = filenameBase || 'storyboard-sheet'
  try {
    downloadStoryboardExcel(rows, name)
    return { ok: true, count: rows.length }
  } catch (_) {
    downloadStoryboardCsv(rows, name)
    return { ok: true, count: rows.length, fallback: 'csv' }
  }
}
