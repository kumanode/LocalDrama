const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createAgentHandlers } = require('../src/routes/agent');
const { createAgentTestDb, seedTwoDramas } = require('./helpers/agentTestDb');

describe('agent sse', () => {
  it('maps known chunks and ignores unknown ones', async () => {
    const { toAgentSseEvent } = await import('../src/mastra/sse.mjs');
    assert.deepEqual(toAgentSseEvent({ type: 'text-delta', textDelta: '你' }), { type: 'text-delta', text: '你' });
    assert.deepEqual(toAgentSseEvent({ type: 'text-delta', payload: { text: '好' } }), { type: 'text-delta', text: '好' });
    assert.equal(toAgentSseEvent({ type: 'unknown' }), null);
  });
});

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    chunks: '',
    writableEnded: false,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {},
    write(chunk) { this.chunks += chunk; return true; },
    end() { this.writableEnded = true; },
  };
}

describe('agent routes', () => {
  it('sends localized error codes over SSE instead of provider error text', async () => {
    const db = createAgentTestDb();
    seedTwoDramas(db);
    db.prepare(`INSERT INTO ai_service_configs
      (id, service_type, base_url, api_key, model, default_model, is_default, is_active)
      VALUES (1, 'text', 'http://localhost/v1', 'test-key', '["test-model"]', 'test-model', 1, 1)`).run();
    const runtime = {
      isAgentReady: () => true,
      streamChat: async () => { throw new Error('模型服务失败'); },
      resumeApproval: async () => { throw new Error('确认执行失败'); },
      getHistory: async () => ({ messages: [], pendingApprovals: [{ runId: 'run-1', toolCallId: 'call-1' }] }),
    };
    const handlers = createAgentHandlers(db, console, runtime);
    const chatRes = mockRes();
    await handlers.chat({ body: { dramaId: 1, episodeId: 11, message: 'hello' } }, chatRes);
    assert.match(chatRes.chunks, /"code":"DIALOGUE_FAILED"/);
    assert.doesNotMatch(chatRes.chunks, /模型服务失败/);

    const approveRes = mockRes();
    await handlers.approve({ body: { dramaId: 1, runId: 'run-1', toolCallId: 'call-1' } }, approveRes);
    assert.match(approveRes.chunks, /"code":"CONFIRMATION_FAILED"/);
    assert.doesNotMatch(approveRes.chunks, /确认执行失败/);
    db.close();
  });

  it('answers before the assistant is ready and keeps drama checks', async () => {
    const db = createAgentTestDb();
    seedTwoDramas(db);
    const calls = [];
    const runtime = {
      isAgentReady: () => false,
      streamChat: async () => calls.push('stream'),
      resumeApproval: async () => calls.push('resume'),
      getHistory: async () => ({ messages: [], pendingApprovals: [] }),
    };
    const handlers = createAgentHandlers(db, console, runtime);
    const closed = mockRes();
    await handlers.chat({ body: { dramaId: 1, message: '你好' } }, closed);
    assert.equal(closed.statusCode, 503);
    assert.equal(closed.body.error.message, '助手未就绪');
    assert.deepEqual(calls, []);

    const ready = {
      ...runtime,
      isAgentReady: () => true,
    };
    const open = createAgentHandlers(db, console, ready);
    const missing = mockRes();
    await open.chat({ body: { dramaId: 99, message: '你好' } }, missing);
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.body.error.message, '项目不存在');

    const noModel = mockRes();
    await open.chat({ body: { dramaId: 1, message: '你好' } }, noModel);
    assert.equal(noModel.statusCode, 400);
    assert.equal(noModel.body.error.message, '请先在 AI 配置里添加文本模型');

    const declined = mockRes();
    await open.approve({ body: { dramaId: 1, runId: 'other-run', toolCallId: 'call-1' } }, declined);
    assert.equal(declined.statusCode, 404);
    assert.deepEqual(calls, []);

    const historyRuntime = {
      isAgentReady: () => true,
      getHistory: async () => ({ messages: [], pendingApprovals: [{ runId: 'run-1', toolCallId: 'call-1' }] }),
    };
    const listed = mockRes();
    await createAgentHandlers(db, console, historyRuntime).history({ query: { dramaId: '1' } }, listed);
    assert.equal(listed.body.data.pendingApprovals[0].runId, 'run-1');
  });

  it('ships the short-drama skill and copies the skills folder', () => {
    const skill = fs.readFileSync(path.join(__dirname, '../skills/short-drama/SKILL.md'), 'utf8');
    assert.match(skill, /name: short-drama/);
    for (const name of [
      'get_current_project', 'generate_story', 'save_episode_script', 'generate_characters',
      'update_character', 'generate_scenes', 'update_scene', 'generate_storyboards',
      'update_storyboard', 'generate_image', 'get_task', 'delete_item',
    ]) {
      assert.match(skill, new RegExp(name));
    }
    assert.match(skill, /没有出视频、导入导出、道具、新建或删除整部剧的工具/);
    const copy = fs.readFileSync(path.join(__dirname, '../../desktop/scripts/copy-backend.js'), 'utf8');
    assert.match(copy, /'skills'/);
  });
});
