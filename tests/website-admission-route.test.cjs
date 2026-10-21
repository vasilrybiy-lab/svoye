'use strict';
// Executes the actual route, adapter and policy. Only Neon/Next/network/time are
// replaced; no live DB, n8n, Telegram, credentials or calendar operations.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const helper=require('../lib/website-handoff-canary.ts');
const NOW=Date.parse('2026-10-20T08:00:00.000Z');
const URL_VALUE='postgresql://svoe_website_test_runtime:synthetic-password@ep-synthetic.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const host='svoye-mobile-v2-synthetic-vasilrybiy-1703.vercel.app';
const config=()=>({
  VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:helper.CANARY_BRANCH,VERCEL_URL:host,
  SVOYE_HANDOFF_BOT_READY:'true',SVOYE_HANDOFF_ADMISSION_ENABLED:'true',
  SVOYE_HANDOFF_ADMISSION_DATABASE_URL:URL_VALUE,
  SVOYE_HANDOFF_WEBHOOK_URL:'https://svoyechat.app.n8n.cloud/webhook/svoe-website-context-v1',
  SVOYE_HANDOFF_WEBHOOK_SECRET:'synthetic-webhook-secret',
});
const policySource=fs.readFileSync(path.join(__dirname,'../lib/website-admission-policy.cjs'),'utf8');
function compile(file){return ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;}
const driverCode=compile('lib/website-admission.ts'),routeCode=compile('app/api/website-handoff/route.ts');
function receipt(n=1){return {rows:[{
  connected_role:'svoe_website_test_runtime',database:'neondb',
  project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',
  receipt:{allowed:true,policy_version:'website_admission_v2_carryover',test_environment_verified:true,
    project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',
    cycle_limit:30,daily_base:3,used_cycle:n,used_today:n,unlocked_cycle:18,available_after:18-n,
    day_key:'2026-10-20',cycle_start:'2026-10-14T21:00:00.000Z',cycle_end:'2026-11-14T22:00:00.000Z'},
}]};}
function harness({env=config(),query,upstream}={}){
  const events=[],driverOptions=[],sqlCalls=[];
  class Clock extends Date {static now(){return NOW;}}
  const policyModule={exports:{}};
  new Function('module','exports','Date',policySource)(policyModule,policyModule.exports,Clock);
  const policy=policyModule.exports;
  let reservations=0;
  const neon=(url,options)=>{
    assert.equal(url,URL_VALUE);driverOptions.push(options);
    return {query:async sql=>{
      events.push('reserve');sqlCalls.push(sql);reservations++;
      assert.equal(sql,policy.RESERVE_SQL);
      return query?query(reservations):receipt(reservations);
    }};
  };
  const driverModule={exports:{}};
  new Function('require','module','exports','process','AbortSignal',driverCode)(
    name=>name==='@neondatabase/serverless'?{neon}:policy,driverModule,driverModule.exports,{env},AbortSignal);
  class Response {
    constructor(body,options={}){this.body=body;this.status=options.status??200;this.headers=options.headers||{};}
    static json(body,options){return new Response(body,options);}
  }
  const routeModule={exports:{}};
  const mockRequire=name=>name==='next/server'?{NextResponse:Response}:
    name==='@/lib/website-direct-neon'?{isDirectNeonConfigured:()=>false,prepareDirectWebsite:async()=>{throw Error('Unexpected direct route');}}:
    name==='@/lib/website-admission'?driverModule.exports:
    name==='@/lib/website-handoff-canary'?helper:
    name==='@/lib/telegram-links'?{svoyeTelegramBotUsername:'svoe_live_bot'}:require(name);
  new Function('require','module','exports','process','fetch','AbortSignal',routeCode)(
    mockRequire,routeModule,routeModule.exports,{env},async(...args)=>{
      events.push('forward');return upstream?upstream(...args):{ok:true,json:async()=>({stored:true})};
    },AbortSignal);
  return {...routeModule.exports,env,events,driverOptions,sqlCalls};
}
const body={consent:true,contextVersion:1,messageText:'Синтетична проба'};
function request({url='https://svoe.live/api/website-handoff',message=body,origin}={}){
  const target=new URL(url);
  return {nextUrl:target,headers:new Map([['origin',origin??target.origin],['content-type','application/json']]),
    text:async()=>JSON.stringify(message)};
}

test('request validation happens before any DB reservation or forwarding',async()=>{
  const r=harness();
  for(const req of [request({origin:'https://wrong.example'}),request({message:{...body,consent:false}})])
    assert.equal((await r.POST(req)).status<500,true);
  assert.deepEqual(r.events,[]);
});
test('disabled or unsafe TEST binding closes GET and POST without DB or webhook',async()=>{
  for(const change of [
    {SVOYE_HANDOFF_ADMISSION_ENABLED:'false'},{SVOYE_HANDOFF_ADMISSION_DATABASE_URL:undefined},
    {VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},
    {SVOYE_HANDOFF_ADMISSION_DATABASE_URL:URL_VALUE.replace('svoe_website_test_runtime','neondb_owner')},
    {SVOYE_HANDOFF_ADMISSION_DATABASE_URL:URL_VALUE.replace('sslmode=require','sslmode=disable')},
    {SVOYE_HANDOFF_ADMISSION_DATABASE_URL:URL_VALUE+'&options=unsafe'},
  ]){
    const r=harness({env:{...config(),...change}});
    assert.equal((await r.GET()).body.enabled,false);
    assert.equal((await r.POST(request())).status,503);assert.deepEqual(r.events,[]);
  }
});
test('normal aliases and exact canary use the same reservation before each forward',async()=>{
  const r=harness();
  for(const url of ['https://svoe.live/api/website-handoff', 'https://'+host+'/api/website-handoff']){
    assert.equal((await r.POST(request({url}))).status,200);
  }
  r.env.SVOYE_HANDOFF_BOT_READY='false';
  // Only the canary window uses real time; reservation receipt uses fixed time.
  r.env.SVOYE_HANDOFF_CANARY_UNTIL=new Date(Date.now()+240000).toISOString();
  const url='https://'+host+'/api/website-handoff?canary='+helper.CANARY_QUERY_VALUE;
  assert.equal((await r.POST(request({url,message:{...body,messageText:helper.CANARY_SUMMARY}}))).status,200);
  assert.deepEqual(r.events,['reserve','forward','reserve','forward','reserve','forward']);
  for(const x of r.driverOptions){
    assert.equal(x.fullResults,true);assert.equal(x.arrayMode,false);
    assert.equal(x.fetchOptions.cache,'no-store');assert.equal(x.fetchOptions.redirect,'error');
    assert.equal(x.fetchOptions.signal instanceof AbortSignal,true);
  }
});
test('both cumulative-daily and cycle denials block normal and canary paths',async()=>{
  for(const reason of ['daily_limit','cycle_limit']){
    for(const canary of [false,true]){
      const env=config();if(canary){
        env.SVOYE_HANDOFF_BOT_READY='false';env.SVOYE_HANDOFF_CANARY_UNTIL=new Date(Date.now()+240000).toISOString();
      }
      const r=harness({env,query:()=>{const x=receipt();x.rows[0].receipt={allowed:false,reason};return x;}});
      const req=canary?request({url:'https://'+host+'/api/website-handoff?canary='+helper.CANARY_QUERY_VALUE,
        message:{...body,messageText:helper.CANARY_SUMMARY}}):request();
      const result=await r.POST(req);
      assert.equal(result.status,429);assert.equal('telegramUrl' in result.body,false);
      assert.deepEqual(r.events,['reserve']);
    }
  }
});
test('unknown DB and unverified result never forward, retry, or leak driver details',async()=>{
  for(const query of [
    ()=>{throw Error(URL_VALUE+' PRIVATE_DRIVER_ERROR');},
    ()=>{const x=receipt();x.rows[0].connected_role='neondb_owner';return x;},
    ()=>{const x=receipt();x.rows[0].receipt.available_after=99;return x;},
    ()=>({rows:[]}),()=>{const x=receipt();x.rows[0].receipt={allowed:false,reason:'not_configured'};return x;},
  ]){
    const r=harness({query}),result=await r.POST(request());
    assert.equal(result.status,503);assert.deepEqual(r.events,['reserve']);
    assert.doesNotMatch(JSON.stringify(result),/synthetic-password|PRIVATE_DRIVER_ERROR|neondb_owner|neon.tech/);
    assert.equal('telegramUrl' in result.body,false);
  }
});
test('upstream uncertainty consumes one reservation and never returns a success link',async()=>{
  for(const upstream of [
    ()=>{throw Error('PRIVATE_UPSTREAM_ERROR');},
    async()=>({ok:true,json:async()=>({stored:false})}),
    async()=>({ok:false,status:500}),
  ]){
    const r=harness({upstream}),result=await r.POST(request());
    assert.equal(result.status,502);assert.deepEqual(r.events,['reserve','forward']);
    assert.equal('telegramUrl' in result.body,false);
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE_UPSTREAM_ERROR|synthetic-webhook-secret|Спробуй ще раз/);
    assert.match(result.body.error,/Не повторюй/);
  }
});

