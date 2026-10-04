const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createRequestLogger } = require('../server/request-logger.cjs');

test('request logger prints method, status, path and duration once, with optional colors', () => {
  const lines = [];
  const res = new EventEmitter();
  res.statusCode = 201; res.writableFinished = true;
  let continued = false;
  createRequestLogger(line => lines.push(line), false)({ method: 'POST', path: '/api/registrations' }, res, () => { continued = true; });
  res.emit('finish'); res.emit('close');
  assert.ok(continued);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /POST\s+201\s+\/api\/registrations\s+\d+\.\d ms/);
  assert.ok(!lines[0].includes('\u001b'));
  const aborted = new EventEmitter();
  aborted.statusCode = 200; aborted.writableFinished = false;
  createRequestLogger(line => lines.push(line), true)({ method: 'GET', path: '/test\nspoof' }, aborted, () => {});
  aborted.emit('close');
  assert.ok(lines[1].includes('\u001b[31mABORT'));
  assert.ok(!lines[1].includes('\n'));
});
