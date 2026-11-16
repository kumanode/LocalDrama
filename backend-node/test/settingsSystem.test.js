const test = require('node:test');
const assert = require('node:assert/strict');
const settingsRoutes = require('../src/routes/settings');

test('GET /settings/system reports ffmpeg status', () => {
  const routes = settingsRoutes({}, {}, {});
  let statusCode = 200;
  let responseData = null;

  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  routes.getSystemStatus({}, mockRes);
  assert.equal(statusCode, 200);
  assert.ok(responseData !== null);
  assert.equal(typeof responseData.data?.ffmpeg, 'boolean');
});
