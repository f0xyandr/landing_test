const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, mkdir, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server/app.cjs');

(async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'landing-ui-'));
  const { app, db } = await createApp({ dataDir, limit: 100 });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  await mkdir('artifacts', { recursive: true });
  try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
      if (process.env.PLAYWRIGHT_ENGINES && !process.env.PLAYWRIGHT_ENGINES.split(',').includes(name)) continue;
      const executablePath = process.env[`PLAYWRIGHT_${name.toUpperCase()}_EXECUTABLE_PATH`];
      const args = name === 'chromium' && process.env.PLAYWRIGHT_SINGLE_PROCESS ? ['--single-process', '--no-zygote'] : [];
      const browser = await engine.launch({ headless: true, timeout: 20000, args, ...(executablePath ? { executablePath } : {}) });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const width of [1440, 1024, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(url);
          await page.locator('h1').waitFor();
          await page.evaluate(() => Promise.all(Array.from(document.images).map(img => img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name} horizontal overflow at ${width}px`);
          assert.equal(await page.locator('main > section').count(), 5);
          assert.ok(await page.evaluate(() => Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)), `${name} broken image`);
          if (width === 390 || width === 1440) await page.screenshot({ path: `artifacts/${name}-${width}.png`, fullPage: true });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(url);
        const menu = page.getByRole('button', { name: 'Открыть меню' });
        await menu.click();
        await page.getByRole('navigation').getByRole('link', { name: 'Программа', exact: true }).click();
        await page.waitForURL('**/#program');
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        await page.locator('.program-cta .button').click();
        await page.waitForURL('**/#registration');
        await page.getByLabel('Ваше имя').fill('Browser Guest');
        const phone = `+79991112${name === 'chromium' ? '201' : name === 'firefox' ? '202' : '203'}`;
        await page.getByLabel('Номер телефона').fill(phone);
        await page.getByRole('radio', { name: 'Telegram' }).check();
        await page.getByRole('button', { name: 'политике конфиденциальности' }).click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        await page.getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Забронировать место', exact: true }).click();
        await page.getByRole('heading', { name: 'Ваша заявка принята' }).waitFor();
        assert.equal(await db.countAsync({ phone }), 1);
        assert.deepEqual(errors, [], `${name} browser errors`);
        console.log(`${name}: layouts, menu, policy, and real database submission passed`);
      } finally { await browser.close(); }
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
