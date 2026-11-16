const response = require('../response');

function writeSse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function writeAgentEvent(res, event, errorCode) {
  if (event?.type === 'error') {
    writeSse(res, { type: 'error', code: event.code || errorCode });
    return;
  }
  writeSse(res, event);
}

function beginSse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

let runtimeModule;

function loadRuntime() {
  if (!runtimeModule) {
    runtimeModule = import('../mastra/index.mjs').catch((err) => {
      console.warn('agent runtime unavailable', err.message);
      return null;
    });
  }
  return runtimeModule;
}

function defaultRuntime() {
  return {
    isAgentReady() {
      return loadRuntime().then((mod) => (mod && mod.isAgentReady ? mod.isAgentReady() : false));
    },
    streamChat(args) {
      return loadRuntime().then((mod) => mod.streamChat(args));
    },
    resumeApproval(args) {
      return loadRuntime().then((mod) => mod.resumeApproval(args));
    },
    getHistory(dramaId) {
      return loadRuntime().then((mod) => mod.getHistory(dramaId));
    },
  };
}

function createAgentHandlers(db, log, runtime) {
  const api = runtime || defaultRuntime();

  async function chat(req, res) {
    if (!(await api.isAgentReady())) return response.serviceUnavailable(res, 'SERVICE_UNAVAILABLE');
    const { validateChatBody } = await import('../mastra/context.mjs');
    const parsed = validateChatBody(db, req.body || {});
    if (!parsed.ok) return response.badRequest(res, parsed.message);
    const { resolveTextModel } = await import('../mastra/model.mjs');
    const model = resolveTextModel(db);
    if (!model.ok) return response.badRequest(res, model.error);
    beginSse(res);
    try {
      await api.streamChat({
        dramaId: parsed.dramaId,
        episodeId: parsed.episodeId,
        message: req.body.message,
        writeEvent(event) { writeAgentEvent(res, event, 'DIALOGUE_FAILED'); },
      });
    } catch (err) {
      log.error?.('Agent chat failed', { message: err?.message });
      writeAgentEvent(res, { type: 'error' }, 'DIALOGUE_FAILED');
    }
    if (!res.writableEnded) res.end();
  }

  async function decide(req, res, approved) {
    if (!(await api.isAgentReady())) return response.serviceUnavailable(res, 'SERVICE_UNAVAILABLE');
    const body = req.body || {};
    const dramaId = Number(body.dramaId);
    const history = await api.getHistory(dramaId);
    const pending = history && Array.isArray(history.pendingApprovals) ? history.pendingApprovals : [];
    const owned = pending.some((item) => item.runId === body.runId && item.toolCallId === body.toolCallId);
    if (!owned) return response.notFound(res, 'CONFIRMATION_NOT_FOUND');
    beginSse(res);
    try {
      await api.resumeApproval({
        dramaId,
        runId: body.runId,
        toolCallId: body.toolCallId,
        approved,
        writeEvent(event) { writeAgentEvent(res, event, 'CONFIRMATION_FAILED'); },
      });
    } catch (err) {
      log.error?.('Agent approval failed', { message: err?.message });
      writeAgentEvent(res, { type: 'error' }, 'CONFIRMATION_FAILED');
    }
    if (!res.writableEnded) res.end();
  }

  async function history(req, res) {
    if (!(await api.isAgentReady())) return response.serviceUnavailable(res, 'SERVICE_UNAVAILABLE');
    const data = await api.getHistory(Number(req.query.dramaId));
    response.success(res, data);
  }

  return {
    chat,
    approve: (req, res) => decide(req, res, true),
    decline: (req, res) => decide(req, res, false),
    history,
  };
}

module.exports = { createAgentHandlers };
