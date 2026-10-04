const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { once } = require('node:events');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');

async function waitFor(predicate) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Admin did not display expected state');
}

test('admin lists full details without login, paginates, and refreshes saved data', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'landing-admin-'));
  const { app, db } = await createApp({ dataDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  let dom;
  try {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    dom = await JSDOM.fromURL(`${url}/admin`, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole });
    const doc = dom.window.document;
    await waitFor(() => doc.querySelector('.admin-empty'));
    await db.insertAsync(Array.from({ length: 51 }, (_, i) => ({ name: `Guest ${i}`, phone: `+7999${String(i).padStart(7, '0')}`, messenger: 'whatsapp', consent: true, consentVersion: '1', createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)) })));
    const response = await fetch(`${url}/api/admin/registrations?page=1`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const first = await response.json();
    assert.equal(first.total, 51);
    assert.equal(first.items.length, 50);
    assert.equal(first.items[0].name, 'Guest 50');
    assert.ok(first.items[0].createdAt && first.items[0]._id && first.items[0].phone);
    const second = await (await fetch(`${url}/api/admin/registrations?page=2`)).json();
    assert.equal(second.items.length, 1);
    assert.equal(second.items[0].name, 'Guest 0');
    for (const page of ['0', '-1', 'abc', '1.5']) assert.equal((await fetch(`${url}/api/admin/registrations?page=${page}`)).status, 400);
    doc.querySelector('.admin-header button').click();
    await waitFor(() => doc.querySelectorAll('.registration-card').length === 50);
    const card = doc.querySelector('.registration-card');
    assert.equal(card.querySelector('h2').textContent, 'Guest 50');
    assert.ok(card.textContent.includes('WhatsApp'));
    assert.ok(card.textContent.includes('Получено'));
    assert.equal(card.querySelector('time').getAttribute('datetime'), first.items[0].createdAt);
    assert.ok(doc.querySelector('.admin-summary').textContent.includes('51'));
    const next = Array.from(doc.querySelectorAll('.admin-pagination button')).find(b => b.textContent.includes('Далее'));
    next.click();
    await waitFor(() => doc.querySelectorAll('.registration-card').length === 1);
    assert.equal(doc.querySelector('.registration-card h2').textContent, 'Guest 0');
    assert.deepEqual(errors, []);
  } finally {
    if (dom) dom.window.close();
    await new Promise(resolve => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
