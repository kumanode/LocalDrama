/**
 * Pipeline readiness checks and cost estimation helpers.
 */

/** Price per call the user configured in AI settings, or null when none is set (we never invent a price). */
function parseConfigCost(cfg, fallback = null) {
  if (!cfg) return fallback
  if (cfg.settings) {
    try {
      const s = typeof cfg.settings === 'string' ? JSON.parse(cfg.settings) : cfg.settings
      if (s && s.cost_per_call != null && !Number.isNaN(Number(s.cost_per_call))) {
        return Math.max(0, Number(s.cost_per_call))
      }
    } catch (_) {}
  }
  return fallback
}

export function calculatePipelineReadiness({
  currentEpisodeId = null,
  scriptContent = '',
  aiConfigs = [],
  systemStatus = null,
  characters = [],
  storyboards = [],
} = {}) {
  const configs = Array.isArray(aiConfigs) ? aiConfigs : []
  const hasText = configs.some((c) => c.service_type === 'text' && c.is_active !== false)
  const hasImage = configs.some((c) => (c.service_type === 'image' || c.service_type === 'storyboard_image') && c.is_active !== false)
  const hasVideo = configs.some((c) => c.service_type === 'video' && c.is_active !== false)

  const chars = Array.isArray(characters) ? characters : []
  const sbs = Array.isArray(storyboards) ? storyboards : []

  // Character references: check if characters have primary images
  let characterRefsReady = true
  if (chars.length > 0) {
    const charsWithoutImage = chars.filter((c) => !c.image_url && !c.local_path)
    if (charsWithoutImage.length > 0) {
      // If storyboards exist, only fail if any storyboard references these characters
      if (sbs.length > 0) {
        const missingIds = new Set(charsWithoutImage.map((c) => String(c.id)))
        const anyRefMissing = sbs.some((sb) => {
          const charIds = Array.isArray(sb.character_ids)
            ? sb.character_ids
            : String(sb.characters || '').split(/[,，]/).map((s) => s.trim())
          return charIds.some((id) => missingIds.has(String(id)))
        })
        characterRefsReady = !anyRefMissing
      } else {
        characterRefsReady = false
      }
    }
  }

  const episode = Boolean(currentEpisodeId)
  const script = Boolean(String(scriptContent || '').trim())
  const models = hasText && hasImage && hasVideo
  const ffmpeg = Boolean(systemStatus?.ffmpeg)

  return {
    episode,
    script,
    models,
    ffmpeg,
    characterRefs: characterRefsReady,
    isReady: episode && script && models,
  }
}

export function calculatePipelineCost({
  storyboards = [],
  characters = [],
  scenes = [],
  aiConfigs = [],
  // Optional predicates: media may live outside the storyboard row (per-shot image/video maps), so callers can say what counts as "already generated".
  hasShotImage = (sb) => Boolean(sb.image_url || sb.composed_image),
  hasShotVideo = (sb) => Boolean(sb.video_url),
  // Planned shot count, used before any storyboard exists.
  expectedShotCount = null,
} = {}) {
  const sbs = Array.isArray(storyboards) ? storyboards : []
  const chars = Array.isArray(characters) ? characters : []
  const scns = Array.isArray(scenes) ? scenes : []
  const configs = Array.isArray(aiConfigs) ? aiConfigs : []

  const defaultTextCfg = configs.find((c) => c.service_type === 'text' && c.is_default) || configs.find((c) => c.service_type === 'text')
  const defaultImgCfg = configs.find((c) => (c.service_type === 'storyboard_image' || c.service_type === 'image') && c.is_default) || configs.find((c) => c.service_type === 'image')
  const defaultVidCfg = configs.find((c) => c.service_type === 'video' && c.is_default) || configs.find((c) => c.service_type === 'video')

  const textPrice = parseConfigCost(defaultTextCfg)
  const imagePrice = parseConfigCost(defaultImgCfg)
  const videoPrice = parseConfigCost(defaultVidCfg)

  const planned = Number(expectedShotCount)
  const plannedShots = Number.isFinite(planned) && planned > 0 ? Math.floor(planned) : 0
  const shotsKnown = sbs.length > 0
  // Before the storyboard exists the shot count is unknown, so the figure is a lower bound.
  const partial = !shotsKnown && plannedShots === 0

  const textCalls = (shotsKnown ? 0 : 1) + (chars.length > 0 ? 0 : 1)
  const shotImagesMissing = shotsKnown ? sbs.filter((sb) => !hasShotImage(sb)).length : plannedShots
  const charImagesMissing = chars.filter((c) => !c.image_url && !c.local_path).length
  const sceneImagesMissing = scns.filter((s) => !s.image_url && !s.local_path).length
  const imageCalls = shotImagesMissing + charImagesMissing + sceneImagesMissing
  const videoCalls = shotsKnown ? sbs.filter((sb) => !hasShotVideo(sb)).length : plannedShots

  const money = (calls, price) => (price == null ? null : Number((calls * price).toFixed(3)))
  const textCost = money(textCalls, textPrice)
  const imageCost = money(imageCalls, imagePrice)
  const videoCost = money(videoCalls, videoPrice)
  const priced = textPrice != null || imagePrice != null || videoPrice != null
  const totalCost = priced ? Number(((textCost || 0) + (imageCost || 0) + (videoCost || 0)).toFixed(2)) : null

  return {
    textCalls,
    imageCalls,
    videoCalls,
    totalCalls: textCalls + imageCalls + videoCalls,
    textPrice,
    imagePrice,
    videoPrice,
    textCost,
    imageCost,
    videoCost,
    totalCost,
    priced,
    partial,
  }
}
