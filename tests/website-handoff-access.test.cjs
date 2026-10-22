'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {readPilotAccess,pilotHeaders,createHandoffReadiness} = require('../lib/website-handoff-access.ts');
test('private fragment is exact and sends only the dedicated header', () => {
  const key='a'.repeat(64);
  assert.equal(readPilotAccess('#svoe-pilot='+key),key);
  assert.deepEqual(pilotHeaders(key),{'X-Svoe-Pilot-Access':key});
  for(const hash of ['', '#top', '#svoe-pilot=bad', '#svoe-pilot='+key+'&other=1', '#svoe-pilot='+key.toUpperCase()])
    assert.equal(readPilotAccess(hash),undefined);
  assert.deepEqual(pilotHeaders(undefined),{});
  assert.deepEqual(pilotHeaders('bad'),{});
});

function monitor(fetchStatus, fragment = '#svoe-pilot='+'a'.repeat(64)) {
  const state={fragment,ready:[],checking:[],access:[],headers:[]};
  const controller=createHandoffReadiness({readFragment:()=>state.fragment,
    fetchStatus:async headers=>{state.headers.push(headers);return fetchStatus();},
    onAccess:value=>state.access.push(value),onReady:value=>state.ready.push(value),
    onChecking:value=>state.checking.push(value)});
  return {state,controller};
}
test('a transient readiness failure recovers on a later check without losing invite',async()=>{
  let calls=0;
  const {state,controller}=monitor(async()=>{if(++calls===1)throw Error('offline');return true;});
  await controller.check();state.fragment='#top';await controller.check();
  assert.deepEqual(state.ready,[false,true]);
  assert.deepEqual(state.checking,[true,false,true,false]);
  assert.equal(state.headers[1]['X-Svoe-Pilot-Access'],'a'.repeat(64));
});
test('a previous unavailable result does not hide a newer available result',async()=>{
  const pending=[];
  const {state,controller}=monitor(()=>new Promise(resolve=>pending.push(resolve)));
  const old=controller.check(),fresh=controller.check();
  pending[1](true);await fresh;pending[0](false);await old;
  assert.deepEqual(state.ready,[true]);
});
test('leaving the page ignores outstanding status and sends no further requests',async()=>{
  let resolve;
  const {state,controller}=monitor(()=>new Promise(r=>{resolve=r;}));
  const task=controller.check();controller.stop();resolve(true);await task;await controller.check();
  assert.deepEqual(state.ready,[]);assert.equal(state.headers.length,1);
});
test('ordinary access carries no invitation and a later hash can activate one',async()=>{
  const {state,controller}=monitor(async()=>true,'');
  await controller.check();assert.deepEqual(state.headers[0],{});
  state.fragment='#svoe-pilot='+'b'.repeat(64);await controller.check();
  assert.deepEqual(state.headers[1],{'X-Svoe-Pilot-Access':'b'.repeat(64)});
});
