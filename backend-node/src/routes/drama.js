const dramaService = require('../services/dramaService');
const propService = require('../services/propService');
const response = require('../response');
const dramaExportService = require('../services/dramaExportService');
const dramaImportService = require('../services/dramaImportService');

function createDrama(db, log) {
  return (req, res) => {
    const body = req.body || {};
    if (!body.title || String(body.title).trim() === '') {
      return response.badRequest(res, 'TITLE_REQUIRED');
    }
    try {
      const drama = dramaService.createDrama(db, log, body);
      response.created(res, drama);
    } catch (err) {
      log.error('Create drama failed', { error: err.message, stack: err.stack });
      response.internalError(res, 'CREATE_FAILED', err.message || 'Creation failed');
    }
  };
}

function getDrama(db, cfg) {
  return (req, res) => {
    const drama = dramaService.getDrama(db, req.params.id, cfg?.storage?.base_url);
    if (!drama) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, drama);
  };
}

function listDramas(db, log) {
  return (req, res) => {
    const page = req.query.page || 1;
    const page_size = req.query.page_size || 20;
    const status = req.query.status || '';
    const genre = req.query.genre || '';
    const keyword = req.query.keyword || '';
    try {
      const { dramas, total, page: p, pageSize: ps } = dramaService.listDramas(db, {
        page,
        page_size,
        status,
        genre,
        keyword,
      });
      response.successWithPagination(res, dramas, total, p, ps);
    } catch (err) {
      log.errorw('List dramas failed', { error: err.message });
      response.internalError(res, 'FETCH_LIST_FAILED');
    }
  };
}

function updateDrama(db, log) {
  return (req, res) => {
    const drama = dramaService.updateDrama(db, log, req.params.id, req.body || {});
    if (!drama) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, drama);
  };
}

function deleteDrama(db, log) {
  return (req, res) => {
    const ok = dramaService.deleteDrama(db, log, req.params.id);
    if (!ok) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, { message: '删除成功' });
  };
}

function getDramaStats(db, log) {
  return (req, res) => {
    try {
      const stats = dramaService.getDramaStats(db);
      response.success(res, stats);
    } catch (err) {
      log.errorw('Get drama stats failed', { error: err.message });
      response.internalError(res, 'FETCH_STATS_FAILED');
    }
  };
}

function saveOutline(db, log) {
  return (req, res) => {
    const ok = dramaService.saveOutline(db, log, req.params.id, req.body || {});
    if (!ok) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, { message: '保存成功' });
  };
}

function getCharacters(db) {
  return (req, res) => {
    const characters = dramaService.getCharacters(db, req.params.id, req.query.episode_id);
    if (characters === null) return response.notFound(res, 'DRAMA_OR_CHAPTER_NOT_FOUND');
    response.success(res, characters);
  };
}

function saveCharacters(db, log) {
  return (req, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.characters)) return response.badRequest(res, 'CHARACTERS_ARRAY_REQUIRED');
    const ok = dramaService.saveCharacters(db, log, req.params.id, body);
    if (!ok) return response.notFound(res, 'DRAMA_OR_CHAPTER_NOT_FOUND');
    response.success(res, { message: '保存成功' });
  };
}

function saveEpisodes(db, log) {
  return (req, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.episodes)) return response.badRequest(res, 'EPISODES_ARRAY_REQUIRED');
    const ok = dramaService.saveEpisodes(db, log, req.params.id, body);
    if (!ok) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, { message: '保存成功' });
  };
}

function saveProgress(db, log) {
  return (req, res) => {
    const body = req.body || {};
    if (!body.current_step) return response.badRequest(res, 'CURRENT_STEP_REQUIRED');
    const ok = dramaService.saveProgress(db, log, req.params.id, body);
    if (!ok) return response.notFound(res, 'DRAMA_NOT_FOUND');
    response.success(res, { message: '保存成功' });
  };
}

function saveCanvasLayout(db, log) {
  return (req, res) => {
    try {
      const updated = dramaService.saveCanvasLayout(db, log, req.params.id, req.body || {});
      if (!updated) return response.notFound(res, 'DRAMA_NOT_FOUND');
      response.success(res, updated);
    } catch (err) {
      if (err.code === 'BAD_REQUEST') return response.badRequest(res, err.message);
      log.error('Save canvas layout failed', { error: err.message });
      response.internalError(res, 'SAVE_CANVAS_LAYOUT_FAILED', err.message || 'Save canvas layout failed');
    }
  };
}

function listProps(db) {
  return (req, res) => {
    const props = propService.listByDramaId(db, req.params.id);
    response.success(res, props);
  };
}

function finalizeEpisode(db, log, cfg) {
  return (req, res) => {
    const episodeId = req.params.episode_id;
    if (!episodeId) return response.badRequest(res, 'EPISODE_ID_REQUIRED');
    const baseUrl = cfg?.storage?.base_url || '';
    const result = dramaService.finalizeEpisode(db, log, episodeId, baseUrl, req.body || {});
    if (!result) return response.notFound(res, 'EPISODE_NOT_FOUND');
    response.success(res, result);
  };
}

function downloadEpisodeVideo(db) {
  return (req, res) => {
    const episodeId = req.params.episode_id;
    if (!episodeId) return response.badRequest(res, 'EPISODE_ID_REQUIRED');
    const result = dramaService.downloadEpisodeVideo(db, episodeId);
    if (!result) return response.notFound(res, 'EPISODE_NOT_FOUND');
    if (result.error) return response.badRequest(res, result.error);
    response.success(res, result);
  };
}

function exportDrama(db, cfg, log) {
  return (req, res) => {
    try {
      const { buffer, title } = dramaExportService.exportDrama(db, cfg, log, req.params.id);
      const safeName = (title || 'drama').replace(/[^\w\u4e00-\u9fff\-]/g, '_').slice(0, 50);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}.zip`);
      res.send(buffer);
    } catch (err) {
      log.error('Export drama failed', { error: err.message });
      response.internalError(res, 'EXPORT_FAILED', err.message || 'Export failed');
    }
  };
}

function importDrama(db, cfg, log) {
  return (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return response.badRequest(res, 'ZIP_FILE_REQUIRED');
      }
      const result = dramaImportService.importDrama(db, cfg, log, req.file.buffer);
      response.created(res, result);
    } catch (err) {
      log.error('Import drama failed', { error: err.message });
      if (err.message && (err.message.includes('格式') || err.message.includes('缺少') || err.message.includes('损坏'))) {
        return response.badRequest(res, err.message);
      }
      response.internalError(res, 'IMPORT_FAILED', err.message || 'Import failed');
    }
  };
}

function getExampleDramaDir() {
  const path = require('path');
  const fs = require('fs');
  if (process.env.EXAMPLE_DRAMA_PATH && fs.existsSync(process.env.EXAMPLE_DRAMA_PATH)) {
    return process.env.EXAMPLE_DRAMA_PATH;
  }
  const devPath = path.join(__dirname, '..', '..', '..', 'example_drama');
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

function listExamples(log) {
  return (_req, res) => {
    const fs = require('fs');
    const dir = getExampleDramaDir();
    if (!dir) return response.success(res, []);
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.zip'));
      const items = files.map(f => {
        const name = f.replace(/\.zip$/, '');
        return { filename: f, name };
      });
      response.success(res, items);
    } catch (err) {
      log.error('List examples failed', { error: err.message });
      response.success(res, []);
    }
  };
}

function importExample(db, cfg, log) {
  return (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const filename = req.body?.filename;
    if (!filename) return response.badRequest(res, 'EXAMPLE_FILENAME_REQUIRED');
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return response.badRequest(res, 'FILENAME_INVALID');
    }
    const dir = getExampleDramaDir();
    if (!dir) return response.badRequest(res, 'EXAMPLE_DIR_NOT_FOUND');
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) return response.notFound(res, 'EXAMPLE_FILE_NOT_FOUND');
    try {
      const buffer = fs.readFileSync(filePath);
      const result = dramaImportService.importDrama(db, cfg, log, buffer);
      response.created(res, result);
    } catch (err) {
      log.error('Import example failed', { error: err.message });
      response.internalError(res, 'IMPORT_EXAMPLE_FAILED', err.message || 'Import example failed');
    }
  };
}

function generateStoryboard(db, log) {
  return async (req, res) => {
    const body = req.body || {};
    try {
      // 显式处理 model 为空的情况，转为 undefined 以便 service 层触发默认逻辑
      const model = (body.model && String(body.model).trim()) ? body.model : undefined;
      log.info('Generate storyboard request', { episode_id: req.params.episode_id, storyboard_count: body.storyboard_count, video_duration: body.video_duration });
      const resData = await dramaService.generateStoryboard(db, log, req.params.episode_id, {
        model: model,
        style: body.style,
        storyboard_count: body.storyboard_count,
        video_duration: body.video_duration,
        aspect_ratio: body.aspect_ratio,
        include_narration: body.include_narration,
        universal_omni_storyboard: body.universal_omni_storyboard,
      });
      response.success(res, resData);
    } catch (err) {
      log.error('Generate storyboard failed', { error: err.message });
      response.internalError(res, 'GENERATE_STORYBOARDS_FAILED', err.message || 'Generate storyboards failed');
    }
  };
}

module.exports = function dramaRoutes(db, cfg, log) {
  return {
    createDrama: createDrama(db, log),
    getDrama: getDrama(db, cfg),
    listDramas: listDramas(db, log),
    updateDrama: updateDrama(db, log),
    deleteDrama: deleteDrama(db, log),
    getDramaStats: getDramaStats(db, log),
    saveOutline: saveOutline(db, log),
    getCharacters: getCharacters(db),
    saveCharacters: saveCharacters(db, log),
    saveEpisodes: saveEpisodes(db, log),
    saveProgress: saveProgress(db, log),
    saveCanvasLayout: saveCanvasLayout(db, log),
    listProps: listProps(db),
    finalizeEpisode: finalizeEpisode(db, log, cfg),
    downloadEpisodeVideo: downloadEpisodeVideo(db),
    generateStoryboard: generateStoryboard(db, log),
    exportDrama: exportDrama(db, cfg, log),
    importDrama: importDrama(db, cfg, log),
    listExamples: listExamples(log),
    importExample: importExample(db, cfg, log),
  };
};
