const settingsService = require('../services/settingsService');
const response = require('../response');
const { loadConfig } = require('../config');
const { resolveVideoGenerationTimeoutMinutes } = require('../config/videoGeneration');

function getLanguage(cfg) {
  return (req, res) => {
    const language = settingsService.getLanguage(cfg);
    response.success(res, { language });
  };
}

function updateLanguage(cfg, log) {
  return (req, res) => {
    const lang = req.body?.language;
    if (lang !== 'zh' && lang !== 'en') {
      return response.badRequest(res, 'LANGUAGE_PARAM_INVALID');
    }
    const out = settingsService.updateLanguage(cfg, log, lang);
    if (!out.ok) return response.badRequest(res, out.error);
    const message = lang === 'en' ? 'Language switched to English' : '语言已切换为中文';
    response.success(res, { message, language: lang });
  };
}

function getContentLanguage(cfg) {
  return (req, res) => response.success(res, { language: settingsService.getContentLanguage(cfg) });
}

function updateContentLanguage(cfg, log) {
  return (req, res) => {
    const language = req.body?.language;
    const out = settingsService.updateContentLanguage(cfg, log, language);
    if (!out.ok) return response.badRequest(res, 'CONTENT_LANGUAGE_INVALID');
    response.success(res, { language });
  };
}

/** GET /settings/generation — 获取生成相关全局设置 */
function getGenerationSettings(db) {
  return (req, res) => {
    const concurrency = settingsService.getGlobalSetting(db, 'pipeline_concurrency', 3);
    const video_concurrency = settingsService.getGlobalSetting(db, 'pipeline_video_concurrency', 3);
    const video_generation_timeout_minutes = resolveVideoGenerationTimeoutMinutes(loadConfig());
    response.success(res, { concurrency, video_concurrency, video_generation_timeout_minutes });
  };
}

/** PUT /settings/generation — 更新生成相关全局设置 */
function updateGenerationSettings(db) {
  return (req, res) => {
    const { concurrency, video_concurrency } = req.body || {};
    if (concurrency !== undefined) {
      const n = Number(concurrency);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return response.badRequest(res, 'IMAGE_CONCURRENCY_INVALID');
      }
      settingsService.setGlobalSetting(db, 'pipeline_concurrency', n);
    }
    if (video_concurrency !== undefined) {
      const n = Number(video_concurrency);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return response.badRequest(res, 'VIDEO_CONCURRENCY_INVALID');
      }
      settingsService.setGlobalSetting(db, 'pipeline_video_concurrency', n);
    }
    const saved = settingsService.getGlobalSetting(db, 'pipeline_concurrency', 3);
    const saved_video = settingsService.getGlobalSetting(db, 'pipeline_video_concurrency', 3);
    const video_generation_timeout_minutes = resolveVideoGenerationTimeoutMinutes(loadConfig());
    response.success(res, {
      concurrency: saved,
      video_concurrency: saved_video,
      video_generation_timeout_minutes,
    });
  };
}

module.exports = function settingsRoutes(db, cfg, log) {
  return {
    getLanguage: getLanguage(cfg),
    updateLanguage: updateLanguage(cfg, log),
    getContentLanguage: getContentLanguage(cfg),
    updateContentLanguage: updateContentLanguage(cfg, log),
    getGenerationSettings: getGenerationSettings(db),
    updateGenerationSettings: updateGenerationSettings(db),
  };
};
