'use strict';
// Run: node --test tests/website-handoff.test.cjs
// Executes the actual Next route's TypeScript source with mocked I/O.
// No real requests, n8n calls, database writes, Telegram sends, or secrets.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../app/api/website-handoff/route.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let fetchMock = () => { throw Error('Unexpected network call'); };
const routeModule = { exports: {} };
const mockRequire = (name) => {
  if (name === 'next/server') {
    return { NextResponse: { json: (body, options = {}) => ({
      status: options.status ?? 200,
      body,
      headers: options.headers || {},
    }) } };
  }
  if (name === '@/lib/telegram-links') return { svoyeTelegramBotUsername: 'svoe_live_bot' };
  if (name === '@/lib/website-handoff-canary') return require('../lib/website-handoff-canary.ts');
  // Admission/driver integration is covered separately with actual source.
  if (name === '@/lib/website-admission') return {
    isAdmissionConfigured: () => true,
    reserveWebsiteAdmission: async () => ({ allowed: true, httpStatus: 200 }),
  };
  return require(name);
};
new Function('require', 'module', 'exports', 'process', 'fetch', 'AbortSignal', compiled)(
  mockRequire, routeModule, routeModule.exports, process,
  (...args) => fetchMock(...args), AbortSignal,
);
const { GET, POST } = routeModule.exports;

const configKeys = ['SVOYE_HANDOFF_BOT_READY', 'SVOYE_HANDOFF_WEBHOOK_URL', 'SVOYE_HANDOFF_WEBHOOK_SECRET'];
const validUrl = 'https://example.n8n.cloud/webhook/persist';
const fakeSecret = 'synthetic-test-only-not-a-secret';
const baseBody = { consent: true, contextVersion: 1, messageText: 'Моя вигадана проба' };

async function configured(ready, callback, opts = {}) {
  const original = Object.fromEntries(configKeys.map(k => [k, process.env[k]]));
  process.env.SVOYE_HANDOFF_BOT_READY = ready ? 'true' : 'false';
  process.env.SVOYE_HANDOFF_WEBHOOK_URL = opts.webhookUrl ?? validUrl;
  process.env.SVOYE_HANDOFF_WEBHOOK_SECRET = fakeSecret;
  fetchMock = opts.fetcher ?? (() => { throw Error('Unexpected fetch'); });
  try { return await callback(); } finally {
    for (const k of configKeys) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
    fetchMock = () => { throw Error('Unexpected fetch'); };
  }
}
function request(body = baseBody, overrides = {}) {
  const raw = overrides.raw ?? JSON.stringify(body);
  const origin = overrides.origin ?? 'https://svoe.live';
  const headers = new Map([
    ['origin', origin],
    ['content-type', overrides.contentType ?? 'application/json'],
    ['content-length', String(overrides.contentLength ?? Buffer.byteLength(raw, 'utf8'))],
  ]);
  if (overrides.omitOrigin) headers.delete('origin');
  return {
    nextUrl: { origin: 'https://svoe.live' },
    headers,
    text: async () => raw,
  };
}
const ack = { ok: true, json: async () => ({ stored: true }) };

// All tests run sequentially because the API uses environment variables.
test('GET reports unavailable until all gates are enabled', { concurrency: false }, async () => {
  await configured(false, async () => {
    const response = await GET();
    assert.equal(response.body.enabled, false);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  });
  await configured(true, async () => assert.equal((await GET()).body.enabled, true));
});

test('POST with readiness disabled fails closed and makes no upstream request', { concurrency: false }, async () => {
  await configured(false, async () => {
    const r = await POST(request());
    assert.equal(r.status, 503);
    assert.match(r.body.error, /скопіюй/i);
    assert.equal(r.headers['Cache-Control'], 'no-store');
  });
});

test('POST rejects requests with missing or foreign Origin', { concurrency: false }, async () => {
  await configured(true, async () => {
    assert.equal((await POST(request(baseBody, { origin: 'https://elsewhere.example' }))).status, 403);
    assert.equal((await POST(request(baseBody, { omitOrigin: true }))).status, 403);
  });
});

test('POST rejects incorrect Content-Type and excessive declared length', { concurrency: false }, async () => {
  await configured(true, async () => {
    assert.equal((await POST(request(baseBody, { contentType: 'text/plain' }))).status, 415);
    assert.equal((await POST(request(baseBody, { contentLength: 999999 }))).status, 413);
  });
});

test('POST rejects malformed JSON and oversized actual body', { concurrency: false }, async () => {
  await configured(true, async () => {
    assert.equal((await POST(request(baseBody, { raw: '{broken' }))).status, 400);
    assert.equal((await POST(request(baseBody, { raw: ' '.repeat(9100), contentLength: 0 }))).status, 400);
  });
});

test('POST demands consent, correct version and nonempty bounded summary', { concurrency: false }, async () => {
  await configured(true, async () => {
    for (const body of [
      { ...baseBody, consent: false },
      { ...baseBody, contextVersion: 2 },
      { ...baseBody, messageText: '  ' },
      { ...baseBody, messageText: 'x'.repeat(4001) },
      { ...baseBody, messageText: null },
    ]) assert.equal((await POST(request(body))).status, 400);
  });
});

test('POST denies unsafe upstream destinations', { concurrency: false }, async () => {
  for (const url of ['http://example.n8n.cloud/x', 'https://example.n8n.cloud.evil.test/x', 'https://evil.test/x']) {
    await configured(true, async () => assert.equal((await POST(request())).status, 503), { webhookUrl: url });
  }
});

test('POST fails safely if webhook fails or does not confirm storage', { concurrency: false }, async () => {
  for (const fetcher of [
    async () => ({ ok: false, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => ({ stored: false }) }),
    async () => { throw Error('Simulated timeout'); },
  ]) {
    await configured(true, async () => {
      const r = await POST(request());
      assert.equal(r.status, 502);
      assert.equal('telegramUrl' in r.body, false);
    }, { fetcher });
  }
});

test('POST only issues opaque one-use-link-shaped token after explicit ack', { concurrency: false }, async () => {
  let captured;
  const start = Date.now();
  await configured(true, async () => {
    const response = await POST(request({ ...baseBody, messageText: '  Синтетичний підсумок  ' }));
    assert.equal(response.status, 200);
    assert.equal(response.body.expiresInSeconds, 600);
    assert.match(response.body.telegramUrl, /^https:\/\/t\.me\/svoe_live_bot\?start=sv_[A-Za-z0-9_-]{43}$/);
    assert.equal(response.body.telegramUrl.includes('Синтетичний'), false);
    const token = response.body.telegramUrl.split('sv_')[1];
    const sent = JSON.parse(captured.options.body);
    assert.equal(sent.message_text, 'Синтетичний підсумок');
    assert.equal(sent.source, 'svoye_website');
    assert.equal(sent.context_version, 1);
    assert.equal(sent.token_hash, createHash('sha256').update(token, 'utf8').digest('hex'));
    assert.equal(captured.options.headers.Authorization, 'Bearer ' + fakeSecret);
    assert.equal(captured.options.cache, 'no-store');
    assert.equal(captured.options.redirect, 'error', 'Redirects must never forward user summaries');
    assert.equal(captured.endpoint.toString(), validUrl);
    assert.equal(Date.parse(sent.expires_at) >= start + 595000, true);
    assert.equal(Date.parse(sent.expires_at) <= Date.now() + 605000, true);
  }, { fetcher: async (endpoint, options) => { captured = { endpoint, options }; return ack; } });
});


