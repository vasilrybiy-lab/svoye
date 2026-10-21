'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {readPilotAccess,pilotHeaders} = require('../lib/website-handoff-access.ts');
test('private fragment is exact and sends only the dedicated header', () => {
  const key='a'.repeat(64);
  assert.equal(readPilotAccess('#svoe-pilot='+key),key);
  assert.deepEqual(pilotHeaders(key),{'X-Svoe-Pilot-Access':key});
  for(const hash of ['', '#top', '#svoe-pilot=bad', '#svoe-pilot='+key+'&other=1', '#svoe-pilot='+key.toUpperCase()])
    assert.equal(readPilotAccess(hash),undefined);
  assert.deepEqual(pilotHeaders(undefined),{});
  assert.deepEqual(pilotHeaders('bad'),{});
});
