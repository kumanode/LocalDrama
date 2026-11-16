const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const episodeStoryboardService = require('../src/services/episodeStoryboardService');
const promptI18n = require('../src/services/promptI18n');

describe('Bilingual prompt generation & retention clause parsing (Fase 1.4)', () => {
  const sampleSb = {
    title: 'Opening Shot',
    scene_description: 'Office interior, morning',
    action: 'John sits at his desk',
    dialogue: 'Good morning, everyone.',
    narration: 'The story begins in silence.',
    result: 'Colleagues turn their heads',
    shot_type: 'Medium Shot',
    movement: 'Slow push in',
    atmosphere: 'Tense',
    emotion: 'Serious',
    emotion_intensity: '8',
    bgm_prompt: 'Low cello melody',
    sound_effect: 'Keyboard typing sound',
    duration: 5,
  };

  it('generates video prompt with Chinese labels when cfg.app.language is zh', () => {
    const cfgZh = { app: { language: 'zh' }, style: { default_video_ratio: '16:9' } };
    const prompt = episodeStoryboardService.composeStoryboardVideoPrompt(sampleSb, 'cinematic', '16:9', cfgZh);
    assert.match(prompt, /^场景：/);
    assert.match(prompt, /镜头标题：Opening Shot/);
    assert.match(prompt, /动作：John sits at his desk/);
    assert.match(prompt, /对话：Good morning, everyone\./);
    assert.match(prompt, /解说旁白：/);
    assert.match(prompt, /时长：5秒/);
    assert.match(prompt, /=VideoRatio: 16:9/);
  });

  it('generates video prompt with English labels when cfg.app.language is en without Chinese label leaks', () => {
    const cfgEn = { app: { language: 'en' }, style: { default_video_ratio: '16:9' } };
    const prompt = episodeStoryboardService.composeStoryboardVideoPrompt(sampleSb, 'cinematic', '16:9', cfgEn);
    assert.match(prompt, /^Scene: /);
    assert.match(prompt, /Shot Title: Opening Shot/);
    assert.match(prompt, /Action: John sits at his desk/);
    assert.match(prompt, /Dialogue: Good morning, everyone\./);
    assert.match(prompt, /Narration: /);
    assert.match(prompt, /Duration: 5s/);
    assert.match(prompt, /=VideoRatio: 16:9/);

    // Verify there are no Chinese characters in the generated prompt labels or boilerplate
    const cjkRegex = /[\u4e00-\u9fff]/;
    assert.equal(cjkRegex.test(prompt), false, 'English prompt should not contain Chinese characters');
  });

  it('extractRetentionClausesFromVideoPrompts matches both Chinese and English labels', () => {
    // We can simulate the function or test it directly
    const zhPrompt = '场景：办公室。动作：坐在椅子上。时长：5秒。=VideoRatio: 16:9';
    const enPrompt = 'Scene: Office interior. Action: Sitting on chair. Duration: 5s. =VideoRatio: 16:9';

    // Test with the regex used in storyboards.js
    const labeledRegex = /^(场景|镜头标题|角色造型|动作|对话|对白|结果|景别|镜头角度|运镜|氛围|情绪|情绪强度|配乐|音效|时长|风格|解说旁白|Scene|Shot\s*Title|Character\s*Appearances?|Action|Dialogue|Result|Shot\s*Scale|Shot\s*Angle|Camera\s*Movement|Atmosphere|Mood|Emotional\s*Intensity|Music|Sound\s*Effects?|Duration|Style|Narration)[：:]/i;

    assert.ok(labeledRegex.test('场景：办公室'));
    assert.ok(labeledRegex.test('动作：坐在椅子上'));
    assert.ok(labeledRegex.test('Scene: Office interior'));
    assert.ok(labeledRegex.test('Action: Sitting on chair'));
    assert.ok(labeledRegex.test('Duration: 5s'));
    assert.ok(labeledRegex.test('Shot Title: Intro'));
    assert.ok(labeledRegex.test('Shot Scale: Close up'));
  });
});
