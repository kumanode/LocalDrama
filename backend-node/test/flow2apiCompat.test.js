const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFlow2ApiConfig,
  normalizeFlow2ApiImageAspectRatio,
  normalizeFlow2ApiVideoAspectRatio,
  normalizeFlow2ApiVideoDuration,
  planFlow2ApiVideoImages,
} = require('../src/services/flow2apiCompat');
const videoClient = require('../src/services/videoClient');
const aiConfigService = require('../src/services/aiConfigService');

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

    it('provider gemini/google + empty api_protocol + localhost base → true', () => {
      assert.equal(isFlow2ApiConfig({ provider: 'gemini', base_url: 'http://127.0.0.1:8000' }), true);
      assert.equal(isFlow2ApiConfig({ provider: 'google', base_url: 'http://localhost:8000' }), true);
      assert.equal(isFlow2ApiConfig({ provider: 'gemini', base_url: 'https://generativelanguage.googleapis.com' }), false);
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

  describe('callVideoApi flow2api request payload', () => {
    const originalListConfigs = aiConfigService.listConfigs;
    const originalFetch = global.fetch;
    const dummyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const noopLog = { info() {}, warn() {}, error() {}, debug() {} };

    function mockFlow2ApiConfig(modelName) {
      return [{
        id: 99,
        service_type: 'video',
        is_active: true,
        is_default: true,
        provider: 'flow2api',
        base_url: 'http://127.0.0.1:8000',
        api_key: 'flow-key',
        model: [modelName],
        default_model: modelName,
      }];
    }

    afterEach(() => {
      aiConfigService.listConfigs = originalListConfigs;
      global.fetch = originalFetch;
    });

    it('Veo 3.1 - Lite: 过滤尾帧与参考图，不发 durationSeconds，竖屏比例归一为 9:16', async () => {
      let calledUrl = '';
      let calledBody = null;
      global.fetch = async (url, options) => {
        calledUrl = String(url);
        calledBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: 'operations/veo-lite-task-1' }),
        };
      };

      aiConfigService.listConfigs = () => mockFlow2ApiConfig('Veo 3.1 - Lite');

      const result = await videoClient.callVideoApi(null, noopLog, {
        prompt: '测试 Lite',
        model: 'Veo 3.1 - Lite',
        duration: 5,
        aspect_ratio: '3:4',
        image_url: dummyPng,
        last_frame_url: dummyPng,
        reference_urls: [dummyPng, dummyPng],
        video_gen_id: 101,
      });

      assert.equal(result.error, undefined);
      assert.equal(result.task_id, 'operations/veo-lite-task-1');
      assert.match(calledUrl, /\/v1beta\/models\/Veo%203\.1%20-%20Lite:predictLongRunning/);
      assert.equal(calledBody.instances.length, 1);
      const inst = calledBody.instances[0];
      assert.ok(inst.image);
      assert.equal(inst.lastFrame, undefined);
      assert.equal(inst.referenceImages, undefined);
      assert.equal(calledBody.parameters.aspectRatio, '9:16');
      assert.equal(calledBody.parameters.durationSeconds, undefined);
    });

    it('Veo 3.1 - Fast: 首帧 + 3参考图 → 截断为 2 张参考图', async () => {
      let calledBody = null;
      global.fetch = async (url, options) => {
        calledBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: 'operations/veo-fast-task-1' }),
        };
      };

      aiConfigService.listConfigs = () => mockFlow2ApiConfig('Veo 3.1 - Fast');

      const result = await videoClient.callVideoApi(null, noopLog, {
        prompt: '测试 Fast 参考图',
        model: 'Veo 3.1 - Fast',
        duration: 8,
        aspect_ratio: '16:9',
        image_url: dummyPng,
        reference_urls: [dummyPng, dummyPng, dummyPng],
        video_gen_id: 102,
      });

      assert.equal(result.error, undefined);
      assert.equal(result.task_id, 'operations/veo-fast-task-1');
      const inst = calledBody.instances[0];
      assert.ok(inst.image);
      assert.equal(inst.lastFrame, undefined);
      assert.equal(inst.referenceImages?.length, 2);
      assert.equal(calledBody.parameters.aspectRatio, '16:9');
      assert.equal(calledBody.parameters.durationSeconds, undefined);
    });

    it('Veo 3.1 - Fast: 首帧 + 尾帧 + 参考图 → 优先尾帧，忽略参考图', async () => {
      let calledBody = null;
      global.fetch = async (url, options) => {
        calledBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: 'operations/veo-fast-task-2' }),
        };
      };

      aiConfigService.listConfigs = () => mockFlow2ApiConfig('Veo 3.1 - Fast');

      const result = await videoClient.callVideoApi(null, noopLog, {
        prompt: '测试 Fast 首尾帧',
        model: 'Veo 3.1 - Fast',
        aspect_ratio: '16:9',
        image_url: dummyPng,
        last_frame_url: dummyPng,
        reference_urls: [dummyPng],
        video_gen_id: 103,
      });

      assert.equal(result.error, undefined);
      assert.equal(result.task_id, 'operations/veo-fast-task-2');
      const inst = calledBody.instances[0];
      assert.ok(inst.image);
      assert.ok(inst.lastFrame);
      assert.equal(inst.referenceImages, undefined);
    });

    it('Omni 1.2 Flash: 发送规范化后的 durationSeconds', async () => {
      let calledBody = null;
      global.fetch = async (url, options) => {
        calledBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: 'operations/omni-task-1' }),
        };
      };

      aiConfigService.listConfigs = () => mockFlow2ApiConfig('Omni 1.2 Flash');

      const result = await videoClient.callVideoApi(null, noopLog, {
        prompt: '测试 Omni 1.2',
        model: 'Omni 1.2 Flash',
        duration: 20, // 超出 15 秒上限，应 clamp 到 15
        aspect_ratio: '16:9',
        image_url: dummyPng,
        video_gen_id: 104,
      });

      assert.equal(result.error, undefined);
      assert.equal(result.task_id, 'operations/omni-task-1');
      assert.equal(calledBody.parameters.durationSeconds, 15);
    });
  });
});
