const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const Database = require('better-sqlite3')

const taskService = require('../src/services/taskService')
const videoService = require('../src/services/videoService')
const videoRoutes = require('../src/routes/videos')
const taskRoutes = require('../src/routes/task')

const log = { info() {}, warn() {}, error() {}, errorw() {}, warnw() {}, infow() {} }

function createDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE dramas (id INTEGER PRIMARY KEY, title TEXT, metadata TEXT, deleted_at TEXT);
    CREATE TABLE episodes (id INTEGER PRIMARY KEY, drama_id INTEGER, deleted_at TEXT);
    CREATE TABLE storyboards (id INTEGER PRIMARY KEY, episode_id INTEGER, seed INTEGER, deleted_at TEXT);
    CREATE TABLE props (id INTEGER PRIMARY KEY, drama_id INTEGER);
    CREATE TABLE scenes (id INTEGER PRIMARY KEY, drama_id INTEGER);
    CREATE TABLE characters (id INTEGER PRIMARY KEY, drama_id INTEGER);
    CREATE TABLE async_tasks (
      id TEXT PRIMARY KEY, type TEXT, status TEXT, progress INTEGER, message TEXT, error TEXT, result TEXT,
      resource_id TEXT, created_at TEXT, updated_at TEXT, completed_at TEXT, deleted_at TEXT
    );
    CREATE TABLE video_generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, drama_id INTEGER, storyboard_id INTEGER, provider TEXT, prompt TEXT,
      model TEXT, duration INTEGER, aspect_ratio TEXT, resolution TEXT, seed INTEGER, camera_fixed INTEGER,
      watermark INTEGER, image_url TEXT, first_frame_url TEXT, last_frame_url TEXT, reference_image_urls TEXT,
      status TEXT, task_id TEXT, created_at TEXT, updated_at TEXT
    );
  `)
  return db
}

function mockRes() {
  const res = { statusCode: 0, body: null, req: { headers: { 'accept-language': 'en' } } }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.body = body; return res }
  return res
}

describe('video generation seed', () => {
  let db
  const original = {}

  beforeEach(() => {
    db = createDb()
    db.prepare('INSERT INTO dramas (id, title) VALUES (1, ?)').run('d')
    db.prepare('INSERT INTO episodes (id, drama_id) VALUES (10, 1)').run()
    original.process = videoService.processVideoGeneration
    original.getById = videoService.getById
    videoService.processVideoGeneration = () => {}
    videoService.getById = (_db, id) => db.prepare('SELECT * FROM video_generations WHERE id = ?').get(id)
  })

  afterEach(() => {
    videoService.processVideoGeneration = original.process
    videoService.getById = original.getById
  })

  async function create(body) {
    const res = mockRes()
    videoRoutes(db, log).create({ body }, res)
    // The route schedules processing with setImmediate; let it run against the stub before it is restored.
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(res.statusCode, 201, JSON.stringify(res.body))
    return res.body.data
  }

  it('uses the storyboard seed when the request has none', async () => {
    db.prepare('INSERT INTO storyboards (id, episode_id, seed) VALUES (5, 10, 4242)').run()
    assert.equal((await create({ drama_id: 1, storyboard_id: 5, prompt: 'p' })).seed, 4242)
  })

  it('lets an explicit request seed override the storyboard seed', async () => {
    db.prepare('INSERT INTO storyboards (id, episode_id, seed) VALUES (5, 10, 4242)').run()
    assert.equal((await create({ drama_id: 1, storyboard_id: 5, prompt: 'p', seed: 7 })).seed, 7)
  })

  it('keeps seed 0 as a valid explicit seed', async () => {
    db.prepare('INSERT INTO storyboards (id, episode_id, seed) VALUES (5, 10, 4242)').run()
    assert.equal((await create({ drama_id: 1, storyboard_id: 5, prompt: 'p', seed: 0 })).seed, 0)
  })

  it('leaves the seed empty when neither the request nor the storyboard has one', async () => {
    db.prepare('INSERT INTO storyboards (id, episode_id, seed) VALUES (5, 10, NULL)').run()
    assert.equal((await create({ drama_id: 1, storyboard_id: 5, prompt: 'p' })).seed, null)
  })

  it('ignores invalid seeds', async () => {
    assert.equal((await create({ drama_id: 1, prompt: 'p', seed: -3 })).seed, null)
  })
})

describe('task center: drama resolution and retry', () => {
  let db

  beforeEach(() => {
    db = createDb()
    db.prepare('INSERT INTO episodes (id, drama_id) VALUES (10, 3)').run()
    db.prepare('INSERT INTO storyboards (id, episode_id) VALUES (20, 10)').run()
    db.prepare('INSERT INTO props (id, drama_id) VALUES (30, 3)').run()
    db.prepare('INSERT INTO characters (id, drama_id) VALUES (40, 3)').run()
    db.prepare('INSERT INTO scenes (id, drama_id) VALUES (50, 3)').run()
  })

  it('resolves the owning drama for every task type', () => {
    const cases = [
      ['story_generation', '3'],
      ['character_generation', '3'],
      ['storyboard_generation', '10'],
      ['background_extraction', '10'],
      ['prop_extraction', '10'],
      ['video_merge', '10'],
      ['frame_prompt_generation', '20'],
      ['prop_image_generation', '30'],
      ['image_generation', 'character_40'],
      ['image_generation', 'scene_50'],
      ['image_generation', '3'],
    ]
    for (const [type, resourceId] of cases) {
      const task = taskService.createTask(db, log, type, resourceId)
      assert.equal(taskService.resolveDramaId(db, task), 3, `${type} (${resourceId})`)
    }
  })

  it('resolves a video task through its video_generations row, not its resource_id', () => {
    const task = taskService.createTask(db, log, 'video_generation', '999')
    db.prepare('INSERT INTO video_generations (drama_id, task_id) VALUES (3, ?)').run(task.id)
    assert.equal(taskService.resolveDramaId(db, task), 3)
  })

  it('returns null when the resource cannot be resolved', () => {
    const task = taskService.createTask(db, log, 'storyboard_generation', '12345')
    assert.equal(taskService.resolveDramaId(db, task), null)
  })

  it('exposes drama_id in the recent task list', () => {
    taskService.createTask(db, log, 'prop_extraction', '10')
    assert.equal(taskService.getRecentTasks(db)[0].drama_id, 3)
  })

  function retry(taskId) {
    const res = mockRes()
    taskRoutes(db, log).retryTaskStatus({ params: { task_id: taskId } }, res)
    return res
  }

  it('rejects retry for unknown, non-failed and non-video tasks', () => {
    assert.equal(retry('nope').statusCode, 404)

    const running = taskService.createTask(db, log, 'video_generation', '3')
    assert.equal(retry(running.id).body.error.code, 'TASK_NOT_FAILED')

    const story = taskService.createTask(db, log, 'story_generation', '3')
    taskService.updateTaskError(db, story.id, 'boom')
    assert.equal(retry(story.id).body.error.code, 'TASK_RETRY_UNSUPPORTED')
  })

  it('resumes the video row that belongs to the failed task', () => {
    const task = taskService.createTask(db, log, 'video_generation', '3')
    taskService.updateTaskError(db, task.id, 'boom')
    db.prepare('INSERT INTO video_generations (id, drama_id, task_id) VALUES (3, 8, ?)').run(task.id)

    const original = videoService.resumeFailedVideoPoll
    let resumedId = null
    videoService.resumeFailedVideoPoll = (_db, _log, id) => {
      resumedId = id
      return { ok: true, item: { id } }
    }
    try {
      const res = retry(task.id)
      assert.equal(res.statusCode, 200)
      // resource_id is the drama id (999-style collisions must not matter): the video row id is looked up by task_id.
      assert.equal(resumedId, 3)
    } finally {
      videoService.resumeFailedVideoPoll = original
    }
  })

  it('reports a localized error when the video cannot be resumed', () => {
    const task = taskService.createTask(db, log, 'video_generation', '3')
    taskService.updateTaskError(db, task.id, 'boom')
    db.prepare('INSERT INTO video_generations (drama_id, task_id) VALUES (3, ?)').run(task.id)

    const original = videoService.resumeFailedVideoPoll
    videoService.resumeFailedVideoPoll = () => ({ ok: false, status: 400, error: '仅失败的视频任务可继续查询' })
    try {
      const res = retry(task.id)
      assert.equal(res.statusCode, 400)
      assert.equal(res.body.error.code, 'VIDEO_RESUME_UNAVAILABLE')
      assert.doesNotMatch(res.body.error.message, /[一-鿿]/)
    } finally {
      videoService.resumeFailedVideoPoll = original
    }
  })
})
