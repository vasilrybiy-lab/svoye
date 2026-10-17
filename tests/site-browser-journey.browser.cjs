'use strict';
// Browser-only QA of the actual, locally built site. No real users, webhooks,
// Telegram sends, database requests or real personal data.
// Run: node --test tests/site-browser-journey.browser.cjs
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('playwright');

const origin = 'http://127.0.0.1:4318';
let server;
let browser;
let stderr = '';

before(async () => {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4318'], {
    cwd: process.cwd(),
    env: { ...process.env, SVOYE_HANDOFF_BOT_READY: 'false', SVOYE_HANDOFF_WEBHOOK_URL: '', SVOYE_HANDOFF_WEBHOOK_SECRET: '', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', part => { stderr += String(part).slice(0, 2000); });
  let ready = false;
  for (let i = 0; i < 65; i++) {
    if (server.exitCode !== null) break;
    try {
      const r = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (r.ok) { ready = true; break; }
    } catch { /* next is not ready yet */ }
    await delay(350);
  }
  assert.ok(ready, 'Next test server did not become ready: ' + stderr.slice(-900));
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
});

after(async () => {
  if (browser) await browser.close();
  if (server && server.exitCode === null) server.kill('SIGTERM');
});

function observe(page) {
  const jsErrors = [];
  let handoffPosts = 0;
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('request', request => {
    if (request.url().includes('/api/website-handoff') && request.method() === 'POST') handoffPosts++;
  });
  return { jsErrors, get handoffPosts() { return handoffPosts; } };
}

async function assertNoHorizontalOverflow(page, name) {
  const size = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    window: window.innerWidth,
  }));
  assert.ok(size.doc <= size.window + 2 && size.body <= size.window + 2,
    name + ': unexpected horizontal scrolling ' + JSON.stringify(size));
}

test('390px mobile: teen → actual micro-trial → reflection → summary → manual Telegram copy', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'uk-UA',
  });
  const page = await context.newPage();
  const seen = observe(page);
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    assert.match(await page.title(), /Своє/);
    assert.equal(await page.locator('#contact').count(), 1);
    assert.equal(await page.locator('#trials').count(), 1);
    assert.equal(await page.locator('.v2-telegram-entry').first().getAttribute('href'),
      'https://t.me/svoe_live_bot?start=site_teen');
    await assertNoHorizontalOverflow(page, 'mobile home');

    await page.getByRole('button', { name: /Я з батьків/ }).click();
    assert.equal(await page.locator('.v2-parent-first .v2-telegram-entry').getAttribute('href'),
      'https://t.me/svoe_live_bot?start=site_parent');
    await page.getByRole('button', { name: /Я школяр/ }).click();

    await page.locator('.v2-direction-list button').first().click();
    assert.equal(await page.locator('.v2-task-select').count(), 1);
    await page.locator('#v2-notes').fill('QA: вигадана ідея — дослідити світло');
    await assertNoHorizontalOverflow(page, 'mobile task');
    await page.getByRole('button', { name: /Перейти до рефлексії/ }).click();

    assert.equal(await page.locator('.v2-skip').count(), 3);
    assert.equal(await page.getByRole('button', { name: /^Далі/ }).isDisabled(), true);
    for (let n = 0; n < 3; n++) await page.locator('.v2-skip').nth(n).click();
    assert.equal(await page.getByRole('button', { name: /^Далі/ }).isEnabled(), true);
    await page.getByRole('button', { name: /^Далі/ }).click();

    await page.getByLabel('Складнощів не було').check();
    await page.getByRole('button', { name: /^Далі/ }).click();
    assert.equal(await page.locator('.v2-skip').count(), 2);
    for (let n = 0; n < 2; n++) await page.locator('.v2-skip').nth(n).click();
    await page.getByRole('button', { name: /Побачити підсумок/ }).click();

    assert.match(await page.locator('.v2-handoff').innerText(), /Автоматичну передачу підсумку ще налаштовуємо/);
    assert.equal(await page.locator('.v2-handoff-simple a').getAttribute('href'),
      'https://t.me/svoe_live_bot?start=site_trial');
    assert.equal(await page.locator('.v2-consent').count(), 0);
    await page.locator('.v2-handoff-preview summary').click();
    const summary = await page.locator('.v2-handoff-preview-text').innerText();
    assert.match(summary, /QA: вигадана ідея — дослідити світло/);
    assert.match(summary, /Одна проба не визначає професію/);
    await page.locator('.v2-copy-button').click();
    const copied = await page.locator('.v2-copy-button').innerText();
    const fallback = await page.locator('#v2-copy-fallback').count();
    assert.ok(/скопійовано/i.test(copied) || fallback === 1,
      'Copy should succeed or provide a selectable textarea');
    if (fallback) assert.match(await page.locator('#v2-copy-fallback').inputValue(), /вигадана ідея/);
    await assertNoHorizontalOverflow(page, 'mobile summary');
    assert.equal(seen.handoffPosts, 0, 'No website handoff POST without feature readiness');
    assert.deepEqual(seen.jsErrors, [], 'No uncaught client-side errors');
  } finally {
    await context.close();
  }
});

test('360px mobile: home anchors, menu and parental section avoid horizontal overflow', async () => {
  const context = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const seen = observe(page);
  try {
    await page.goto(origin + '/');
    await page.getByRole('button', { name: /Я з батьків/ }).click();
    await assertNoHorizontalOverflow(page, 'small-screen parent home');
    await page.goto(origin + '/parents');
    assert.equal(await page.locator('a[href="https://t.me/svoe_live_bot?start=site_parent"]').count() > 0, true);
    await assertNoHorizontalOverflow(page, 'small-screen parents page');
    await page.goto(origin + '/approach');
    for (const id of ['experience', 'conversation', 'skills', 'map', 'case']) {
      assert.equal(await page.locator('#' + id).count(), 1, 'Missing approach anchor: ' + id);
    }
    await assertNoHorizontalOverflow(page, 'small-screen approach');
    assert.deepEqual(seen.jsErrors, [], 'No uncaught client-side errors');
  } finally {
    await context.close();
  }
});

test('desktop: internal-page anchors resolve to homepage sections and no unwanted automatic handoff', async () => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const seen = observe(page);
  try {
    await page.goto(origin + '/about');
    assert.equal(await page.locator('a[href="/#contact"]').count() > 0, true);
    await page.goto(origin + '/#contact');
    assert.equal(await page.locator('#contact').count(), 1);
    await page.goto(origin + '/#trials');
    assert.equal(await page.locator('#trials').count(), 1);
    await assertNoHorizontalOverflow(page, 'desktop homepage');
    const status = await page.request.get(origin + '/api/website-handoff');
    assert.equal(status.status(), 200);
    assert.deepEqual(await status.json(), { enabled: false });
    assert.equal(seen.handoffPosts, 0);
    assert.deepEqual(seen.jsErrors, []);
  } finally {
    await context.close();
  }
});
