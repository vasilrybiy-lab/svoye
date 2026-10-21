'use strict';
// Actual route/driver/policy sources, isolated synthetic I/O only.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const NOW=Date.parse('2026-10-21T15:00:00.000Z'),id='22222222-2222-4222-8222-222222222222',expiry=new Date(NOW+600000).toISOString();
const helper=require('../lib/website-handoff-canary.ts'),policy=require('../lib/website-admission-policy.cjs');
const config=()=>({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:helper.CANARY_BRANCH,VERCEL_URL:'svoye-mobile-v2-synthetic-vasilrybiy-1703.vercel.app',
 SVOYE_HANDOFF_BOT_READY:'true',SVOYE_HANDOFF_ADMISSION_ENABLED:'true',SVOYE_HANDOFF_DIRECT_NEON_ENABLED:'true',
 SVOYE_HANDOFF_ADMISSION_DATABASE_URL:'postgresql://svoe_website_test_runtime:synthetic-only@ep-synthetic.eu-central-1.aws.neon.tech/neondb?sslmode=require',
 SVOYE_HANDOFF_WEBHOOK_URL:'https://svoyechat.app.n8n.cloud/webhook/svoe-website-context-v1',SVOYE_HANDOFF_WEBHOOK_SECRET:'synthetic-header-only',
 SVOYE_HANDOFF_EXPIRY_WEBHOOK_URL:'https://svoyechat.app.n8n.cloud/webhook/svoe-website-expiry-v2'});
const receipt=()=>({rows:[{connected_role:'svoe_website_test_runtime',database:'neondb',project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',
 receipt:{stored:true,transfer_version:2,website_request_id:id,expires_at:expiry,admission:{allowed:true,policy_version:'website_admission_v2_carryover',test_environment_verified:true,
 project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',cycle_limit:30,daily_base:3,used_cycle:19,used_today:1,unlocked_cycle:21,available_after:2,
 day_key:'2026-10-21',cycle_start:'2026-10-14T21:00:00.000Z',cycle_end:'2026-11-14T22:00:00.000Z'}}}]});
function harness({env=config(),db,queue}={}){
 const calls=[],http=[];class Clock extends Date{static now(){return NOW;}}
 const neon=(url,options)=>({query:async(sql,values)=>{assert.equal(url,env.SVOYE_HANDOFF_ADMISSION_DATABASE_URL);assert.equal(options.fetchOptions.redirect,'error');
  assert.match(sql,/svoe_test_website_store\(\$1::jsonb\)/);const payload=JSON.parse(values[0]);calls.push(payload);return db?db(payload):payload.op==='abort'?{rows:[{receipt:{aborted:true}}]}:receipt();}});
 function load(file,dependencies){let code=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'..',file),'utf8'))
  .replace(/^import \{([^}]+)\} from "([^"]+)";$/gm,(_,names,name)=>`const {${names}}=require(${JSON.stringify(name)});`).replace(/^export /gm,'');
  const exports=file.includes('website-direct')?['isDirectNeonConfigured','prepareDirectWebsite']:file.includes('website-admission.ts')?['isAdmissionConfigured','reserveWebsiteAdmission']:['GET','POST'];
  code+='\nmodule.exports={'+exports.join(',')+'};';const m={exports:{}};
  new Function('require','module','exports','process','fetch','Date','AbortSignal','Buffer',code)(name=>dependencies[name]??require(name),m,m.exports,{env},async(url,options)=>{
   http.push({url,options});return queue?queue(url,options):new Response(JSON.stringify({queued:true,website_request_id:id,expires_at:expiry}),{headers:{'content-type':'application/json'}});
  },Clock,AbortSignal,Buffer);return m.exports;
 }
 const admission=load('lib/website-admission.ts',{'@neondatabase/serverless':{neon},'./website-admission-policy.cjs':policy});
 const direct=load('lib/website-direct-neon.ts',{'@neondatabase/serverless':{neon},'./website-admission':admission,'./website-admission-policy.cjs':policy});
 const route=load('app/api/website-handoff/route.ts',{'next/server':{NextResponse:{json:(body,o={})=>({body,status:o.status??200,headers:o.headers})}},
 '@/lib/telegram-links':{svoyeTelegramBotUsername:'svoe_live_bot'},'@/lib/website-admission':admission,'@/lib/website-direct-neon':direct,'@/lib/website-handoff-canary':helper,
 '@/lib/website-handoff-pilot':require('../lib/website-handoff-pilot.ts')});
 return {...route,...direct,calls,http,env};
}
function request(messageText='Вигаданий підсумок',changes={}){const url=new URL(changes.url||'https://svoe.live/api/website-handoff');return {nextUrl:url,
 headers:new Map([['origin',changes.origin||url.origin],['content-type','application/json']]),text:async()=>JSON.stringify({consent:true,contextVersion:1,messageText,...changes.body})};}
test('disabled or wrong server role, branch, TLS or cleanup destination makes no DB/network call',async()=>{
 for(const change of [{SVOYE_HANDOFF_DIRECT_NEON_ENABLED:'true',SVOYE_HANDOFF_ADMISSION_ENABLED:'false'},{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},
 {SVOYE_HANDOFF_ADMISSION_DATABASE_URL:config().SVOYE_HANDOFF_ADMISSION_DATABASE_URL.replace('svoe_website_test_runtime','neondb_owner')},
 {SVOYE_HANDOFF_EXPIRY_WEBHOOK_URL:'https://evil.example/webhook/svoe-website-expiry-v2'},
 {SVOYE_HANDOFF_EXPIRY_WEBHOOK_URL:config().SVOYE_HANDOFF_EXPIRY_WEBHOOK_URL+'?secret=unsafe'}]){
  const h=harness({env:{...config(),...change}});assert.equal((await h.GET()).body.enabled,false);assert.equal((await h.POST(request())).status,503);assert.equal(h.calls.length,0);assert.equal(h.http.length,0);
 }
});
test('origin/consent/bounds validation precedes direct SQL and full 4000 chars are not truncated',async()=>{
 const h=harness();for(const r of [request('x',{origin:'https://wrong.example'}),request('x',{body:{consent:false}}),request('я'.repeat(4001))]) assert.ok((await h.POST(r)).status>=400);
 assert.equal(h.calls.length,0);const result=await h.POST(request('я'.repeat(4000)));assert.equal(result.status,200);assert.equal(h.calls[0].message_text.length,4000);
});
test('one atomic admission+store SQL, metadata-only queue, exact ack before opaque link; no legacy storage POST',async()=>{
 const h=harness(),result=await h.POST(request('Вигадані нотатки'));assert.equal(result.status,200);assert.equal(h.calls.length,1);assert.equal(h.http.length,1);
 const token=new URL(result.body.telegramUrl).searchParams.get('start').slice(3);assert.equal(token.length,43);
 assert.equal(h.calls[0].token_hash,require('node:crypto').createHash('sha256').update(token).digest('hex'));
 const payload=JSON.parse(h.http[0].options.body);assert.deepEqual(Object.keys(payload).sort(),['expires_at','source','website_request_id']);
 assert.equal(payload.website_request_id,id);assert.ok(!JSON.stringify(payload).includes('нотатки'));assert.ok(!JSON.stringify(h.calls).includes(token));
 assert.equal(h.http[0].options.redirect,'error');assert.match(h.http[0].url,/svoe-website-expiry-v2$/);assert.equal(result.headers['Cache-Control'],'no-store');
 assert.ok(!JSON.stringify(result.body).includes('synthetic-header'));assert.equal(result.body.expiresInSeconds,600);
});
test('database denial or wrong binding gives no link or expiry dispatch',async()=>{
 for(const reason of ['daily_limit','cycle_limit','disabled']){const h=harness({db:()=>({rows:[{...receipt().rows[0],receipt:{stored:false,reason}}]})});
  const r=await h.POST(request());assert.equal(r.status,reason==='disabled'?503:429);assert.equal(h.http.length,0);assert.equal(r.body.telegramUrl,undefined);}
 const h=harness({db:()=>({rows:[{...receipt().rows[0],connected_role:'neondb_owner'}]})});assert.equal((await h.POST(request())).status,502);assert.equal(h.http.length,0);
});
test('queue failure, malformed/oversize/foreign ack abort only the exact own hash and never retry/refund',async()=>{
 for(const queue of [async()=>{throw Error('sensitive provider error');},async()=>new Response('{}',{status:500}),
 async()=>new Response(JSON.stringify({queued:true,website_request_id:'foreign',expires_at:expiry}),{headers:{'content-type':'application/json'}}),
 async()=>new Response('x'.repeat(2049),{headers:{'content-type':'application/json'}})]){
  const h=harness({queue}),r=await h.POST(request());assert.equal(r.status,502);assert.equal(h.http.length,1);assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].op,'abort');assert.equal(h.calls[1].website_request_id,id);assert.equal(h.calls[1].token_hash,h.calls[0].token_hash);
  assert.equal(r.body.telegramUrl,undefined);assert.ok(!JSON.stringify(r).includes('sensitive'));
 }
});
test('canary accepts only fixed fictional summary and normal public readiness stays off',async()=>{
 const env=config();env.SVOYE_HANDOFF_BOT_READY='false';env.SVOYE_HANDOFF_CANARY_UNTIL=new Date(Date.now()+240000).toISOString();
 const h=harness({env}),url='https://'+env.VERCEL_URL+'/api/website-handoff?canary='+helper.CANARY_QUERY_VALUE;
 assert.equal((await h.GET()).body.enabled,false);assert.equal((await h.POST(request('changed',{url}))).status,400);assert.equal(h.calls.length,0);
 assert.equal((await h.POST(request(helper.CANARY_SUMMARY,{url}))).status,200);assert.equal(h.calls[0].mode,'synthetic');
});
