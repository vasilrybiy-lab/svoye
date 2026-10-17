'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatSafeErrorNotice } = require('../lib/svoe-safe-error-notice.cjs');
const event = { workflow: { id: 'safeWorkflow_123' }, execution: { id: '1200' } };
const at = (time, state) => formatSafeErrorNotice(event, { now: Date.parse(time), throttleState: state });

test('30-minute spacing survives Kyiv midnight and permits the exact boundary', () => {
  const state = Object.create(null);
  assert.ok(at('2026-10-17T20:59:00Z', state)); // Kyiv 23:59
  assert.equal(at('2026-10-17T21:01:00Z', state), null); // Kyiv 00:01
  assert.equal(at('2026-10-17T21:28:59.999Z', state), null);
  assert.ok(at('2026-10-17T21:29:00Z', state));
});

test('Kyiv daily count resets while the most recent alert still controls spacing', () => {
  const state = Object.create(null);
  for (const t of ['19:59:00', '20:29:00', '20:59:00']) {
    assert.ok(at(`2026-10-17T${t}Z`, state));
  }
  assert.equal(at('2026-10-17T21:01:00Z', state), null);
  for (const t of ['21:29:00', '21:59:00', '22:29:00']) {
    assert.ok(at(`2026-10-17T${t}Z`, state));
  }
  assert.equal(at('2026-10-17T22:59:00Z', state), null);
});

test('out-of-range timestamps fail closed without mutating throttle state', () => {
  for (const now of [1e20, Number.MAX_VALUE, 8640000000000001]) {
    const state = Object.create(null);
    assert.equal(formatSafeErrorNotice(event, { now, throttleState: state }), null);
    assert.deepEqual(Object.keys(state), []);
  }
});

test('clock rollback does not admit an early alert or replace the last timestamp', () => {
  const state = Object.create(null);
  assert.ok(at('2026-10-17T21:01:00Z', state));
  const before = JSON.stringify(state);
  assert.equal(at('2026-10-17T20:59:00Z', state), null);
  assert.equal(JSON.stringify(state), before);
  assert.ok(at('2026-10-17T21:31:00Z', state));
});
