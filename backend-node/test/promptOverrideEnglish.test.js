const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const promptI18n = require('../src/services/promptI18n')
const { getPromptDefinitions } = require('../src/routes/promptOverrides')

const EN_CFG = { app: { language: 'en' }, style: { default_style_en: 'Anime', default_image_ratio: '16:9' } }
const ZH_RE = /[一-鿿]/

const KEYS = [
  'story_expansion_system',
  'storyboard_system',
  'character_extraction',
  'scene_extraction',
  'prop_extraction',
  'storyboard_user_suffix',
  'first_frame_prompt',
  'key_frame_prompt',
  'last_frame_prompt',
]

const BUILDERS = {
  story_expansion_system: (cfg) => promptI18n.getStoryExpansionSystemPrompt(cfg, 1),
  storyboard_system: (cfg) => promptI18n.getStoryboardSystemPrompt(cfg),
  character_extraction: (cfg) => promptI18n.getCharacterExtractionPrompt(cfg),
  scene_extraction: (cfg) => promptI18n.getSceneExtractionPrompt(cfg, 'Anime'),
  prop_extraction: (cfg) => promptI18n.getPropExtractionPrompt(cfg),
  storyboard_user_suffix: (cfg) => promptI18n.getStoryboardUserPromptSuffix(cfg, null),
  first_frame_prompt: (cfg) => promptI18n.getFirstFramePrompt(cfg),
  key_frame_prompt: (cfg) => promptI18n.getKeyFramePrompt(cfg),
  last_frame_prompt: (cfg) => promptI18n.getLastFramePrompt(cfg),
}

describe('prompt overrides in English mode', () => {
  afterEach(() => {
    for (const k of KEYS) promptI18n.clearOverrideInMemory(k)
  })

  for (const key of KEYS) {
    it(`${key}: user override replaces the editable body in English`, () => {
      const marker = `CUSTOM-BODY-${key}`
      promptI18n.setOverrideInMemory(key, marker)
      const out = BUILDERS[key](EN_CFG)
      assert.ok(out.includes(marker), 'override must be used when language is en')
    })

    it(`${key}: English default is split into body and locked tail without Chinese`, () => {
      const body = promptI18n.getDefaultPromptBody(key, 'en')
      assert.ok(body && body.length > 50)
      assert.ok(!ZH_RE.test(body), 'English default body must not contain Chinese')
      assert.ok(!ZH_RE.test(promptI18n.getLockedSuffix(key, 'en') || ''), 'English locked suffix must not contain Chinese')
    })
  }

  it('keeps the locked output contract when an override is active', () => {
    promptI18n.setOverrideInMemory('character_extraction', 'My own character rules')
    const out = promptI18n.getCharacterExtractionPrompt(EN_CFG)
    assert.match(out, /Return ONLY a valid JSON array/)
    assert.doesNotMatch(out, /professional character analyst/)
  })

  it('defaults are unchanged when no override is set', () => {
    const out = promptI18n.getCharacterExtractionPrompt(EN_CFG)
    assert.match(out, /professional character analyst/)
  })

  it('route definitions are localized by request language', () => {
    const en = getPromptDefinitions('en')
    const zh = getPromptDefinitions('zh')
    assert.equal(en.length, zh.length)
    for (const d of en) {
      assert.ok(!ZH_RE.test(d.label + d.description), `${d.key} label/description must be English`)
    }
    assert.ok(zh.every((d) => ZH_RE.test(d.label)), 'zh definitions keep Chinese labels')
  })
})
