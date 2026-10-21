'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkReceipt}=require('../lib/website-admission-policy.cjs');
const NOW=Date.parse('2026-10-21T17:00:00.000Z');
function row(receipt={}) {return {rows:[{connected_role:'svoe_website_test_runtime',database:'neondb',project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',receipt:{allowed:true,policy_version:'website_admission_v2_carryover',test_environment_verified:true,project_id:'morning-cake-04594300',branch_id:'br-delicate-heart-b7h6nwzw',cycle_limit:30,daily_base:3,used_cycle:20,used_today:2,unlocked_cycle:21,available_after:1,day_key:'2026-10-21',cycle_start:'2026-10-14T21:00:00.000Z',cycle_end:'2026-11-14T22:00:00.000Z',...receipt}}]};}
const allowance={until:'2026-10-25T09:00:00.000Z',cycle_floor:22};
test('ordinary carryover stays valid, and unannounced extra credit fails closed',()=>{
 assert.equal(checkReceipt(row(),NOW).allowed,true);
 assert.equal(checkReceipt(row({used_cycle:22,used_today:4,unlocked_cycle:22,available_after:0}),NOW).allowed,false);
});
test('only fixed bounded TEST-cycle allowance permits the third pending reservation',()=>{
 for(const used of [20,21,22]) assert.equal(checkReceipt(row({used_cycle:used,used_today:used-18,unlocked_cycle:22,available_after:22-used,test_allowance:allowance}),NOW).allowed,true);
 for(const bad of [{...allowance,cycle_floor:23},{...allowance,until:'2027-10-25T09:00:00.000Z'},true,[]]) assert.equal(checkReceipt(row({used_cycle:22,used_today:4,unlocked_cycle:22,available_after:0,test_allowance:bad}),NOW).allowed,false);
 assert.equal(checkReceipt(row({used_cycle:23,used_today:5,unlocked_cycle:23,available_after:0,test_allowance:allowance}),NOW).allowed,false);
 assert.equal(checkReceipt(row({test_allowance:allowance,daily_base:4}),NOW).allowed,false);
});
test('expired or foreign-cycle allowance rejected; normal policy remains valid after expiry',()=>{
 const after=Date.parse('2026-10-25T09:00:00.000Z');
 const standard={day_key:'2026-10-25',used_today:1,used_cycle:23,unlocked_cycle:30,available_after:7};
 assert.equal(checkReceipt(row(standard),after).allowed,true);
 assert.equal(checkReceipt(row({...standard,test_allowance:allowance}),after).allowed,false);
 assert.equal(checkReceipt(row({test_allowance:allowance,cycle_start:'2026-09-14T21:00:00.000Z',cycle_end:'2026-10-14T21:00:00.000Z'}),NOW).allowed,false);
 const foreign=row({test_allowance:allowance});foreign.rows[0].connected_role='neondb_owner';assert.equal(checkReceipt(foreign,NOW).allowed,false);
});
