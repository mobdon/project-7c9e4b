'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Engine,A}=require('../extension/core.js');
const {create}=require('../extension/diagnostics.js');
function fixture(){
 const memory=new WebAssembly.Memory({initial:256,maximum:300,shared:true}),e=new Engine(memory),d=new DataView(memory.buffer);
 const p=0xe00000,car=0xe01000,race=0xe04000,record=0xe06000,driver=0xe08000,behavior=0xe0a000,action=0xe0b000,racer=0xe0c000,score=0xe0d000,dc=0xe0e000,style=0xe0f000;
 const put=(a,v)=>d.setUint32(a,v,true),fput=(a,v)=>d.setFloat32(a,v,true);
 put(A.FLOW,6);put(A.MODE,1);put(A.PLAYER,p);put(p+4,car);put(A.RACE,race);put(race,4);put(race+0x24,2);put(race+0xbd4,racer);
 put(0x89e7a0,4301);d.setUint8(0x89e7d9,1);fput(car+A.RPM,6000);put(car+A.GEAR,3);fput(car+0x430,20);fput(car+0x42c,15);
 put(car+0x14,record);put(record+4,1);d.setUint8(record+0x901,9);put(car+0x24,3);put(car+0x28,1);put(car+0x2c,driver);put(driver,0x785370);put(driver+4,car);put(driver+8,behavior);put(driver+0x6fc,action);put(behavior,0x784f40);put(behavior+0x220,car);fput(behavior+0x22c,31.2919);put(action,0x784768);put(action+20,1);
 put(car+0x1c,racer);put(racer,car);put(racer+0x1d4,score);put(racer+0x1d8,dc);put(score,style);put(dc,score);put(dc+4,racer);put(dc+8,car);put(dc+0x1c,3);put(dc+0x20,200);fput(dc+0x34,0.8);fput(dc+0x44,0.4);fput(dc+0x30,130);fput(racer+0x14,125);put(style+0x14,0);fput(style+0x24,250);fput(style+0x2c,1500);
 const sample=()=>e.driftDiagnostics(e.state(),true);
 return {memory,e,d,put,fput,p,car,race,record,driver,behavior,action,racer,score,dc,style,sample};
}
test('read-only drift sample identifies controller, goal and owned scoring graph without pointers',()=>{
 const f=fixture(),before=Buffer.from(f.memory.buffer),s=f.sample();assert.equal(s.nativeDriftBehavior,true);assert.equal(s.aiGoalId,1);assert.equal(s.driftScoreLinked,true);assert.equal(s.driftPendingPoints,250);assert.equal(s.driftBankedPoints,1500);assert.equal(s.driftMultiplier,3);assert.equal(s.speedMps,20);assert.equal(s.trackId,4301);assert.equal(s.currentRawRouteProgress,125);assert.ok(s.driftLatchedSlipRad>0.39);assert.equal(s.nativeSkill,9);assert.ok(s.driftTargetMps>31);assert.deepEqual(Buffer.from(f.memory.buffer),before);for(const key of ['car','race','record','player','driver','behavior','action','racer','score','dc','style'])assert.equal(key in s,false);
});
test('unverified profiles and stale player context produce no sample',()=>{const f=fixture(),s=f.e.state();assert.deepEqual(f.e.driftDiagnostics(s),{});assert.deepEqual(f.e.driftDiagnostics(s,false),{});f.put(f.p+4,0);assert.deepEqual(f.e.driftDiagnostics(s,true),{});});
for(const [name,change] of Object.entries({count0:f=>f.put(f.race+0x24,0),count7:f=>f.put(f.race+0x24,7),notMember:f=>f.put(f.race+0xbd4,0),wrongCar:f=>f.put(f.racer,0),wrongRacer:f=>f.put(f.dc+4,0),wrongDriftCar:f=>f.put(f.dc+8,0),wrongScore:f=>f.put(f.dc,0),nullStyle:f=>f.put(f.score,0),wrongStyle:f=>f.put(f.style+0xc,1),badRacer:f=>f.put(f.car+0x1c,0xfffffff0),badDriftCar:f=>f.put(f.racer+0x1d8,0xfffffff0)}))test('score graph rejection: '+name,()=>{const f=fixture();change(f);const s=f.sample();assert.equal(s.driftScoreLinked,false);assert.equal('driftPendingPoints' in s,false);});
test('mismatched native driver, behavior and goal never falsely confirm drift',()=>{
 const f=fixture();f.put(f.driver+4,0);assert.equal(f.sample().aiDriverVerified,false);f.put(f.driver+4,f.car);f.put(f.behavior+0x220,0);assert.equal('nativeDriftBehavior' in f.sample(),false);f.put(f.behavior+0x220,f.car);f.put(f.behavior,0x784eb0);assert.equal(f.sample().nativeRoadBehavior,true);assert.equal('driftTargetMps' in f.sample(),false);f.put(f.action,0x784830);assert.equal(f.sample().aiGoalRecognized,false);assert.equal('aiGoalId' in f.sample(),false);f.put(f.driver+0x6fc,0);assert.equal(f.sample().aiGoalPending,true);
});
test('invalid floats omitted and out-of-range enum values not logged',()=>{const f=fixture();f.fput(f.style+0x24,NaN);f.fput(f.car+0x430,Infinity);f.fput(f.dc+0x44,99);f.put(f.style+0x14,99);f.put(f.dc+0x1c,99);const s=f.sample();for(const key of ['driftPendingPoints','speedMps','driftLatchedSlipRad','driftScoreState','driftMultiplier'])assert.equal(key in s,false);});
test('diagnostic scalar whitelist drops raw addresses and unknown data',()=>{const f=fixture(),log=create();log.record('state',{...f.sample(),car:f.car,driver:f.driver,secret:'SECRET',driftPendingPoints:Infinity});const value=JSON.parse(log.exportText()).events.at(-1).data;assert.equal(value.nativeDriftBehavior,true);assert.equal(value.driftScoreLinked,true);assert.equal(value.driftBankedPoints,1500);assert.equal(value.trackId,4301);assert.equal('driftPendingPoints' in value,false);assert.doesNotMatch(JSON.stringify(value),/SECRET|driver":|car":/);});
test('memory growth refreshes readonly view and preserves sampling',()=>{const f=fixture();assert.equal(f.sample().driftScoreLinked,true);f.memory.grow(1);assert.equal(f.sample().driftScoreLinked,true);});

test('non-drift races do not sample moving drift telemetry',()=>{const f=fixture();f.d.setUint8(0x89e7d9,0);assert.deepEqual(f.sample(),{});f.put(0x890104,1);assert.equal(f.sample().forcedDrift,true);});
test('moving drift telemetry samples at two seconds while discrete state changes remain prompt',()=>{
 let now=1000;const log=create({clock:()=>now});log.snapshot({driftRace:true,speedMps:20,driftScoreState:0});const n=log.status().events;
 now+=250;log.snapshot({driftRace:true,speedMps:21,driftScoreState:0});assert.equal(log.status().events,n);
 now+=1750;log.snapshot({driftRace:true,speedMps:25,driftScoreState:0});assert.equal(log.status().events,n+1);
 now+=250;log.snapshot({driftRace:true,speedMps:26,driftScoreState:4});assert.equal(log.status().events,n+2);
});
for(const [name,change] of Object.entries({driverClass:f=>f.put(f.car+0x24,1),driverVtable:f=>f.put(f.driver,0),behaviorVtable:f=>f.put(f.behavior,0x784eb0),behaviorBacklink:f=>f.put(f.behavior+0x220,0),actionVtable:f=>f.put(f.action,0),actionId:f=>f.put(f.action+20,11),driftFlag:f=>f.d.setUint8(0x89e7d9,0),forcedFlag:f=>f.put(0x890104,1),variantFlag:f=>f.put(0x890114,1),track:f=>f.put(0x89e7a0,4174),recordType:f=>f.put(f.record+4,2),styleIndex:f=>f.put(f.style+0xc,1),racerMembership:f=>f.put(f.race+0xbd4,0)}))test('changed validated identity rejects sample: '+name,()=>{
 const f=fixture(),u32=f.e.u32.bind(f.e);let changed=false;
 f.e.u32=p=>{const v=u32(p);if(p===f.dc+0x20&&!changed){changed=true;change(f);}return v;};
 assert.deepEqual(f.sample(),{});assert.equal(changed,true);
});
test('variant-only drift is sampled while actual and forced drag take precedence',()=>{const f=fixture();f.d.setUint8(0x89e7d9,0);f.put(0x890114,1);assert.equal(f.sample().driftVariant,true);f.d.setUint8(0x89e7d8,1);assert.deepEqual(f.sample(),{});f.d.setUint8(0x89e7d8,0);f.put(0x890108,1);assert.deepEqual(f.sample(),{});});
for(const [name,change] of Object.entries({dragFlag:f=>f.d.setUint8(0x89e7d8,1),forcedDrag:f=>f.put(0x890108,1)}))test('drag transition rejects drift sample: '+name,()=>{const f=fixture(),u32=f.e.u32.bind(f.e);let changed=false;f.e.u32=p=>{const v=u32(p);if(p===f.dc+0x20&&!changed){changed=true;change(f);}return v;};assert.deepEqual(f.sample(),{});});
