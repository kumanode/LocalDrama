const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFlow2ApiConfig,
  normalizeFlow2ApiImageAspectRatio,
  normalizeFlow2ApiVideoAspectRatio,
  normalizeFlow2ApiVideoDuration,
  planFlow2ApiVideoImages,
} = require('../src/services/flow2apiCompat');

describe('flow2api compat', () => {
  describe('isFlow2ApiConfig', () => {
    it('provider flow2api → true', () => {
      assert.equal(isFlow2ApiConfig({ provider: 'flow2api' }), true);
      assert.equal(isFlow2ApiConfig({ provider: 'Flow2API' }), true);
    });

    it('gemini + localhost base → true', () => {
      assert.equal(isFlow2ApiConfig({ api_protocol: 'gemini', base_url: 'http://127.0.0.1:8000' }), true);
      assert.equal(isFlow2ApiConfig({ api_protocol: 'gemini', base_url: 'http://localhost:8000' }), true);
      assert.equal(isFlow2ApiConfig({ api_protocol: 'gemini', base_url: 'http://localhost' }), true);
    });

    it('gemini + public base → false', () => {
      assert.equal(isFlow2ApiConfig({ api_protocol: 'gemini', base_url: 'https://generativelanguage.googleapis.com' }), false);
    });

    it('openai + localhost → false', () => {
      assert.equal(isFlow2ApiConfig({ api_protocol: 'openai', base_url: 'http://127.0.0.1:8000' }), false);
    });

    it('gemini + no base → false', () => {
      assert.equal(isFlow2ApiConfig({ api_protocol: 'gemini' }), false);
    });
  });

  describe('normalizeFlow2ApiImageAspectRatio', () => {
    it('支持的比例直接返回', () => {
      assert.equal(normalizeFlow2ApiImageAspectRatio('16:9'), '16:9');
      assert.equal(normalizeFlow2ApiImageAspectRatio('9:16'), '9:16');
      assert.equal(normalizeFlow2ApiImageAspectRatio('1:1'), '1:1');
      assert.equal(normalizeFlow2ApiImageAspectRatio('4:3'), '4:3');
      assert.equal(normalizeFlow2ApiImageAspectRatio('3:4'), '3:4');
    });

    it('不支持的比例映射到最近', () => {
      assert.equal(normalizeFlow2ApiImageAspectRatio('21:9'), '16:9');
      assert.equal(normalizeFlow2ApiImageAspectRatio('2:3'), '3:4');
      assert.equal(normalizeFlow2ApiImageAspectRatio('3:2'), '4:3');
      assert.equal(normalizeFlow2ApiImageAspectRatio('5:4'), '4:3');
      assert.equal(normalizeFlow2ApiImageAspectRatio('4:5'), '3:4');
    });

    it('Imagen 4 只接受 16:9 / 9:16', () => {
      assert.equal(normalizeFlow2ApiImageAspectRatio('1:1', 'imagen-4.0-generate-preview'), '16:9');
      assert.equal(normalizeFlow2ApiImageAspectRatio('4:3', 'Imagen 4'), '16:9');
      assert.equal(normalizeFlow2ApiImageAspectRatio('9:16', 'imagen'), '9:16');
    });

    it('像素格式转换', () => {
      assert.equal(normalizeFlow2ApiImageAspectRatio('1280x720'), '16:9');
      assert.equal(normalizeFlow2ApiImageAspectRatio('720x1280'), '9:16');
      assert.equal(normalizeFlow2ApiImageAspectRatio('1024x1024'), '1:1');
    });
  });

  describe('normalizeFlow2ApiVideoAspectRatio', () => {
    it('支持的比例直接返回', () => {
      assert.equal(normalizeFlow2ApiVideoAspectRatio('16:9'), '16:9');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('9:16'), '9:16');
    });

    it('竖屏比例 → 9:16', () => {
      assert.equal(normalizeFlow2ApiVideoAspectRatio('3:4'), '9:16');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('2:3'), '9:16');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('4:5'), '9:16');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('720x1280'), '9:16');
    });

    it('横屏比例 → 16:9', () => {
      assert.equal(normalizeFlow2ApiVideoAspectRatio('4:3'), '16:9');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('21:9'), '16:9');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('1:1'), '16:9');
      assert.equal(normalizeFlow2ApiVideoAspectRatio('1280x720'), '16:9');
    });
  });

  describe('normalizeFlow2ApiVideoDuration', () => {
    it('Veo 系列忽略时长 → null', () => {
      assert.equal(normalizeFlow2ApiVideoDuration(5, 'veo-3.1-generate-preview'), null);
      assert.equal(normalizeFlow2ApiVideoDuration(8, 'Veo 3.1 - Fast'), null);
      assert.equal(normalizeFlow2ApiVideoDuration(10, 'veo-3.0-fast-generate-preview'), null);
    });

    it('Omni 1.1 Flash 映射到 4/6/8/10', () => {
      assert.equal(normalizeFlow2ApiVideoDuration(3, 'Omni 1.1 Flash'), 4);
      assert.equal(normalizeFlow2ApiVideoDuration(5, 'omni-flash'), 4);
      assert.equal(normalizeFlow2ApiVideoDuration(6, 'Omni 1.1 Flash'), 6);
      assert.equal(normalizeFlow2ApiVideoDuration(7, 'omni'), 8);
      assert.equal(normalizeFlow2ApiVideoDuration(8, 'Omni 1.1 Flash'), 8);
      assert.equal(normalizeFlow2ApiVideoDuration(9, 'Omni 1.1 Flash'), 10);
      assert.equal(normalizeFlow2ApiVideoDuration(12, 'Omni 1.1 Flash'), 10);
    });

    it('Omni 1.2 Flash clamp 3–15', () => {
      assert.equal(normalizeFlow2ApiVideoDuration(2, 'Omni 1.2 Flash'), 3);
      assert.equal(normalizeFlow2ApiVideoDuration(5, 'omni-1.2-flash'), 5);
      assert.equal(normalizeFlow2ApiVideoDuration(12, 'Omni 1.2 Flash'), 12);
      assert.equal(normalizeFlow2ApiVideoDuration(15, 'Omni 1.2 Flash'), 15);
      assert.equal(normalizeFlow2ApiVideoDuration(20, 'Omni 1.2 Flash'), 15);
    });

    it('默认值：未识别模型按 Omni 1.2 宽区间', () => {
      assert.equal(normalizeFlow2ApiVideoDuration(undefined, 'unknown'), 8);
      assert.equal(normalizeFlow2ApiVideoDuration(null, 'custom'), 8);
      assert.equal(normalizeFlow2ApiVideoDuration(5, ''), 5);
    });
  });

  describe('planFlow2ApiVideoImages', () => {
    it('Veo 3.1 - Lite: 不支持尾帧和参考图', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Lite', { hasFirst: true, hasLast: true, refCount: 2 });
      assert.deepEqual(result, { useLastFrame: false, refLimit: 0 });
    });

    it('Veo 3.1 - Fast: 首帧 + 尾帧', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Fast', { hasFirst: true, hasLast: true, refCount: 0 });
      assert.deepEqual(result, { useLastFrame: true, refLimit: 0 });
    });

    it('Veo 3.1 - Fast: 首帧 + 3 参考图 → 最多 2 张', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Fast', { hasFirst: true, hasLast: false, refCount: 3 });
      assert.deepEqual(result, { useLastFrame: false, refLimit: 2 });
    });

    it('Veo 3.1 - Fast: 无首帧 + 3 参考图 → 最多 3 张', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Fast', { hasFirst: false, hasLast: false, refCount: 3 });
      assert.deepEqual(result, { useLastFrame: false, refLimit: 3 });
    });

    it('Veo 3.1 - Quality: 首帧 + 尾帧', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Quality', { hasFirst: true, hasLast: true, refCount: 0 });
      assert.deepEqual(result, { useLastFrame: true, refLimit: 0 });
    });

    it('Veo 3.1 - Quality: 首帧 + 2 参考图 → 最多 1 张', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Quality', { hasFirst: true, hasLast: false, refCount: 2 });
      assert.deepEqual(result, { useLastFrame: false, refLimit: 1 });
    });

    it('Veo 3.1 - Quality: 无首帧 + 参考图 → 0 张', () => {
      const result = planFlow2ApiVideoImages('Veo 3.1 - Quality', { hasFirst: false, hasLast: false, refCount: 2 });
      assert.deepEqual(result, { useLastFrame: false, refLimit: 0 });
    });

    it('Omni / 其他模型: 支持尾帧 + 最多 3 张参考图', () => {
      const resultOmni = planFlow2ApiVideoImages('Omni 1.1 Flash', { hasFirst: true, hasLast: true, refCount: 0 });
      assert.deepEqual(resultOmni, { useLastFrame: true, refLimit: 0 });

      const resultOmniRef = planFlow2ApiVideoImages('Omni 1.1 Flash', { hasFirst: true, hasLast: false, refCount: 5 });
      assert.deepEqual(resultOmniRef, { useLastFrame: false, refLimit: 3 });

      const resultUnknown = planFlow2ApiVideoImages('unknown-model', { hasFirst: true, hasLast: false, refCount: 2 });
      assert.deepEqual(resultUnknown, { useLastFrame: false, refLimit: 3 });
    });
  });

  describe('isOmni12 regex fix', () => {
    it('识别 omni-1.2-flash (带连字符)', () => {
      assert.equal(normalizeFlow2ApiVideoDuration(20, 'omni-1.2-flash'), 15);
      assert.equal(normalizeFlow2ApiVideoDuration(12, 'omni-1.2-flash'), 12);
    });
  });
});
