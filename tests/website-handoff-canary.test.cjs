'use strict';
// Actual source, synthetic configuration, mocked network. No external I/O.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { createHash } = require('node:crypto');
const helper = require('../lib/website-handoff-canary.ts');
const { CANARY_SUMMARY, CANARY_QUERY_VALUE, CANARY_BRANCH, isCanaryRequest, renderCanaryPage } = helper;
const host = 'svoye-mobile-v2-synthetic-vasilrybiy-1703.vercel.app';
const url = () => new URL(`https://${host}/api/website-handoff?canary=${CANARY_QUERY_VALUE}`);
const env = (now = Date.now()) => ({
  VERCEL_ENV: 'preview', VERCEL_URL: host, VERCEL_GIT_COMMIT_REF: CANARY_BRANCH,
  SVOYE_HANDOFF_BOT_READY: 'false', SVOYE_HANDOFF_WEBHOOK_URL: 'https://svoyechat.app.n8n.cloud/webhook/svoe-website-context-v1',
  SVOYE_HANDOFF_WEBHOOK_SECRET: 'fake-local-only',
  SVOYE_HANDOFF_CANARY_UNTIL: new Date(now + 240000).toISOString(),
});
let code = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../app/api/website-handoff/route.ts'), 'utf8'))
  .replace(/^import \{([^}]+)\} from "([^"]+)";$/gm, (_, names, name) => `const {${names}} = require(${JSON.stringify(name)});`)
  .replace(/^export /gm, '');
code += '\nmodule.exports={GET,POST};';
function route(config = env(), responder = async () => ({ ok: true, json: async () => ({ stored: true }) })) {
  const calls = [];
  class Response {
    constructor(body, options = {}) { this.body = body; this.status = options.status ?? 200; this.headers = options.headers || {}; }
    static json(body, options) { return new Response(body, options); }
  }
  const mockRequire = name => name === 'next/server' ? { NextResponse: Response }
    : name === '@/lib/telegram-links' ? { svoyeTelegramBotUsername: 'svoe_live_bot' }
    : name === '@/lib/website-handoff-canary' ? helper
    : name === '@/lib/website-admission' ? {
      isAdmissionConfigured: () => true,
      reserveWebsiteAdmission: async () => ({ allowed:true, httpStatus:200 }),
    } : require(name);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'AbortSignal', code)(
    mockRequire, module, module.exports, { env: config }, async (...args) => { calls.push(args); return responder(...args); }, AbortSignal,
  );
  return { ...module.exports, calls };
}
function request(text = CANARY_SUMMARY, target = url()) {
  return { nextUrl: target, headers: new Map([['origin', target.origin], ['content-type', 'application/json']]),
    text: async () => JSON.stringify({ consent: true, contextVersion: 1, messageText: text }) };
}

test('canary requires exact deployment, branch, Preview, configuration and short window', () => {
  const now = Date.now(), config = env(now);
  assert.equal(isCanaryRequest(url(), config, now), true);
  for (const change of [
    { SVOYE_HANDOFF_CANARY_UNTIL: undefined }, { SVOYE_HANDOFF_CANARY_UNTIL: '' },
    { SVOYE_HANDOFF_CANARY_UNTIL: new Date(now).toISOString() },
    { SVOYE_HANDOFF_CANARY_UNTIL: new Date(now + 300001).toISOString() },
    { SVOYE_HANDOFF_CANARY_UNTIL: '2026-02-30T00:00:00.000Z' },
    { VERCEL_ENV: 'production' }, { VERCEL_GIT_COMMIT_REF: 'main' }, { VERCEL_URL: undefined },
    { SVOYE_HANDOFF_BOT_READY: 'true' }, { SVOYE_HANDOFF_WEBHOOK_SECRET: '' }, { SVOYE_HANDOFF_WEBHOOK_URL: '' },
  ]) assert.equal(isCanaryRequest(url(), { ...config, ...change }, now), false);
  for (const target of [
    new URL('https://svoe.live/api/website-handoff?canary=' + CANARY_QUERY_VALUE),
    new URL('https://svoye-mobile-v2-git-feature.vercel.app/api/website-handoff?canary=' + CANARY_QUERY_VALUE),
    new URL(`http://${host}/api/website-handoff?canary=${CANARY_QUERY_VALUE}`),
    new URL(`https://${host}:4433/api/website-handoff?canary=${CANARY_QUERY_VALUE}`),
    new URL(`https://${host}/api/website-handoff?canary=wrong`),
    new URL(`https://${host}/api/website-handoff`), undefined,
  ]) assert.equal(isCanaryRequest(target, config, now), false);
});

test('normal site stays disabled; unset config and custom domain make no upstream calls', async () => {
  for (const target of [new URL('https://svoe.live/api/website-handoff'), new URL('https://svoe.live/api/website-handoff?canary=' + CANARY_QUERY_VALUE)]) {
    const r = route(); assert.equal((await r.GET({ nextUrl: target })).body.enabled, false);
    assert.equal((await r.POST(request(CANARY_SUMMARY, target))).status, 503); assert.equal(r.calls.length, 0);
  }
  const r = route({ ...env(), SVOYE_HANDOFF_CANARY_UNTIL: undefined });
  assert.equal((await r.GET({ nextUrl: url() })).body.enabled, false);
  assert.equal((await r.POST(request())).status, 503); assert.equal(r.calls.length, 0);
});

test('canary rejects changed, padded and personal text before upstream processing', async () => {
  const r = route();
  for (const text of ['Вигадане приватне повідомлення', CANARY_SUMMARY + ' extra', ' ' + CANARY_SUMMARY])
    assert.equal((await r.POST(request(text))).status, 400);
  assert.equal(r.calls.length, 0);
});

test('exact UTF-8 synthetic text follows opaque token and stored acknowledgement path', async () => {
  const r = route(), result = await r.POST(request());
  assert.equal(result.status, 200); assert.equal(r.calls.length, 1);
  const [, options] = r.calls[0], sent = JSON.parse(options.body);
  const token = new URL(result.body.telegramUrl).searchParams.get('start').slice(3);
  assert.equal(sent.message_text, CANARY_SUMMARY);
  assert.equal(sent.token_hash, createHash('sha256').update(token).digest('hex'));
  assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'Bearer fake-local-only');
  assert.equal(options.body.includes(token), false); assert.equal(result.body.expiresInSeconds, 600);
  const failed = route(env(), async () => ({ ok: true, json: async () => ({ stored: false }) }));
  assert.equal((await failed.POST(request())).status, 502);
});

function form(script, responder) {
  const elements = Object.fromEntries(['check', 'send', 'status', 'telegram', 'consent'].map(id => [id, { checked: true, hidden: true }]));
  elements.check.addEventListener = (_, fn) => { elements.check.submit = fn; };
  new Function('document', 'location', 'fetch', script)({ getElementById: id => elements[id] }, url(), responder);
  return elements;
}

test('form has nonce CSP, no-referrer, no credentials and only one attempt', async () => {
  const r = route(), response = await r.GET({ nextUrl: url() });
  assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(response.headers['Referrer-Policy'], 'no-referrer');
  assert.equal(response.headers['X-Robots-Tag'], 'noindex, nofollow');
  const nonce = /script-src 'nonce-([^']+)'/.exec(response.headers['Content-Security-Policy'])[1];
  const script = response.body.split(`<script nonce="${nonce}">`)[1].split('</script>')[0];
  assert.equal(response.body.includes('fake-local-only'), false);
  let calls = 0;
  const elements = form(script, async () => { calls++; return { ok: true, json: async () => ({ telegramUrl: 'https://t.me/svoe_live_bot?start=sv_' + 'a'.repeat(43) }) }; });
  await elements.check.submit({ preventDefault() {} }); await elements.check.submit({ preventDefault() {} });
  assert.equal(calls, 1); assert.equal(elements.send.disabled, true); assert.equal(elements.telegram.hidden, false);
});

test('form refuses arbitrary upstream link and does not retry failures', async () => {
  const html = renderCanaryPage('testnonce'), script = html.split('<script nonce="testnonce">')[1].split('</script>')[0];
  for (const target of ['https://evil.example/?secret=fake', 'https://user:pass@t.me/svoe_live_bot?start=sv_' + 'a'.repeat(43)]) {
    let calls = 0;
    const elements = form(script, async () => { calls++; return { ok: true, json: async () => ({ telegramUrl: target }) }; });
    await elements.check.submit({ preventDefault() {} }); await elements.check.submit({ preventDefault() {} });
    assert.equal(elements.telegram.hidden, true); assert.equal(elements.telegram.href, undefined); assert.equal(calls, 1);
  }
});

test('canary reports a wrong instance/test path before any upstream request', async () => {
  for (const endpoint of [
    'https://example.n8n.cloud/webhook/svoe-website-context-v1',
    'https://svoyechat.app.n8n.cloud/webhook-test/svoe-website-context-v1',
    'https://svoyechat.app.n8n.cloud/webhook/svoe-website-context-v1?private=fake',
  ]) {
    const r = route({ ...env(), SVOYE_HANDOFF_WEBHOOK_URL: endpoint });
    const response = await r.POST(request());
    assert.equal(response.status, 503); assert.equal(response.body.diagnostic, 'CANARY_WRONG_WEBHOOK_ENDPOINT');
    assert.equal(r.calls.length, 0);
  }
});

test('canary distinguishes upstream HTTP, transport, invalid JSON and missing ack without echoing details', async () => {
  const cases = [
    ...[403, 404, 500, 503].map(status => [async () => ({ ok: false, status, json: async () => ({ private: 'DO_NOT_ECHO' }) }), 'UPSTREAM_HTTP_' + status]),
    [async () => { throw Error('DO_NOT_ECHO Authorization fake'); }, 'UPSTREAM_TRANSPORT'],
    [async () => ({ ok: true, json: async () => { throw Error('DO_NOT_ECHO'); } }), 'UPSTREAM_INVALID_JSON'],
    [async () => ({ ok: true, json: async () => ({ stored: false, private: 'DO_NOT_ECHO' }) }), 'UPSTREAM_STORAGE_NOT_CONFIRMED'],
  ];
  for (const [responder, expected] of cases) {
    const r = route(env(), responder), result = await r.POST(request());
    assert.equal(result.status, 502); assert.equal(result.body.diagnostic, expected);
    assert.equal(JSON.stringify(result.body).includes('DO_NOT_ECHO'), false);
    assert.equal(JSON.stringify(result.body).includes('fake-local-only'), false);
    assert.equal(r.calls.length, 1);
  }
  const normal = route({ ...env(), SVOYE_HANDOFF_BOT_READY: 'true' }, async () => ({ ok: false, status: 403 }));
  const result = await normal.POST(request(CANARY_SUMMARY, new URL('https://svoe.live/api/website-handoff')));
  assert.equal(result.status, 502); assert.equal('diagnostic' in result.body, false);
});

test('form displays only allowlisted diagnostic codes and makes no retry', async () => {
  const html = renderCanaryPage('testnonce'), script = html.split('<script nonce="testnonce">')[1].split('</script>')[0];
  for (const code of ['UPSTREAM_HTTP_403', 'DO_NOT_ECHO']) {
    let calls = 0;
    const elements = form(script, async () => { calls++; return { ok: false, json: async () => ({ diagnostic: code }) }; });
    await elements.check.submit({ preventDefault() {} }); await elements.check.submit({ preventDefault() {} });
    assert.equal(calls, 1); assert.equal(elements.telegram.hidden, true);
    assert.equal(elements.status.textContent.includes(code === 'DO_NOT_ECHO' ? 'UNKNOWN' : code), true);
    assert.equal(elements.status.textContent.includes('DO_NOT_ECHO'), false);
  }
});

