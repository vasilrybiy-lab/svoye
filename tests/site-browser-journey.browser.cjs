'use strict';
// Browser-only QA of the actual, locally built site. No real users, webhooks,
// Telegram sends, database requests or real personal data.
// Run: node --test tests/site-browser-journey.browser.cjs
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('playwright');

const liveOrigin = (process.env.SVOE_BROWSER_ORIGIN || '').trim();
const origin = liveOrigin || 'http://127.0.0.1:4318';
if (liveOrigin && liveOrigin !== 'https://svoe.live') {
  throw Error('Only the exact public read-only smoke target is permitted');
}
let server;
let browser;
let stderr = '';

before(async () => {
  if (!liveOrigin) server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4318'], {
    cwd: process.cwd(),
    env: { ...process.env, SVOYE_HANDOFF_BOT_READY: 'false', SVOYE_HANDOFF_WEBHOOK_URL: '', SVOYE_HANDOFF_WEBHOOK_SECRET: '', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (server) server.stderr.on('data', part => { stderr += String(part).slice(0, 2000); });
  let ready = false;
  for (let i = 0; i < 65; i++) {
    if (server && server.exitCode !== null) break;
    try {
      const r = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (r.ok) { ready = true; break; }
    } catch { /* next is not ready yet */ }
    await delay(350);
  }
  assert.ok(ready, 'Browser QA target did not respond: ' + stderr.slice(-900));
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
    const summary = await page.locator('.v2-handoff-preview-text').textContent();
    assert.match(summary, /QA: вигадана ідея — дослідити світло/);
    assert.match(summary, /Одна проба не визначає професію/);
    await page.locator('.v2-copy-button').click();
    await page.waitForFunction(() => {
      const button = document.querySelector('.v2-copy-button');
      return /скопійовано/i.test(button?.textContent || '') ||
        Boolean(document.querySelector('#v2-copy-fallback'));
    }, null, { timeout: 8000 });
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


test('automated WCAG 2.1 AA serious/critical checks on teen, parent and trial screens', { skip: Boolean(liveOrigin) }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const axeScript = require.resolve('axe-core/axe.min.js');
  const allBlocking = [];
  const scan = async label => {
    await page.addScriptTag({ path: axeScript });
    const result = await page.evaluate(async () => await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }));
    const findings = result.violations.map(v => ({
      id: v.id, impact: v.impact, nodeCount: v.nodes.length,
      targets: v.nodes.slice(0, 2).map(n => n.target.join(' > ')),
    }));
    console.log('Synthetic accessibility scan', label, JSON.stringify(findings));
    const blocking = findings.filter(f => f.impact === 'critical' || f.impact === 'serious');
    allBlocking.push(...blocking.map(f => ({ screen: label, ...f })));
  };
  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await scan('teen homepage');
    await page.getByRole('button', { name: /Я з батьків/ }).click();
    await scan('parent homepage');
    await page.getByRole('button', { name: /Я школяр/ }).click();
    await page.locator('.v2-direction-list button').first().click();
    await scan('trial task');
    await page.goto(origin + '/parents', { waitUntil: 'networkidle' });
    await scan('parent detail');
    await page.goto(origin + '/approach', { waitUntil: 'networkidle' });
    await scan('approach detail');
    assert.deepEqual(allBlocking, [], 'Serious/critical WCAG issues across scanned views');
  } finally {
    await context.close();
  }
});


// Regression coverage for the existing consent UI. All POSTs below are replaced
// in the page with deferred synthetic responses; they never reach the server.
// Deliberately ignore AbortSignal in this fake transport to exercise stale-response
// guards even when a response was already queued before cancellation.
async function handoffPage() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.__handoffQA = { requests: [], aborted: [] };
    window.fetch = (input, init = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.origin === location.origin && url.pathname === '/api/website-handoff') {
        if ((init.method || 'GET') === 'GET') {
          return Promise.resolve(new Response(JSON.stringify({ enabled: true }), { status: 200 }));
        }
        if (init.method === 'POST') {
          return new Promise(resolve => {
            const index = window.__handoffQA.requests.length;
            window.__handoffQA.requests.push({
              body: JSON.parse(init.body),
              finish: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status })),
            });
            init.signal?.addEventListener('abort', () => { window.__handoffQA.aborted.push(index); });
          });
        }
      }
      return originalFetch(input, init);
    };
  });
  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  await page.locator('.v2-direction-list button').first().click();
  await page.locator('#v2-notes').fill('QA: вигаданий підсумок без персональних даних');
  await page.getByRole('button', { name: /Перейти до рефлексії/ }).click();
  for (let n = 0; n < 3; n++) await page.locator('.v2-skip').nth(n).click();
  await page.getByRole('button', { name: /^Далі/ }).click();
  for (let n = 0; n < 3; n++) await page.locator('.v2-skip').nth(n).click();
  await page.getByRole('button', { name: /^Далі/ }).click();
  for (let n = 0; n < 2; n++) await page.locator('.v2-skip').nth(n).click();
  await page.getByRole('button', { name: /Побачити підсумок/ }).click();
  return { context, page };
}
async function changeDifficultySummary(page) {
  await page.getByRole('button', { name: /Назад/ }).click();
  await page.getByRole('button', { name: /Назад/ }).click();
  await page.getByLabel('Складнощів не було').check();
  await page.getByRole('button', { name: /^Далі/ }).click();
  await page.getByRole('button', { name: /Побачити підсумок/ }).click();
}

test('private invite: actual mobile summary and consent work without cookies, including activation after reflection', { skip: Boolean(liveOrigin) }, async t => {
  for (const activateLate of [false, true]) await t.test(activateLate ? 'activate on existing summary' : 'enter through fragment invite', async () => {
    const key = 'c'.repeat(64), fragment = '#svoe-pilot=' + key;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(), seen = observe(page), requests = [];
    await context.clearCookies();
    await page.addInitScript(() => Object.defineProperty(document, 'cookie', { get: () => '', set: () => {}, configurable: true }));
    await page.route('**/api/website-handoff', async route => {
      const request = route.request(), headers = request.headers();
      assert.equal(headers.cookie, undefined);
      assert.equal(request.url().includes(key), false);
      assert.equal((headers.referer || '').includes(key), false);
      const authorized = headers['x-svoe-pilot-access'] === key;
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: authorized }) });
      }
      assert.equal(authorized, true);
      const body = request.postDataJSON();
      assert.equal(JSON.stringify(body).includes(key), false);
      requests.push(body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        telegramUrl: 'https://t.me/svoe_live_bot?start=sv_' + 'C'.repeat(43), expiresInSeconds: 600,
      }) });
    });
    try {
      await page.goto(origin + '/' + (activateLate ? '' : fragment), { waitUntil: 'networkidle' });
      await page.locator('.v2-direction-list button').first().click();
      await page.locator('#v2-notes').fill('QA: вигаданий підсумок приватної проби');
      await page.getByRole('button', { name: /Перейти до рефлексії/ }).click();
      for (let n = 0; n < 3; n++) await page.locator('.v2-skip').nth(n).click();
      await page.getByRole('button', { name: /^Далі/ }).click();
      await page.getByLabel('Складнощів не було').check();
      await page.getByRole('button', { name: /^Далі/ }).click();
      for (let n = 0; n < 2; n++) await page.locator('.v2-skip').nth(n).click();
      await page.getByRole('button', { name: /Побачити підсумок/ }).click();
      const summary = await page.locator('.v2-handoff-preview-text').textContent();
      if (activateLate) {
        assert.equal(await page.locator('.v2-consent').count(), 0);
        await page.evaluate(hash => { location.hash = hash; }, fragment);
      }
      await page.waitForSelector('.v2-consent input');
      assert.equal(await page.locator('.v2-handoff-preview-text').textContent(), summary);
      assert.equal(await page.locator('.v2-consent input').isChecked(), false);
      assert.equal(await page.getByRole('button', { name: /Підготувати перехід у Telegram/ }).isDisabled(), true);
      assert.equal(requests.length, 0);
      await page.locator('.v2-consent input').check();
      await page.getByRole('button', { name: /Підготувати перехід у Telegram/ }).click();
      await page.waitForSelector('.v2-handoff-success a');
      assert.equal(requests.length, 1);
      assert.deepEqual(requests[0], { consent: true, contextVersion: 1, messageText: summary });
      assert.equal(await page.locator('.v2-handoff-success a').getAttribute('href'),
        'https://t.me/svoe_live_bot?start=sv_' + 'C'.repeat(43));
      assert.deepEqual(await context.cookies(), []);
      assert.deepEqual(seen.jsErrors, []);
    } finally { await context.close(); }
  });
});
async function startSyntheticHandoff(page, count) {
  await page.locator('.v2-consent input').check();
  await page.getByRole('button', { name: /Підготувати перехід у Telegram/ }).click();
  await page.waitForFunction(expected => window.__handoffQA.requests.length === expected, count);
}
async function finishSyntheticHandoff(page, index, token, status = 200) {
  await page.evaluate(({ index, token, status }) => {
    window.__handoffQA.requests[index].finish(status === 200
      ? { telegramUrl: 'https://t.me/svoe_live_bot?start=sv_' + token }
      : { error: 'QA: застаріла помилка' }, status);
  }, { index, token, status });
  // Flush the response and React updates without waiting on an arbitrary timer.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('handoff: changing difficulty resets consent and a prepared link', { skip: Boolean(liveOrigin) }, async () => {
  const { context, page } = await handoffPage();
  try {
    assert.equal(await page.locator('.v2-consent input').isChecked(), false);
    await startSyntheticHandoff(page, 1);
    await finishSyntheticHandoff(page, 0, 'A'.repeat(43));
    await page.waitForSelector('.v2-handoff-success a');
    const before = await page.evaluate(() => window.__handoffQA.requests[0].body.messageText);
    await changeDifficultySummary(page);
    assert.notEqual(await page.locator('.v2-handoff-preview-text').textContent(), before);
    assert.equal(await page.locator('.v2-consent input').isChecked(), false);
    assert.equal(await page.locator('.v2-handoff-success').count(), 0);
    assert.equal(await page.getByRole('button', { name: /Підготувати перехід у Telegram/ }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__handoffQA.requests.length), 1);
  } finally { await context.close(); }
});

test('handoff: a stale success or error cannot replace a newer request', { skip: Boolean(liveOrigin) }, async t => {
  for (const staleStatus of [200, 502]) await t.test('old response status ' + staleStatus, async () => {
    const { context, page } = await handoffPage();
    try {
      await startSyntheticHandoff(page, 1);
      await changeDifficultySummary(page);
      assert.deepEqual(await page.evaluate(() => window.__handoffQA.aborted), [0]);
      assert.equal(await page.locator('.v2-consent input').isChecked(), false);
      await startSyntheticHandoff(page, 2);
      const bodies = await page.evaluate(() => window.__handoffQA.requests.map(r => r.body));
      assert.notEqual(bodies[0].messageText, bodies[1].messageText);
      assert.equal(bodies[1].consent, true);
      assert.equal(bodies[1].messageText, await page.locator('.v2-handoff-preview-text').textContent());
      await finishSyntheticHandoff(page, 0, 'A'.repeat(43), staleStatus);
      assert.equal(await page.locator('.v2-handoff-success').count(), 0);
      assert.equal(await page.locator('.v2-handoff-error').count(), 0);
      assert.equal(await page.getByRole('button', { name: /Готуємо перехід/ }).isDisabled(), true,
        'An old finally block must not release the newer request');
      await finishSyntheticHandoff(page, 1, 'B'.repeat(43));
      await page.waitForSelector('.v2-handoff-success a');
      assert.equal(await page.locator('.v2-handoff-success a').getAttribute('href'),
        'https://t.me/svoe_live_bot?start=sv_' + 'B'.repeat(43));
      await page.locator('.v2-consent input').uncheck();
      assert.equal(await page.locator('.v2-handoff-success').count(), 0);
      assert.equal(await page.getByRole('button', { name: /Підготувати перехід у Telegram/ }).isDisabled(), true);
      assert.equal(await page.evaluate(() => window.__handoffQA.requests.length), 2);
    } finally { await context.close(); }
  });
});
