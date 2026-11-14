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
 const sample=()=>e.nativeDiagnostics(e.state(),true);
 return {memory,e,d,put,fput,p,car,race,record,driver,behavior,action,racer,score,dc,style,sample};
}

test('all-mode diagnostics expose actual skill, action and current/requested input modes without writes',()=>{
 const f=fixture();f.d.setUint8(0x89e7d9,0);f.d.setUint8(0x89e7d8,1);f.put(f.behavior,0x784eb0);f.put(f.action,0x7847d0);f.put(f.action+20,2);f.put(f.p+0x22c,3);f.put(f.p+0x230,3);f.put(f.driver+0xc,0xe10000);f.put(f.driver+0x6e0,0xe11000);f.put(f.driver+0x6f8,0xe12000);f.fput(f.behavior+0x20c,0.75);f.fput(f.behavior+0x214,0.25);f.put(f.behavior+0x1e4,4);f.d.setInt16(f.behavior+0x1e0,-100,true);
 const before=Buffer.from(new Uint8Array(f.memory.buffer)),s=f.sample();assert.equal(s.dragRace,true);assert.equal(s.nativeSkill,9);assert.equal(s.aiGoalId,2);assert.equal(s.nativeInputMode,3);assert.equal(s.nativeNextInputMode,3);assert.equal(s.nativeNavigationPresent,true);assert.equal(s.nativeNavigationValid,true);assert.equal(s.nativeConfigValid,true);assert.equal(s.nativeCompanionValid,true);assert.equal(s.nativeThrottle,0.75);assert.equal(s.nativeBrake,0.25);assert.equal(s.nativeSteering,-100);assert.equal(s.nativeGearCommand,4);assert.equal('driftScoreLinked' in s,false);assert.deepEqual(Buffer.from(f.memory.buffer),before);
});
test('manual or foreign driver logs skill but cannot claim a native AI goal',()=>{const f=fixture();f.put(f.car+0x24,2);f.d.setUint8(f.record+0x901,4);const s=f.sample();assert.equal(s.nativeSkill,4);assert.equal(s.aiDriverVerified,false);assert.equal('aiGoalId' in s,false);assert.equal('nativeNavigationPresent' in s,false);});
test('missing and malformed navigation/config are distinguished without dereferencing them',()=>{const f=fixture();let s=f.sample();assert.equal(s.nativeNavigationPresent,false);assert.equal(s.nativeNavigationValid,false);f.put(f.driver+0xc,0xfffffff0);f.put(f.driver+0x6e0,0xfffffff0);s=f.sample();assert.equal(s.nativeNavigationPresent,true);assert.equal(s.nativeNavigationValid,false);assert.equal(s.nativeConfigPresent,true);assert.equal(s.nativeConfigValid,false);});
for(const [name,change] of Object.entries({navigation:f=>f.put(f.driver+0xc,0xe10000),config:f=>f.put(f.driver+0x6e0,0xe11000),companion:f=>f.put(f.driver+0x6f8,0xe12000),inputMode:f=>f.put(f.p+0x22c,3),requestedMode:f=>f.put(f.p+0x230,3)}))test('changed native diagnostic graph is rejected: '+name,()=>{const f=fixture(),read=f.e.u32.bind(f.e);let changed=false;f.e.u32=p=>{const v=read(p);if(p===f.dc+0x20&&!changed){changed=true;change(f);}return v;};assert.deepEqual(f.sample(),{});});
test('only recognized finite controls and input enums are exported',()=>{const f=fixture();f.fput(f.behavior+0x20c,Infinity);f.fput(f.behavior+0x214,-1);f.put(f.p+0x22c,100);f.put(f.p+0x230,0xffffffff);f.put(f.behavior+0x1e4,99);const s=f.sample();for(const k of ['nativeThrottle','nativeBrake','nativeInputMode','nativeNextInputMode','nativeGearCommand'])assert.equal(k in s,false);});
test('native logger keeps input and skill scalars but removes addresses and text',()=>{const f=fixture(),log=create();log.record('state',{...f.sample(),nativeNavigationAddress:1234,password:'SECRET',aiRequestedMode:1,aiNativeStatus:1,aiSkillSaved:true,savedNativeSkill:5});const s=JSON.parse(log.exportText()).events.at(-1).data;assert.equal(s.nativeSkill,9);assert.equal(s.savedNativeSkill,5);assert.equal(s.aiNativeStatus,1);assert.equal(s.aiSkillSaved,true);assert.doesNotMatch(JSON.stringify(s),/SECRET|Address/);});
test('moving native controls sample at two seconds while skill and driver changes remain prompt',()=>{let now=1000;const log=create({clock:()=>now});log.snapshot({nativeTelemetry:true,nativeThrottle:0.2,nativeSkill:9,driverKind:3});const n=log.status().events;now+=250;log.snapshot({nativeTelemetry:true,nativeThrottle:1,nativeSkill:9,driverKind:3});assert.equal(log.status().events,n);now+=1750;log.snapshot({nativeTelemetry:true,nativeThrottle:1,nativeSkill:9,driverKind:3});assert.equal(log.status().events,n+1);now+=250;log.snapshot({nativeTelemetry:true,nativeThrottle:0,nativeSkill:4,driverKind:2});assert.equal(log.status().events,n+2);});

test('export identifies current logger even when startup record was cleared and rejects unsafe version text',()=>{const log=create({version:'0.17.0'});log.clear();assert.equal(JSON.parse(log.exportText()).exporterVersion,'0.17.0');assert.equal('exporterVersion' in JSON.parse(create({version:'SECRET'}).exportText()),false);});
test('actual native pace factor is bounded, read-only and absent for unverified drivers',()=>{
 const f=fixture();f.fput(f.driver+0x770,1.25);const before=Buffer.from(new Uint8Array(f.memory.buffer));assert.equal(f.sample().nativePaceFactor,1.25);assert.deepEqual(Buffer.from(f.memory.buffer),before);
 const log=create();log.record('state',f.sample());assert.equal(JSON.parse(log.exportText()).events.at(-1).data.nativePaceFactor,1.25);
 for(const value of [NaN,Infinity,-1,4.1]){f.fput(f.driver+0x770,value);assert.equal('nativePaceFactor' in f.sample(),false);}
 f.fput(f.driver+0x770,1);f.put(f.driver,0);assert.equal('nativePaceFactor' in f.sample(),false);
});
