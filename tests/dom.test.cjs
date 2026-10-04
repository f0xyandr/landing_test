const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { once } = require('node:events');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');

async function waitFor(predicate, message) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(message);
}

test('built React mounts five sections and submits the actual form to Express', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'landing-dom-'));
  const { app, db } = await createApp({ dataDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let dom;
  try {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    dom = await JSDOM.fromURL(`http://127.0.0.1:${server.address().port}`, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole });
    const { window } = dom;
    const doc = window.document;
    await waitFor(() => doc.querySelector('h1'), 'React did not mount');
    assert.equal(doc.querySelectorAll('main > section').length, 5);
    assert.ok(Array.from(doc.querySelectorAll('a.button')).every(a => a.getAttribute('href') === '#registration'));
    const menu = doc.querySelector('.menu-toggle');
    menu.click(); assert.equal(menu.getAttribute('aria-expanded'), 'true');
    doc.querySelector('.navigation a').click(); assert.equal(menu.getAttribute('aria-expanded'), 'false');
    doc.querySelector('.policy-link').click();
    assert.ok(doc.querySelector('[role="dialog"]'));
    await waitFor(() => doc.activeElement === doc.querySelector('.modal-close'), 'Policy did not receive focus');
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.ok(!doc.querySelector('[role="dialog"]'));
    assert.ok(doc.activeElement === doc.querySelector('.policy-link'));
    const set = (name, value) => {
      const input = doc.querySelector(`input[name="${name}"]`);
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    set('name', 'DOM Guest'); set('phone', '+79991234567');
    doc.querySelector('input[name="consent"]').click();
    doc.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => doc.querySelector('.success-state'), 'Form did not show success');
    assert.equal(await db.countAsync({ phone: '+79991234567', name: 'DOM Guest', consent: true }), 1);
    assert.deepEqual(errors, []);
  } finally {
    if (dom) dom.window.close();
    await new Promise(resolve => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});
