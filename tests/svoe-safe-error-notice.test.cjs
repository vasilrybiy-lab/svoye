'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatSafeErrorNotice } = require('../lib/svoe-safe-error-notice.cjs');
const TEST_DAY = Date.parse('2026-10-17T10:00:00Z');
const WF = 'safeWorkflow_123';
function run(event, now = TEST_DAY, state = Object.create(null)) {
  return formatSafeErrorNotice(event, { now, throttleState: state });
}
const event = {
  workflow: { id: WF, name: 'Sensitive workflow 🔒' },
  execution: { id: '1200' },
};

test('known good IDs yield Kyiv timestamp and execution URL without raw workflow name', () => {
  const r = run(event);
  assert.match(r.message, /safeWorkflow_123/);
  assert.match(r.message, /svoyechat\.app\.n8n\.cloud\/workflow\/safeWorkflow_123\/executions\/1200/);
  assert.doesNotMatch(r.message, /Sensitive workflow/);
  assert.equal(r.workflowId, WF);
});

test('secret-looking payloads, message bodies and stack traces never reach output', () => {
  const toxic = {
    ...event,
    workflow: { ...event.workflow, name: 'Bearer fake_test_key12345 Example User' },
    execution: { ...event.execution, error: { message: 'Bearer fake_test_key12345', stack: 'token phone 555-0123' } },
    headers: { authorization: 'Bearer fake_test_key12345' },
    body: 'private note, phone 555-0123',
    phone: '555-0123',
    aiOutput: 'private note',
  };
  const output = JSON.stringify(run(toxic));
  for (const bad of ['fake_test_key12345', '555-0123', 'private note', 'Example User', 'authorization']) {
    assert.equal(output.includes(bad), false, 'Alert leaked: ' + bad);
  }
});

test('malicious workflow ID cannot inject secret text or URL', () => {
  const r = run({ workflow: { id: 'safeid_123/../../?token=leak' }, execution: { id: '12' } });
  assert.equal(r.workflowId, 'unknown');
  assert.equal(r.executionId, '12');
  assert.doesNotMatch(r.message, /token=|https:\/\/svoyechat\.app/);
});

test('malicious execution ID blocks URL interpolation', () => {
  const r = run({ workflow: { id: WF }, execution: { id: '12?token=leak' } });
  assert.equal(r.executionId, null);
  assert.doesNotMatch(r.message, /token=|executions\//);
});

test('one notification per workflow per 30 minutes, at most three each Kyiv calendar day', () => {
  const state = Object.create(null);
  assert.ok(run(event, TEST_DAY, state));
  assert.equal(run(event, TEST_DAY + 60_000, state), null);
  assert.ok(run(event, TEST_DAY + 31 * 60_000, state));
  assert.ok(run(event, TEST_DAY + 62 * 60_000, state));
  assert.equal(run(event, TEST_DAY + 180 * 60_000, state), null);
  assert.ok(run(event, TEST_DAY + 24 * 3600_000, state));
});

test('rate limiting is independent by workflow', () => {
  const state = Object.create(null);
  const first = run(event, TEST_DAY, state);
  const second = run({ workflow: { id: 'otherWorkflow_22' } }, TEST_DAY, state);
  assert.ok(first);
  assert.ok(second);
  assert.equal(run(event, TEST_DAY, state), null);
});

test('malformed data and invalid time cannot expose raw fields', () => {
  assert.equal(run(null, -2), null);
  assert.equal(run(null, NaN), null);
  const r = run({ execution: { id: null }, workflow: { name: 'hidden name' } });
  assert.ok(r);
  assert.equal(r.workflowId, 'unknown');
  assert.doesNotMatch(r.message, /hidden name/);
});
