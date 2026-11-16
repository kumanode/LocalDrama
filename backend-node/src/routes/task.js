const taskService = require('../services/taskService');
const videoService = require('../services/videoService');
const response = require('../response');

function getTaskStatus(db, log) {
  return (req, res) => {
    const task = taskService.getTask(db, req.params.task_id);
    if (!task) return response.notFound(res, 'TASK_NOT_FOUND');
    response.success(res, task);
  };
}

function getResourceTasks(db, log) {
  return (req, res) => {
    const resourceId = req.query.resource_id;
    try {
      const tasks = resourceId
        ? taskService.getTasksByResource(db, resourceId)
        : taskService.getRecentTasks(db, req.query.limit);
      response.success(res, tasks);
    } catch (err) {
      log.errorw('Get resource tasks failed', { error: err.message });
      response.internalError(res, err.message);
    }
  };
}

function cancelTaskStatus(db, log) {
  return (req, res) => {
    try {
      const result = taskService.cancelTask(db, log, req.params.task_id, req.body?.reason);
      if (!result.ok && result.reason === 'not_found') {
        return response.notFound(res, 'TASK_NOT_FOUND');
      }
      response.success(res, result.task || { id: req.params.task_id });
    } catch (err) {
      log.errorw('Cancel task failed', { error: err.message, task_id: req.params.task_id });
      response.internalError(res, err.message);
    }
  };
}

/** Retry a failed task. Only video polling can be resumed server-side; other types are redone from their page. */
function retryTaskStatus(db, log) {
  return (req, res) => {
    try {
      const task = taskService.getTask(db, req.params.task_id);
      if (!task) return response.notFound(res, 'TASK_NOT_FOUND');
      if (task.status !== 'failed') return response.badRequest(res, 'TASK_NOT_FAILED');
      if (task.type !== 'video_generation') return response.badRequest(res, 'TASK_RETRY_UNSUPPORTED');
      const row = db.prepare('SELECT id FROM video_generations WHERE task_id = ?').get(task.id);
      if (!row) return response.badRequest(res, 'TASK_RETRY_UNSUPPORTED');
      const result = videoService.resumeFailedVideoPoll(db, log, row.id);
      if (!result.ok) {
        if (result.status === 404) return response.notFound(res, 'VIDEO_RECORD_NOT_FOUND');
        return response.badRequest(res, 'VIDEO_RESUME_UNAVAILABLE');
      }
      response.success(res, { task: taskService.getTask(db, task.id), video: result.item });
    } catch (err) {
      log.errorw('Retry task failed', { error: err.message, task_id: req.params.task_id });
      response.internalError(res, err.message);
    }
  };
}

module.exports = function taskRoutes(db, log) {
  return {
    getTaskStatus: getTaskStatus(db, log),
    getResourceTasks: getResourceTasks(db, log),
    cancelTaskStatus: cancelTaskStatus(db, log),
    retryTaskStatus: retryTaskStatus(db, log),
  };
};
