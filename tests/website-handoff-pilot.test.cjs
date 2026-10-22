'use strict';
// Execute the real pilot boundary and route with an isolated clock and fake adapter.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const NOW = Date.parse('2026-10-22T16:00:00.000Z'), KEY = 'a'.repeat(64);
const config = () => ({ VERCEL_ENV:'preview', VERCEL_GIT_COMMIT_REF:'feature/v2-svoe-live-telegram-2026-10-16',
  SVOYE_HANDOFF_BOT_READY:'false', SVOYE_HANDOFF_DIRECT_NEON_ENABLED:'true', SVOYE_HANDOFF_PILOT_ACCESS:KEY });
function source(file) {
  return stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'..',file),'utf8'))
    .replace(/^import \{([^}]+)\} from "([^"]+)";/gm, 'const {$1} = require("$2");')
    .replace(/^export /gm,'');
}
function harness(env=config(), now=NOW) {
  class Clock extends Date { static now() { return now; } }
  const helper = new Function('require','process','Date',source('lib/website-handoff-pilot.ts')+
    '\nreturn {PILOT_COOKIE,PILOT_UNTIL,isPilotEntry,isPilotSession};')(require,{env},Clock);
  const calls=[];
  class Response {
    constructor(body, opts={}) { this.body=body; this.status=opts.status||200; this.headers=new Headers(opts.headers);
      this.cookies={set:(name,value,options)=>{this.cookie={name,value,options};}}; }
    static json(body, opts) { return new Response(body,opts); }
    static redirect(url,status) { return new Response(null,{status,headers:{Location:url.href}}); }
  }
  const injected=name=>name==='next/server'?{NextResponse:Response}:
    name==='@/lib/telegram-links'?{svoyeTelegramBotUsername:'svoe_live_bot'}:
    name==='@/lib/website-handoff-pilot'?helper:
    name==='@/lib/website-handoff-canary'?{isCanaryRequest:()=>false}:
    name==='@/lib/website-admission'?{isAdmissionConfigured:()=>true}:
    name==='@/lib/website-direct-neon'?{isDirectNeonConfigured:()=>true,prepareDirectWebsite:async(...args)=>{
      calls.push(args);return {status:200,body:{telegramUrl:'https://t.me/svoe_live_bot?start=sv_'+ 'x'.repeat(43)}};
    }}:require(name);
  const route=new Function('require','process',source('app/api/website-handoff/route.ts')+'\nreturn {GET,POST};')(injected,{env});
  return {...route,...helper,calls,env};
}
const summary='Моя проба: хочу дослідити дизайн і створити невеликий проєкт.\n'+ 'Ще власні висновки. '.repeat(100);
function request({url='https://svoe.live/api/website-handoff',cookie,access,origin='https://svoe.live',consent=true}={}) {
  return {nextUrl:new URL(url),cookies:{get:()=>cookie?{value:cookie}:undefined},
    headers:new Map([['origin',origin],['content-type','application/json'],...(access?[['x-svoe-pilot-access',access]]:[])]),
    text:async()=>JSON.stringify({messageText:summary,consent,contextVersion:1})};
}
test('private entry redirects to clean site with secure finite cookie and no storage',async()=>{
  const h=harness(), r=await h.GET(request({url:'https://svoe.live/api/website-handoff?pilot='+KEY}));
  assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'https://svoe.live/');
  assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(r.cookie.name,'__Host-svoe-journey-pilot');assert.equal(r.cookie.value,KEY);
  assert.deepEqual({...r.cookie.options,expires:r.cookie.options.expires.toISOString()},
    {httpOnly:true,secure:true,sameSite:'strict',path:'/',expires:h.PILOT_UNTIL});
  assert.deepEqual(h.calls,[]);
});
test('public, forged, expired and wrong environment entry/session remain closed',async()=>{
  for(const [env,now,url,cookie] of [
    [config(),NOW,'https://svoe.live/api/website-handoff',undefined],
    [config(),NOW,'https://svoe.live/api/website-handoff','b'.repeat(64)],
    [config(),Date.parse('2026-10-22T18:00:00.000Z'),'https://svoe.live/api/website-handoff',KEY],
    [config(),Date.parse('2026-10-22T15:29:59.999Z'),'https://svoe.live/api/website-handoff',KEY],
    [{...config(),VERCEL_ENV:'production'},NOW,'https://svoe.live/api/website-handoff',KEY],
    [{...config(),VERCEL_GIT_COMMIT_REF:'main'},NOW,'https://svoe.live/api/website-handoff',KEY],
    [{...config(),SVOYE_HANDOFF_DIRECT_NEON_ENABLED:'false'},NOW,'https://svoe.live/api/website-handoff',KEY],
    [{...config(),SVOYE_HANDOFF_PILOT_ACCESS:undefined},NOW,'https://svoe.live/api/website-handoff',KEY],
    [config(),NOW,'http://svoe.live/api/website-handoff',KEY],
    [config(),NOW,'https://other.example/api/website-handoff',KEY],
  ]) {
    const h=harness(env,now),q=request({url,cookie});
    assert.equal((await h.GET(q)).body.enabled,false);
    assert.equal((await h.POST(q)).status,503);assert.deepEqual(h.calls,[]);
  }
  const h=harness();
  for(const suffix of ['b'.repeat(64),KEY+'&pilot='+KEY,'bad']) {
    assert.equal((await h.GET(request({url:'https://svoe.live/api/website-handoff?pilot='+suffix}))).status,404);
  }
  assert.deepEqual(h.calls,[]);
});
test('valid session uses actual full summary in pilot mode, retaining consent and origin checks',async()=>{
  const h=harness(),q=request({cookie:KEY});
  assert.equal((await h.GET(q)).body.enabled,true);
  assert.equal((await h.POST(request({cookie:KEY,consent:false}))).status,400);
  assert.equal((await h.POST(request({cookie:KEY,origin:'https://other.example'}))).status,403);
  assert.deepEqual(h.calls,[]);
  assert.equal((await h.POST(q)).status,200);
  assert.deepEqual(h.calls,[[summary,'pilot']]);
  assert.equal(h.env.SVOYE_HANDOFF_BOT_READY,'false');
});
test('private header works without cookies and cannot bypass scope, consent or explicit wrong key',async()=>{
  const h=harness(),q=request({access:KEY});
  assert.equal((await h.GET(q)).body.enabled,true);
  assert.equal((await h.POST(q)).status,200);
  assert.deepEqual(h.calls,[[summary,'pilot']]);
  for(const [env,now,url,access,cookie] of [
    [config(),NOW,'https://svoe.live/api/website-handoff','b'.repeat(64),KEY],
    [config(),NOW,'https://other.example/api/website-handoff',KEY,undefined],
    [{...config(),VERCEL_ENV:'production'},NOW,'https://svoe.live/api/website-handoff',KEY,undefined],
    [config(),Date.parse('2026-10-22T18:00:00.000Z'),'https://svoe.live/api/website-handoff',KEY,undefined],
  ]) {
    const closed=harness(env,now),r=request({url,access,cookie});
    assert.equal((await closed.GET(r)).body.enabled,false);
    assert.equal((await closed.POST(r)).status,503);assert.deepEqual(closed.calls,[]);
  }
  assert.equal((await h.POST(request({access:KEY,consent:false}))).status,400);
  assert.equal((await h.POST(request({access:KEY,origin:'https://other.example'}))).status,403);
  assert.equal(h.calls.length,1);
});
