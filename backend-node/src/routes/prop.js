const propService = require('../services/propService');
const propLibraryService = require('../services/propLibraryService');
const response = require('../response');

function listProps(db) {
  return (req, res) => {
    const props = propService.listByDramaId(db, req.params.id);
    response.success(res, props);
  };
}

function createProp(db, log) {
  return (req, res) => {
    const body = req.body || {};
    if (!body.drama_id || !body.name) return response.badRequest(res, 'DRAMA_ID_AND_NAME_REQUIRED');
    try {
      const prop = propService.create(db, log, body);
      response.created(res, prop);
    } catch (err) {
      log.errorw('Create prop failed', { error: err.message });
      response.internalError(res, 'CREATE_FAILED');
    }
  };
}

function updateProp(db, log) {
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const prop = propService.update(db, log, id, req.body || {});
    if (!prop) return response.notFound(res, 'PROP_NOT_FOUND');
    response.success(res, prop);
  };
}

function deleteProp(db, log) {
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const ok = propService.deleteById(db, log, id);
    if (!ok) return response.notFound(res, 'PROP_NOT_FOUND');
    response.success(res, { message: '删除成功' });
  };
}

function generateImage(db, log) {
  const propImageGenerationService = require('../services/propImageGenerationService');
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const model = req.body?.model != null ? String(req.body.model).trim() || null : null;
    const style = req.body?.style != null ? String(req.body.style).trim() || null : null;
    try {
      const taskId = propImageGenerationService.generatePropImage(db, log, id, { model, style });
      response.success(res, { task_id: taskId });
    } catch (err) {
      if (err.message === 'Prop not found' || err.message === '道具不存在') return response.notFound(res, 'PROP_NOT_FOUND');
      if (err.message === 'Prop has no image prompt' || err.message === '道具没有图片提示词') return response.badRequest(res, 'PROMPT_REQUIRED');
      log.error('generatePropImage failed', { error: err.message });
      response.internalError(res, 'GENERATION_FAILED', err.message || 'Generation failed');
    }
  };
}

function extractProps(db, log, cfg) {
  const propExtractionService = require('../services/propExtractionService');
  return (req, res) => {
    const episodeId = req.params.episode_id;
    if (!episodeId) return response.badRequest(res, 'EPISODE_ID_REQUIRED');
    try {
      const taskId = propExtractionService.extractPropsForEpisode(db, log, episodeId, cfg);
      response.success(res, { task_id: taskId });
    } catch (err) {
      if (err.message === 'episode not found' || err.message?.includes('剧本内容为空')) {
        return response.badRequest(res, err.message);
      }
      log.error('extractProps failed', { error: err.message });
      response.internalError(res, 'EXTRACTION_FAILED', err.message || 'Extraction failed');
    }
  };
}

function associateProps(db, log) {
  return (req, res) => {
    const storyboardId = parseInt(req.params.id, 10);
    const propIds = Array.isArray(req.body?.prop_ids) ? req.body.prop_ids : [];
    propService.associateWithStoryboard(db, log, storyboardId, propIds);
    response.success(res, { message: '关联成功' });
  };
}

function addToLibrary(db, log) {
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const out = propLibraryService.addPropToLibrary(db, log, id);
    if (!out.ok) {
      if (out.error === 'prop not found') return response.notFound(res, 'PROP_NOT_FOUND');
      if (out.error === 'unauthorized') return response.forbidden(res, 'FORBIDDEN');
      return response.badRequest(res, out.error);
    }
    response.success(res, { message: '已加入本剧道具库', item: out.item });
  };
}

function addToMaterialLibrary(db, log) {
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const out = propLibraryService.addPropToMaterialLibrary(db, log, id);
    if (!out.ok) {
      if (out.error === 'prop not found') return response.notFound(res, 'PROP_NOT_FOUND');
      return response.badRequest(res, out.error);
    }
    response.success(res, { message: '已加入全局素材库', item: out.item });
  };
}

function getPropById(db, log) {
  return (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    const prop = propService.getById(db, id);
    if (!prop) return response.notFound(res, 'PROP_NOT_FOUND');
    response.success(res, { prop });
  };
}

function generatePropPrompt(db, log, cfg) {
  return async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    try {
      const body = req.body || {};
      const out = await propService.generatePropPromptOnly(db, log, cfg, id, body.model || undefined, body.style || undefined);
      if (!out.ok) {
        if (out.error === 'prop not found') return response.notFound(res, 'PROP_NOT_FOUND');
        return response.badRequest(res, out.error);
      }
      response.success(res, { message: '提示词已生成', prompt: out.prompt });
    } catch (err) {
      log.error('generatePropPrompt failed', { error: err.message });
      response.internalError(res, err.message);
    }
  };
}

function extractPropFromImage(db, log, cfg) {
  return async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return response.badRequest(res, 'INVALID_ID');
    try {
      const out = await propService.extractPropFromImage(db, log, cfg, id);
      if (!out.ok) {
        if (out.error === 'prop not found') return response.notFound(res, 'PROP_NOT_FOUND');
        return response.badRequest(res, out.error);
      }
      response.success(res, { message: '道具描述已提取', description: out.description });
    } catch (err) {
      log.error('extractPropFromImage failed', { error: err.message });
      response.internalError(res, err.message);
    }
  };
}

module.exports = function propRoutes(db, log, cfg) {
  return {
    listProps: listProps(db),
    createProp: createProp(db, log),
    updateProp: updateProp(db, log),
    deleteProp: deleteProp(db, log),
    getPropById: getPropById(db, log),
    generateImage: generateImage(db, log),
    generatePropPrompt: generatePropPrompt(db, log, cfg),
    extractProps: extractProps(db, log, cfg),
    associateProps: associateProps(db, log),
    addToLibrary: addToLibrary(db, log),
    addToMaterialLibrary: addToMaterialLibrary(db, log),
    extractPropFromImage: extractPropFromImage(db, log, cfg),
  };
};
