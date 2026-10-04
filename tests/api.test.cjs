const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createApp } = require('../server/app.cjs');

async function start(options) {
  const { app, db } = await createApp(options);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { db, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

test('registration validates input, handles concurrent duplicates, and survives reopening the database', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'landing-api-'));
  let runtime;
  try {
    runtime = await start({ dataDir, limit: 100 });
    const send = body => fetch(`${runtime.url}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const valid = { name: 'Тестовый Гость', phone: '+7 (999) 111-22-33', consent: true, messenger: 'telegram' };
    assert.equal((await send({ ...valid, consent: false })).status, 400);
    assert.equal((await send({ ...valid, name: '$bad' })).status, 400);
    assert.equal((await send({ ...valid, phone: 'invalid' })).status, 400);
    assert.equal((await send({ ...valid, messenger: 'other' })).status, 400);
    assert.equal((await send({ ...valid, website: 'bot' })).status, 400);
    assert.equal((await send(null)).status, 400);
    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => send({ ...valid, phone: i % 2 ? '89991112233' : valid.phone })));
    assert.ok(responses.every(r => r.status === 201));
    assert.equal(await runtime.db.countAsync({}), 1);
    const record = await runtime.db.findOneAsync({ phone: '+79991112233' });
    assert.equal(record.name, valid.name);
    assert.equal(record.messenger, 'telegram');
    assert.ok(record.createdAt instanceof Date);
    assert.equal((await fetch(`${runtime.url}/api/registrations`)).status, 404);
    const malformed = await fetch(`${runtime.url}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(`${runtime.url}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...valid, name: 'a'.repeat(10000) }) });
    assert.equal(oversized.status, 413);
    await runtime.close(); runtime = undefined;
    runtime = await start({ dataDir });
    assert.equal(await runtime.db.countAsync({}), 1);
    assert.equal((await runtime.db.findOneAsync({ phone: '+79991112233' })).consent, true);
  } finally { if (runtime) await runtime.close(); await rm(dataDir, { recursive: true, force: true }); }
});

test('rate limit protects registration and a write failure does not return success', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'landing-limit-'));
  const runtime = await start({ dataDir, limit: 2 });
  try {
    const send = () => fetch(`${runtime.url}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Guest', phone: '+79991112244', consent: true }) });
    runtime.db.insertAsync = async () => { throw new Error('Simulated storage failure'); };
    assert.equal((await send()).status, 500);
    assert.equal((await send()).status, 500);
    const limited = await send();
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('retry-after'));
    assert.equal(await runtime.db.countAsync({}), 0);
  } finally { await runtime.close(); await rm(dataDir, { recursive: true, force: true }); }
});
