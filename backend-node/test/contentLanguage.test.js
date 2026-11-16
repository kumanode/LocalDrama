const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const promptI18n = require('../src/services/promptI18n')
const aiClient = require('../src/services/aiClient')

const cfgFor = (content, ui = 'zh') => ({ app: { language: ui, content_language: content } })

describe('content language', () => {
  it('content_language wins over the UI language', () => {
    assert.equal(promptI18n.isEnglish(cfgFor('zh', 'en')), false)
    assert.equal(promptI18n.isEnglish(cfgFor('en', 'zh')), true)
  })

  it('falls back to the UI language when content_language is unset', () => {
    assert.equal(promptI18n.isEnglish({ app: { language: 'en' } }), true)
    assert.equal(promptI18n.isEnglish({ app: { language: 'zh' } }), false)
  })

  it('Indonesian uses the English templates, never the Chinese ones', () => {
    const cfg = cfgFor('id')
    assert.equal(promptI18n.isEnglish(cfg), true)
    for (const text of [
      promptI18n.getCharacterExtractionPrompt(cfg),
      promptI18n.getStoryboardSystemPrompt(cfg),
      promptI18n.getStoryExpansionSystemPrompt(cfg, 1),
      promptI18n.getFirstFramePrompt(cfg),
    ]) {
      assert.doesNotMatch(text, /[一-鿿]/, 'Indonesian prompts must not contain Chinese instructions')
    }
  })

  it('only Indonesian gets an output-language directive', () => {
    assert.match(promptI18n.getContentLanguageDirective(cfgFor('id')), /Bahasa Indonesia/)
    assert.equal(promptI18n.getContentLanguageDirective(cfgFor('en')), '')
    assert.equal(promptI18n.getContentLanguageDirective(cfgFor('zh')), '')
  })

  it('aiClient exposes a runtime config hook instead of re-reading the YAML file', () => {
    assert.equal(typeof aiClient.setRuntimeConfig, 'function')
  })
})
